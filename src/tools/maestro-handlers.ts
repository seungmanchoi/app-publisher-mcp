import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { maestroService } from '../services/maestro.js';
import { storeScreenshotService } from '../services/store-screenshot.js';
import type { IMaestroFlowStep } from '../services/maestro.js';

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'app-publisher-assets', 'maestro');

function readScreenshotAsBase64(filePath: string): { data: string; mimeType: string } | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return {
      data: buffer.toString('base64'),
      mimeType: filePath.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
    };
  } catch {
    return null;
  }
}

function ensureMaestro(): string | null {
  const error = maestroService.ensureInstalled();
  return error;
}

export async function handleSetupMaestro(): Promise<CallToolResult> {
  const result = maestroService.install();

  let status = `=== Maestro Setup ===\n\n`;
  status += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
  status += `Message: ${result.message}\n`;
  if (result.version) status += `Version: ${result.version}\n`;
  if (result.javaVersion) status += `Java: ${result.javaVersion}\n`;

  if (result.success) {
    const devices = maestroService.getBootedDevices();
    status += `\nRunning iOS Simulators: ${devices.ios.length}\n`;
    for (const d of devices.ios) status += `  - ${d}\n`;
    status += `Running Android Emulators: ${devices.android.length}\n`;
    for (const d of devices.android) status += `  - ${d}\n`;

    if (devices.ios.length === 0 && devices.android.length === 0) {
      status += `\nNo running devices. Start one:\n`;
      status += `  iOS: open -a Simulator\n`;
      status += `  Android: emulator -avd <name>\n`;
    }
  }

  return { content: [{ type: 'text', text: status }] };
}

export async function handleMaestroScreenshot(args: {
  outputDir?: string;
  filename?: string;
}): Promise<CallToolResult> {
  const installError = ensureMaestro();
  if (installError) {
    return {
      content: [{ type: 'text', text: `Error: Maestro not available.\n${installError}\n\nRun 'setup_maestro' tool to install.` }],
    };
  }

  const devices = maestroService.getBootedDevices();
  if (devices.ios.length === 0 && devices.android.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No running simulator or emulator found.\nStart an iOS Simulator or Android Emulator first.',
        },
      ],
    };
  }

  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;

  try {
    const screenshotPath = maestroService.takeScreenshot(outputDir, args.filename);

    const content: CallToolResult['content'] = [
      { type: 'text', text: `Screenshot saved: ${screenshotPath}` },
    ];

    const imageData = readScreenshotAsBase64(screenshotPath);
    if (imageData) {
      content.push({
        type: 'image',
        data: imageData.data,
        mimeType: imageData.mimeType,
      });
    }

    return { content };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      content: [{ type: 'text', text: `Error: ${err.message ?? 'Screenshot failed'}` }],
    };
  }
}

export async function handleMaestroRunFlow(args: {
  appId: string;
  steps: IMaestroFlowStep[];
  outputDir?: string;
}): Promise<CallToolResult> {
  const installError = ensureMaestro();
  if (installError) {
    return {
      content: [{ type: 'text', text: `Error: Maestro not available.\n${installError}\n\nRun 'setup_maestro' tool to install.` }],
    };
  }

  const devices = maestroService.getBootedDevices();
  if (devices.ios.length === 0 && devices.android.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No running simulator or emulator found.\nStart an iOS Simulator or Android Emulator first.',
        },
      ],
    };
  }

  const outputDir = args.outputDir ?? path.join(DEFAULT_OUTPUT_DIR, `flow_${Date.now()}`);
  const yamlContent = maestroService.generateFlowYaml(args.appId, args.steps);
  const result = maestroService.runFlow(yamlContent, outputDir);

  const content: CallToolResult['content'] = [];

  let summary = `=== Maestro Flow Result ===\n\n`;
  summary += `Status: ${result.success ? 'PASSED' : 'FAILED'}\n`;
  summary += `App ID: ${args.appId}\n`;
  summary += `Steps: ${args.steps.length}\n`;
  summary += `Screenshots: ${result.screenshots.length}\n`;
  summary += `Output Directory: ${outputDir}\n\n`;

  summary += `--- Generated Flow YAML ---\n${yamlContent}\n`;

  if (!result.success) {
    summary += `--- Error Output ---\n${result.output}\n`;
  }

  if (result.screenshots.length > 0) {
    summary += `\n--- Screenshots ---\n`;
    for (const ss of result.screenshots) {
      summary += `  - ${ss}\n`;
    }
  }

  content.push({ type: 'text', text: summary });

  for (const screenshotPath of result.screenshots) {
    const imageData = readScreenshotAsBase64(screenshotPath);
    if (imageData) {
      content.push({
        type: 'image',
        data: imageData.data,
        mimeType: imageData.mimeType,
      });
    }
  }

  return { content };
}

export async function handleMaestroRunYaml(args: {
  yaml: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const installError = ensureMaestro();
  if (installError) {
    return {
      content: [{ type: 'text', text: `Error: Maestro not available.\n${installError}\n\nRun 'setup_maestro' tool to install.` }],
    };
  }

  const devices = maestroService.getBootedDevices();
  if (devices.ios.length === 0 && devices.android.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No running simulator or emulator found.\nStart an iOS Simulator or Android Emulator first.',
        },
      ],
    };
  }

  const outputDir = args.outputDir ?? path.join(DEFAULT_OUTPUT_DIR, `flow_${Date.now()}`);
  const result = maestroService.runFlow(args.yaml, outputDir);

  const content: CallToolResult['content'] = [];

  let summary = `=== Maestro Flow Result ===\n\n`;
  summary += `Status: ${result.success ? 'PASSED' : 'FAILED'}\n`;
  summary += `Screenshots: ${result.screenshots.length}\n`;
  summary += `Output Directory: ${outputDir}\n\n`;

  if (!result.success) {
    summary += `--- Error Output ---\n${result.output}\n`;
  }

  if (result.screenshots.length > 0) {
    summary += `--- Screenshots ---\n`;
    for (const ss of result.screenshots) {
      summary += `  - ${ss}\n`;
    }
  }

  content.push({ type: 'text', text: summary });

  for (const screenshotPath of result.screenshots) {
    const imageData = readScreenshotAsBase64(screenshotPath);
    if (imageData) {
      content.push({
        type: 'image',
        data: imageData.data,
        mimeType: imageData.mimeType,
      });
    }
  }

  return { content };
}

export async function handleMaestroStatus(): Promise<CallToolResult> {
  const installed = maestroService.checkInstalled();
  const version = installed ? maestroService.getVersion() : 'Not installed';
  const java = maestroService.checkJava();
  const devices = maestroService.getBootedDevices();

  let status = `=== Maestro Status ===\n\n`;
  status += `Installed: ${installed ? 'Yes' : 'No'}\n`;
  status += `Version: ${version}\n`;
  status += `Java: ${java.version} (${java.installed ? 'OK (17+)' : 'NEEDS UPGRADE to 17+'})\n\n`;

  status += `Running iOS Simulators: ${devices.ios.length}\n`;
  for (const device of devices.ios) {
    status += `  - ${device}\n`;
  }

  status += `\nRunning Android Emulators: ${devices.android.length}\n`;
  for (const device of devices.android) {
    status += `  - ${device}\n`;
  }

  if (!installed) {
    status += `\nMaestro not installed. Use 'setup_maestro' tool to install automatically.\n`;
    status += `Or manually: curl -Ls "https://get.maestro.mobile.dev" | bash\n`;
  }

  if (!java.installed) {
    status += `\nJava 17+ required. Install: brew install openjdk@17\n`;
  }

  if (devices.ios.length === 0 && devices.android.length === 0) {
    status += `\nNo running devices found. Start a simulator/emulator first:\n`;
    status += `  iOS: open -a Simulator\n`;
    status += `  Android: emulator -avd <name>\n`;
  }

  status += `\nOutput Directory: ${DEFAULT_OUTPUT_DIR}\n`;

  return { content: [{ type: 'text', text: status }] };
}

export async function handleMaestroStoreScreenshot(args: {
  screenshotPath?: string;
  headline: string;
  platform?: 'ios' | 'android' | 'both';
  backgroundColor?: string;
  textColor?: string;
  devices?: string[];
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  let screenshotPath = args.screenshotPath;

  if (!screenshotPath) {
    const installError = ensureMaestro();
    if (installError) {
      return {
        content: [{ type: 'text', text: `Error: No screenshotPath provided and Maestro not available.\n${installError}\n\nProvide a screenshotPath or run 'setup_maestro' to install Maestro.` }],
      };
    }

    const devices = maestroService.getBootedDevices();
    if (devices.ios.length === 0 && devices.android.length === 0) {
      return {
        content: [{ type: 'text', text: 'Error: No screenshotPath provided and no running simulator/emulator.\nEither provide screenshotPath or start a simulator/emulator.' }],
      };
    }

    try {
      screenshotPath = maestroService.takeScreenshot(DEFAULT_OUTPUT_DIR);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        content: [{ type: 'text', text: `Error taking screenshot: ${err.message ?? 'Screenshot failed'}.\nProvide screenshotPath manually instead.` }],
      };
    }
  }

  if (!fs.existsSync(screenshotPath)) {
    return {
      content: [{ type: 'text', text: `Error: Screenshot file not found: ${screenshotPath}` }],
    };
  }

  const platform = args.platform ?? 'both';
  const outputDir = args.outputDir ?? path.join(DEFAULT_OUTPUT_DIR, `store_${Date.now()}`);

  try {
    const { results, geminiImagePath } = await storeScreenshotService.createStoreScreenshot({
      screenshotPath,
      headline: args.headline,
      platform,
      backgroundColor: args.backgroundColor,
      textColor: args.textColor,
      outputDir,
      model: args.model,
      devices: args.devices,
    });

    const content: CallToolResult['content'] = [];

    let summary = `=== Store Screenshot Generation ===\n\n`;
    summary += `Headline: "${args.headline}"\n`;
    summary += `Platform: ${platform}\n`;
    summary += `Source: ${screenshotPath}\n`;
    summary += `Generated: ${results.length} store screenshots\n`;
    summary += `Output: ${outputDir}\n\n`;

    summary += `--- Generated Files ---\n`;
    for (const r of results) {
      summary += `  [${r.platform}] ${r.device}: ${r.width}x${r.height} → ${r.path}\n`;
    }

    content.push({ type: 'text', text: summary });

    const geminiImage = readScreenshotAsBase64(geminiImagePath);
    if (geminiImage) {
      content.push({ type: 'text', text: '\n--- Gemini Generated Base Image ---' });
      content.push({
        type: 'image',
        data: geminiImage.data,
        mimeType: geminiImage.mimeType,
      });
    }

    const availableSizes = storeScreenshotService.getSizes(platform);
    content.push({
      type: 'text',
      text: `\n--- Available Sizes (${platform}) ---\n` +
        availableSizes.map((s) => `  ${s.device} (${s.name}): ${s.width}x${s.height} ${s.required ? '[required]' : '[optional]'}`).join('\n'),
    });

    return { content };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      content: [{ type: 'text', text: `Error: ${err.message ?? 'Store screenshot generation failed'}` }],
    };
  }
}
