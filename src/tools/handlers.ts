import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { settingsManager } from '../config/index.js';
import { geminiService, iconResizerService, fastlaneService } from '../services/index.js';

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'app-publisher-assets');

export async function handleConfigureApiKey(args: { apiKey: string }): Promise<CallToolResult> {
  settingsManager.setApiKey(args.apiKey);
  const maskedKey = args.apiKey.substring(0, 8) + '...' + args.apiKey.substring(args.apiKey.length - 4);
  return {
    content: [{ type: 'text', text: `API key configured: ${maskedKey}` }],
  };
}

export async function handleConfigureModel(args: { model: string }): Promise<CallToolResult> {
  settingsManager.setModel(args.model);
  return {
    content: [{ type: 'text', text: `Model set to: ${args.model}` }],
  };
}

export async function handleGenerateIcon(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateIcon(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleResizeIcons(args: {
  sourcePath: string;
  outputDir: string;
  platforms?: ('ios' | 'android')[];
}): Promise<CallToolResult> {
  const platforms = args.platforms ?? ['ios', 'android'];
  const results = await iconResizerService.resizeForAllPlatforms(
    args.sourcePath,
    args.outputDir,
    platforms,
  );

  const iosCount = results.filter((r) => r.platform === 'ios').length;
  const androidCount = results.filter((r) => r.platform === 'android').length;

  let summary = `=== Icon Resize Complete ===\n\n`;
  summary += `Total: ${results.length} icons generated\n`;

  if (iosCount > 0) {
    summary += `\niOS (${iosCount} icons):\n`;
    summary += `  Output: ${path.join(args.outputDir, 'ios', 'AppIcon.appiconset')}\n`;
    summary += `  Contents.json: Generated (Xcode-compatible)\n`;
    summary += `  Sizes: 20px ~ 1024px\n`;
  }

  if (androidCount > 0) {
    summary += `\nAndroid (${androidCount} icons):\n`;
    summary += `  Output: ${path.join(args.outputDir, 'android')}\n`;
    summary += `  Densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi\n`;
    summary += `  Play Store: 512x512\n`;
  }

  summary += `\nAll Icons:\n`;
  for (const r of results) {
    summary += `  [${r.platform}] ${r.name} (${r.size}x${r.size}) → ${r.path}\n`;
  }

  return { content: [{ type: 'text', text: summary }] };
}

export async function handleGenerateSplash(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateSplash(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleGenerateScreenshot(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateScreenshot(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleSetupFastlane(args: {
  projectDir: string;
  appIdentifier: string;
  appName: string;
  teamId?: string;
  itunesConnectTeamId?: string;
  jsonKeyFile?: string;
  packageName?: string;
}): Promise<CallToolResult> {
  const createdFiles = fastlaneService.setupFastlane({
    projectDir: args.projectDir,
    appIdentifier: args.appIdentifier,
    appName: args.appName,
    teamId: args.teamId,
    itunesConnectTeamId: args.itunesConnectTeamId,
    jsonKeyFile: args.jsonKeyFile,
    packageName: args.packageName,
  });

  let summary = `=== Fastlane Setup Complete ===\n\n`;
  summary += `Project: ${args.projectDir}\n`;
  summary += `App: ${args.appName} (${args.appIdentifier})\n\n`;
  summary += `Created files:\n`;
  for (const file of createdFiles) {
    summary += `  - ${file}\n`;
  }
  summary += `\nNext steps:\n`;
  summary += `  1. Fill in metadata files in fastlane/metadata/\n`;
  summary += `  2. Run 'fastlane ios release' to publish to App Store\n`;
  summary += `  3. Run 'fastlane android release' to publish to Google Play\n`;

  if (!fastlaneService.checkInstalled()) {
    summary += `\n⚠️  fastlane is not installed. Install with: brew install fastlane\n`;
  }

  return { content: [{ type: 'text', text: summary }] };
}

export async function handlePublishIOS(args: {
  projectDir: string;
  ipaPath?: string;
  submitForReview?: boolean;
}): Promise<CallToolResult> {
  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) {
    return {
      content: [{
        type: 'text',
        text: 'Error: fastlane directory not found. Run setup_fastlane first.',
      }],
    };
  }

  const result = fastlaneService.publishIOS(args.projectDir, {
    ipaPath: args.ipaPath,
    submitForReview: args.submitForReview,
  });

  return { content: [{ type: 'text', text: result }] };
}

export async function handlePublishAndroid(args: {
  projectDir: string;
  aabPath?: string;
  track?: string;
}): Promise<CallToolResult> {
  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) {
    return {
      content: [{
        type: 'text',
        text: 'Error: fastlane directory not found. Run setup_fastlane first.',
      }],
    };
  }

  const result = fastlaneService.publishAndroid(args.projectDir, {
    aabPath: args.aabPath,
    track: args.track,
  });

  return { content: [{ type: 'text', text: result }] };
}

export async function handleGetStatus(): Promise<CallToolResult> {
  const isConfigured = settingsManager.isConfigured();
  const configSource = settingsManager.getConfigSource();
  const apiKey = settingsManager.getApiKey();
  const model = settingsManager.getModel();
  const fastlaneInstalled = fastlaneService.checkInstalled();

  const maskedKey = isConfigured
    ? apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
    : 'Not configured';

  let status = `=== App Publisher MCP Status ===\n\n`;
  status += `Gemini API Key: ${maskedKey} (source: ${configSource})\n`;
  status += `Gemini Model: ${model}\n`;
  status += `Fastlane: ${fastlaneInstalled ? 'Installed' : 'Not installed'}\n`;
  status += `Output Directory: ${DEFAULT_OUTPUT_DIR}\n`;

  if (fs.existsSync(DEFAULT_OUTPUT_DIR)) {
    const files = fs.readdirSync(DEFAULT_OUTPUT_DIR);
    status += `Generated Assets: ${files.length} files\n`;
  } else {
    status += `Generated Assets: None\n`;
  }

  return { content: [{ type: 'text', text: status }] };
}
