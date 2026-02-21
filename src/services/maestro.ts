import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface IMaestroFlowStep {
  action: string;
  value?: string;
  direction?: string;
  timeout?: number;
}

export interface IMaestroRunResult {
  success: boolean;
  output: string;
  screenshots: string[];
}

export interface IBootedDevices {
  ios: string[];
  android: string[];
}

export interface IMaestroInstallResult {
  success: boolean;
  message: string;
  version?: string;
  javaVersion?: string;
}

export class MaestroService {
  private getMaestroBin(): string {
    const homeBin = path.join(os.homedir(), '.maestro', 'bin', 'maestro');
    if (fs.existsSync(homeBin)) return homeBin;
    return 'maestro';
  }

  checkInstalled(): boolean {
    try {
      execSync(`"${this.getMaestroBin()}" --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getVersion(): string {
    try {
      return execSync(`"${this.getMaestroBin()}" --version`, { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  checkJava(): { installed: boolean; version: string } {
    try {
      const output = execSync('java -version 2>&1', {
        encoding: 'utf-8',
        env: {
          ...process.env,
          JAVA_HOME: process.env.JAVA_HOME ?? '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
          PATH: `/usr/local/opt/openjdk@17/bin:${process.env.PATH ?? ''}`,
        },
      });
      const match = output.match(/version\s+"?(\d+[\d._]*)"?/);
      const version = match?.[1] ?? 'unknown';
      const majorStr = version.split('.')[0];
      const major = parseInt(majorStr, 10);
      return { installed: major >= 17, version };
    } catch {
      return { installed: false, version: 'not found' };
    }
  }

  install(): IMaestroInstallResult {
    // Check Java first
    const java = this.checkJava();
    if (!java.installed) {
      return {
        success: false,
        message: `Java 17+ is required but found: ${java.version}.\nInstall with: brew install openjdk@17\nThen set JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"`,
        javaVersion: java.version,
      };
    }

    // Already installed?
    if (this.checkInstalled()) {
      const version = this.getVersion();
      return {
        success: true,
        message: `Maestro is already installed: ${version}`,
        version,
        javaVersion: java.version,
      };
    }

    // Install Maestro CLI
    try {
      execSync('curl -Ls "https://get.maestro.mobile.dev" | bash', {
        encoding: 'utf-8',
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          JAVA_HOME: process.env.JAVA_HOME ?? '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
          PATH: `${os.homedir()}/.maestro/bin:/usr/local/opt/openjdk@17/bin:${process.env.PATH ?? ''}`,
        },
      });

      // Verify installation
      if (this.checkInstalled()) {
        const version = this.getVersion();
        return {
          success: true,
          message: `Maestro installed successfully: ${version}`,
          version,
          javaVersion: java.version,
        };
      }

      return {
        success: false,
        message: 'Maestro installer ran but maestro command is not available. Check PATH includes ~/.maestro/bin',
        javaVersion: java.version,
      };
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      return {
        success: false,
        message: `Installation failed: ${err.stderr ?? err.message ?? 'Unknown error'}`,
        javaVersion: java.version,
      };
    }
  }

  ensureInstalled(): string | null {
    if (this.checkInstalled()) return null;
    const result = this.install();
    if (!result.success) return result.message;
    return null;
  }

  getBootedDevices(): IBootedDevices {
    const result: IBootedDevices = { ios: [], android: [] };

    try {
      const output = execSync('xcrun simctl list devices booted -j', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const data = JSON.parse(output) as {
        devices: Record<string, Array<{ name: string; udid: string; state: string }>>;
      };
      for (const runtime of Object.values(data.devices)) {
        for (const device of runtime) {
          if (device.state === 'Booted') {
            result.ios.push(`${device.name} (${device.udid})`);
          }
        }
      }
    } catch {
      /* no iOS simulators */
    }

    try {
      const output = execSync('adb devices', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split('\t');
        if (parts.length >= 2 && parts[1] === 'device') {
          result.android.push(parts[0]);
        }
      }
    } catch {
      /* no Android emulators */
    }

    return result;
  }

  takeScreenshot(outputDir: string, filename?: string): string {
    const name = filename ?? `screenshot_${Date.now()}`;
    const outputPath = path.join(outputDir, `${name}.png`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      execSync(`"${this.getMaestroBin()}" screenshot "${outputPath}"`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      return outputPath;
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      throw new Error(`Screenshot failed: ${err.stderr ?? err.message ?? 'Unknown error'}`);
    }
  }

  generateFlowYaml(appId: string, steps: IMaestroFlowStep[]): string {
    let yaml = `appId: ${appId}\n---\n`;

    for (const step of steps) {
      yaml += this.stepToYaml(step);
    }

    return yaml;
  }

  runFlow(yamlContent: string, outputDir: string): IMaestroRunResult {
    const tempDir = path.join(os.tmpdir(), 'maestro-flows');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const flowFile = path.join(tempDir, `flow_${Date.now()}.yaml`);
    fs.writeFileSync(flowFile, yamlContent);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const output = execSync(
        `"${this.getMaestroBin()}" test "${flowFile}" --output "${outputDir}"`,
        {
          encoding: 'utf-8',
          timeout: 180000,
          env: { ...process.env, MAESTRO_DRIVER_STARTUP_TIMEOUT: '60000' },
        },
      );

      const screenshots = this.collectScreenshots(outputDir);
      this.cleanupTempFile(flowFile);

      return { success: true, output, screenshots };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      const screenshots = this.collectScreenshots(outputDir);
      this.cleanupTempFile(flowFile);

      return {
        success: false,
        output: err.stdout ?? err.stderr ?? err.message ?? 'Unknown error',
        screenshots,
      };
    }
  }

  private stepToYaml(step: IMaestroFlowStep): string {
    switch (step.action) {
      case 'launchApp':
        return step.value ? `- launchApp:\n    appId: "${step.value}"\n` : '- launchApp\n';

      case 'stopApp':
        return step.value ? `- stopApp:\n    appId: "${step.value}"\n` : '- stopApp\n';

      case 'clearState':
        return step.value ? `- clearState:\n    appId: "${step.value}"\n` : '- clearState\n';

      case 'tapOn':
        return `- tapOn: "${step.value}"\n`;

      case 'tapOnPoint':
        return `- tapOn:\n    point: "${step.value}"\n`;

      case 'longPressOn':
        return `- longPressOn: "${step.value}"\n`;

      case 'doubleTapOn':
        return `- doubleTapOn: "${step.value}"\n`;

      case 'inputText':
        return `- inputText: "${step.value}"\n`;

      case 'eraseText':
        return `- eraseText: ${step.value ?? '50'}\n`;

      case 'swipe':
        return `- swipe:\n    direction: "${step.direction ?? 'UP'}"\n`;

      case 'scroll':
        return '- scroll\n';

      case 'scrollUntilVisible':
        return `- scrollUntilVisible:\n    element: "${step.value}"\n`;

      case 'back':
        return '- pressKey: back\n';

      case 'home':
        return '- pressKey: home\n';

      case 'pressKey':
        return `- pressKey: ${step.value}\n`;

      case 'hideKeyboard':
        return '- hideKeyboard\n';

      case 'takeScreenshot':
        return `- takeScreenshot: "${step.value ?? `screenshot_${Date.now()}`}"\n`;

      case 'assertVisible':
        return step.timeout
          ? `- assertVisible:\n    text: "${step.value}"\n    timeout: ${step.timeout}\n`
          : `- assertVisible: "${step.value}"\n`;

      case 'assertNotVisible':
        return `- assertNotVisible: "${step.value}"\n`;

      case 'waitForAnimationToEnd':
        return step.timeout
          ? `- waitForAnimationToEnd:\n    timeout: ${step.timeout}\n`
          : '- waitForAnimationToEnd\n';

      case 'wait':
        return step.timeout
          ? `- waitForAnimationToEnd:\n    timeout: ${step.timeout}\n`
          : '- waitForAnimationToEnd\n';

      case 'openLink':
        return `- openLink: "${step.value}"\n`;

      case 'copyTextFrom':
        return `- copyTextFrom: "${step.value}"\n`;

      case 'pasteText':
        return '- pasteText\n';

      case 'runScript':
        return `- runScript: "${step.value}"\n`;

      default:
        return `# Unknown action: ${step.action}\n`;
    }
  }

  private collectScreenshots(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const screenshots: string[] = [];

    const walkDir = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
          screenshots.push(fullPath);
        }
      }
    };

    walkDir(dir);
    return screenshots.sort();
  }

  private cleanupTempFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

export const maestroService = new MaestroService();
