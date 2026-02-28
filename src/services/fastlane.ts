import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { IFastlaneConfig, IMetadataContent, IMetadataValidationResult } from '../types/index.js';

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

    const fastfileContent = this.generateFastfile(config);
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

  private generateFastfile(config: IFastlaneConfig): string {
    const year = new Date().getFullYear();
    const copyright = config.copyright ?? `${year} ${config.appName}`;
    const reviewEmail = config.reviewContactEmail ?? '';
    const reviewFirstName = config.reviewContactFirstName ?? '';
    const reviewLastName = config.reviewContactLastName ?? '';
    const reviewPhone = config.reviewContactPhone ?? '';

    return `default_platform(:ios)

platform :ios do
  desc "Upload to App Store"
  lane :release do
    deliver(
      submit_for_review: false,
      automatic_release: false,
      force: true,
      copyright: "${copyright}",
      skip_metadata: false,
      skip_screenshots: true,
      precheck_include_in_app_purchases: false,
      app_review_information: {
        first_name: "${reviewFirstName}",
        last_name: "${reviewLastName}",
        email_address: "${reviewEmail}",
        phone_number: "${reviewPhone}",
        notes: ""
      }
    )
  end

  desc "Upload metadata only"
  lane :metadata do
    deliver(
      skip_binary_upload: true,
      skip_screenshots: true,
      skip_app_version_update: true,
      force: true,
      copyright: "${copyright}",
      precheck_include_in_app_purchases: false,
      app_review_information: {
        first_name: "${reviewFirstName}",
        last_name: "${reviewLastName}",
        email_address: "${reviewEmail}",
        phone_number: "${reviewPhone}",
        notes: ""
      }
    )
  end

  desc "Upload screenshots only"
  lane :screenshots do
    deliver(
      skip_binary_upload: true,
      skip_metadata: true,
      force: true,
      precheck_include_in_app_purchases: false
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
      'promotional_text.txt',
      'release_notes.txt',
      'privacy_url.txt',
      'support_url.txt',
      'marketing_url.txt',
      'copyright.txt',
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

  populateMetadata(
    projectDir: string,
    localeContents: Record<string, IMetadataContent>,
  ): { created: number; updated: number; locales: string[] } {
    const metadataDir = path.join(projectDir, 'fastlane', 'metadata');
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    let created = 0;
    let updated = 0;
    const locales: string[] = [];

    for (const [locale, content] of Object.entries(localeContents)) {
      const localeDir = path.join(metadataDir, locale);
      if (!fs.existsSync(localeDir)) {
        fs.mkdirSync(localeDir, { recursive: true });
      }
      locales.push(locale);

      const fields: [keyof IMetadataContent, string][] = [
        ['name', 'name.txt'],
        ['subtitle', 'subtitle.txt'],
        ['description', 'description.txt'],
        ['keywords', 'keywords.txt'],
        ['promotional_text', 'promotional_text.txt'],
        ['release_notes', 'release_notes.txt'],
        ['privacy_url', 'privacy_url.txt'],
        ['support_url', 'support_url.txt'],
        ['marketing_url', 'marketing_url.txt'],
        ['copyright', 'copyright.txt'],
      ];

      for (const [key, filename] of fields) {
        const value = content[key];
        if (value !== undefined) {
          const filePath = path.join(localeDir, filename);
          const exists = fs.existsSync(filePath);
          fs.writeFileSync(filePath, value);
          if (exists) {
            updated++;
          } else {
            created++;
          }
        }
      }
    }

    return { created, updated, locales };
  }

  validateMetadata(projectDir: string): IMetadataValidationResult[] {
    const metadataDir = path.join(projectDir, 'fastlane', 'metadata');
    const issues: IMetadataValidationResult[] = [];

    if (!fs.existsSync(metadataDir)) {
      issues.push({
        locale: '-',
        field: 'metadata',
        value: '',
        issue: 'Metadata directory not found. Run setup_fastlane first.',
      });
      return issues;
    }

    const locales = fs.readdirSync(metadataDir).filter((d) => {
      const stat = fs.statSync(path.join(metadataDir, d));
      return stat.isDirectory() && !d.startsWith('.');
    });

    if (locales.length === 0) {
      issues.push({
        locale: '-',
        field: 'locales',
        value: '',
        issue: 'No locale directories found in metadata.',
      });
      return issues;
    }

    const requiredFiles = ['name.txt', 'description.txt', 'privacy_url.txt', 'support_url.txt'];
    const lengthLimits: Record<string, number> = {
      'name.txt': 30,
      'subtitle.txt': 30,
      'keywords.txt': 100,
    };

    for (const locale of locales) {
      const localeDir = path.join(metadataDir, locale);

      for (const file of requiredFiles) {
        const filePath = path.join(localeDir, file);
        if (!fs.existsSync(filePath)) {
          issues.push({
            locale,
            field: file.replace('.txt', ''),
            value: '',
            issue: `Missing required file: ${file}`,
          });
        } else {
          const content = fs.readFileSync(filePath, 'utf-8').trim();
          if (content.length === 0) {
            issues.push({
              locale,
              field: file.replace('.txt', ''),
              value: '',
              issue: `Required field is empty: ${file}`,
            });
          }
        }
      }

      for (const [file, limit] of Object.entries(lengthLimits)) {
        const filePath = path.join(localeDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8').trim();
          if (content.length > limit) {
            issues.push({
              locale,
              field: file.replace('.txt', ''),
              value: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
              issue: `Exceeds ${limit} character limit`,
              limit,
              actual: content.length,
            });
          }
        }
      }

      const copyrightPath = path.join(localeDir, 'copyright.txt');
      if (!fs.existsSync(copyrightPath)) {
        issues.push({
          locale,
          field: 'copyright',
          value: '',
          issue: 'Missing copyright.txt file',
        });
      } else {
        const copyright = fs.readFileSync(copyrightPath, 'utf-8').trim();
        const currentYear = new Date().getFullYear().toString();
        if (copyright.length > 0 && !copyright.includes(currentYear)) {
          issues.push({
            locale,
            field: 'copyright',
            value: copyright,
            issue: `Copyright does not include current year (${currentYear})`,
          });
        }
      }
    }

    return issues;
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
