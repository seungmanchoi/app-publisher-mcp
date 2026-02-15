import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { IFastlaneConfig } from '../types/index.js';

export class FastlaneService {
  checkInstalled(): boolean {
    try {
      execSync('which fastlane', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  setupFastlane(config: IFastlaneConfig): string[] {
    const fastlaneDir = path.join(config.projectDir, 'fastlane');
    if (!fs.existsSync(fastlaneDir)) {
      fs.mkdirSync(fastlaneDir, { recursive: true });
    }

    const createdFiles: string[] = [];

    const appfileContent = this.generateAppfile(config);
    fs.writeFileSync(path.join(fastlaneDir, 'Appfile'), appfileContent);
    createdFiles.push('fastlane/Appfile');

    const fastfileContent = this.generateFastfile();
    fs.writeFileSync(path.join(fastlaneDir, 'Fastfile'), fastfileContent);
    createdFiles.push('fastlane/Fastfile');

    this.createMetadataStructure(fastlaneDir);
    createdFiles.push('fastlane/metadata/');

    return createdFiles;
  }

  private generateAppfile(config: IFastlaneConfig): string {
    const lines: string[] = [];

    lines.push(`app_identifier("${config.appIdentifier}")`);

    if (config.teamId) {
      lines.push(`team_id("${config.teamId}")`);
    }
    if (config.itunesConnectTeamId) {
      lines.push(`itunes_connect_team_id("${config.itunesConnectTeamId}")`);
    }
    if (config.jsonKeyFile) {
      lines.push(`json_key_file("${config.jsonKeyFile}")`);
    }
    if (config.packageName) {
      lines.push(`package_name("${config.packageName}")`);
    }

    return lines.join('\n') + '\n';
  }

  private generateFastfile(): string {
    return `default_platform(:ios)

platform :ios do
  desc "Upload to App Store"
  lane :release do
    deliver(
      submit_for_review: false,
      automatic_release: false,
      force: true,
      skip_metadata: false,
      skip_screenshots: true
    )
  end

  desc "Upload metadata only"
  lane :metadata do
    deliver(
      skip_binary_upload: true,
      skip_screenshots: true,
      force: true
    )
  end

  desc "Upload screenshots only"
  lane :screenshots do
    deliver(
      skip_binary_upload: true,
      skip_metadata: true,
      force: true
    )
  end
end

platform :android do
  desc "Upload to Google Play"
  lane :release do
    supply(
      track: "production",
      skip_upload_metadata: false,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Upload to internal testing track"
  lane :internal do
    supply(
      track: "internal",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Upload metadata only"
  lane :metadata do
    supply(
      skip_upload_apk: true,
      skip_upload_aab: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
`;
  }

  private createMetadataStructure(fastlaneDir: string): void {
    const metadataDir = path.join(fastlaneDir, 'metadata');

    const dirs = ['en-US', 'ko'];
    const fileTemplates = [
      'name.txt',
      'subtitle.txt',
      'description.txt',
      'keywords.txt',
      'release_notes.txt',
      'privacy_url.txt',
      'support_url.txt',
      'marketing_url.txt',
    ];

    for (const dir of dirs) {
      const fullDir = path.join(metadataDir, dir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }

      for (const file of fileTemplates) {
        const fullPath = path.join(fullDir, file);
        if (!fs.existsSync(fullPath)) {
          fs.writeFileSync(fullPath, '');
        }
      }
    }
  }

  publishIOS(projectDir: string, options: {
    ipaPath?: string;
    submitForReview?: boolean;
  } = {}): string {
    if (!this.checkInstalled()) {
      return 'Error: fastlane is not installed. Install with: brew install fastlane';
    }

    let command = 'fastlane ios release';
    if (options.ipaPath) {
      command += ` ipa:"${options.ipaPath}"`;
    }
    if (options.submitForReview) {
      command += ' submit_for_review:true';
    }

    try {
      const result = execSync(command, {
        cwd: projectDir,
        encoding: 'utf-8',
        timeout: 300000,
      });
      return result;
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      return `Error: ${err.stderr ?? err.message ?? 'Unknown error'}`;
    }
  }

  publishAndroid(projectDir: string, options: {
    aabPath?: string;
    track?: string;
  } = {}): string {
    if (!this.checkInstalled()) {
      return 'Error: fastlane is not installed. Install with: brew install fastlane';
    }

    let command = `fastlane android ${options.track === 'internal' ? 'internal' : 'release'}`;
    if (options.aabPath) {
      command += ` aab:"${options.aabPath}"`;
    }

    try {
      const result = execSync(command, {
        cwd: projectDir,
        encoding: 'utf-8',
        timeout: 300000,
      });
      return result;
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      return `Error: ${err.stderr ?? err.message ?? 'Unknown error'}`;
    }
  }
}

export const fastlaneService = new FastlaneService();
