import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { settingsManager } from '../config/index.js';
import { playStoreService } from '../services/index.js';

export async function handleConfigurePlayStore(args: {
  jsonKeyPath?: string;
  jsonKeyData?: string;
  projectDir?: string;
}): Promise<CallToolResult> {
  if (!args.jsonKeyPath && !args.jsonKeyData) {
    return {
      content: [{ type: 'text', text: 'Error: Provide either jsonKeyPath or jsonKeyData.' }],
      isError: true,
    };
  }

  const input = args.jsonKeyData ?? args.jsonKeyPath!;
  const validation = playStoreService.validateJsonKey(input);

  if (!validation.valid) {
    return {
      content: [
        {
          type: 'text',
          text: `Play Store configuration failed:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`,
        },
      ],
      isError: true,
    };
  }

  // Store globally (both path and inline data supported)
  const configUpdate: { jsonKeyPath?: string; jsonKeyData?: string; serviceAccountEmail?: string; projectId?: string } = {
    serviceAccountEmail: validation.serviceAccountEmail,
    projectId: validation.projectId,
  };

  if (args.jsonKeyData) {
    configUpdate.jsonKeyData = args.jsonKeyData;
  }
  if (args.jsonKeyPath) {
    configUpdate.jsonKeyPath = validation.jsonKeyPath ?? args.jsonKeyPath;
  }

  settingsManager.setPlayStoreConfig(configUpdate);

  const storageMode = args.jsonKeyData ? 'inline (embedded in config)' : `file (${validation.jsonKeyPath})`;
  let summary = `=== Google Play Store Configured ===\n\n`;
  summary += `Storage: ${storageMode}\n`;
  summary += `Service Account: ${validation.serviceAccountEmail}\n`;
  summary += `Project ID: ${validation.projectId}\n`;

  if (validation.warnings.length > 0) {
    summary += `\nWarnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}\n`;
  }

  // If projectDir is provided, write key to project
  if (args.projectDir) {
    let destPath: string;
    if (args.jsonKeyData) {
      // Write inline data to project
      const keysDir = path.join(args.projectDir, 'fastlane', 'keys');
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }
      destPath = path.join(keysDir, 'play-store-service-account.json');
      fs.writeFileSync(destPath, args.jsonKeyData);
    } else {
      destPath = playStoreService.copyKeyToProject(args.jsonKeyPath!, args.projectDir);
    }
    summary += `\nKey written to: ${destPath}\n`;

    // Update Appfile if it exists
    const appfilePath = path.join(args.projectDir, 'fastlane', 'Appfile');
    if (fs.existsSync(appfilePath)) {
      const appfile = fs.readFileSync(appfilePath, 'utf-8');
      const relativeKeyPath = path.relative(args.projectDir, destPath);
      if (!appfile.includes('json_key_file')) {
        fs.appendFileSync(appfilePath, `\njson_key_file("${relativeKeyPath}")\n`);
        summary += `Updated Appfile with json_key_file path\n`;
      }
    }

    summary += `.gitignore updated to exclude fastlane/keys/\n`;
  }

  if (args.jsonKeyData) {
    summary += `\nThe JSON key is stored in ~/.app-publisher/config.json.\n`;
    summary += `You can safely delete the original key file.\n`;
  }

  summary += `\nNext steps:\n`;
  summary += `1. Ensure the service account is invited in Google Play Console (Users & Permissions)\n`;
  summary += `2. Grant "Release manager" + "Edit store listing" permissions\n`;
  summary += `3. Use setup_fastlane with jsonKeyFile parameter, or publish_android to deploy\n`;

  return { content: [{ type: 'text', text: summary }] };
}

export async function handlePlayStoreStatus(): Promise<CallToolResult> {
  const config = settingsManager.getPlayStoreConfig();

  if (!config) {
    return {
      content: [
        {
          type: 'text',
          text: `=== Google Play Store Status ===\n\nNot configured.\n\nTo configure, use configure_playstore with the path to your service account JSON key file.\n\nSetup guide:\n1. Google Cloud Console > Create service account > Download JSON key\n2. Google Play Console > Users & Permissions > Invite service account email\n3. Grant permissions: Release management, Edit store listing\n4. Run: configure_playstore with jsonKeyPath`,
        },
      ],
    };
  }

  // Re-validate
  const keyInput = config.jsonKeyData ?? config.jsonKeyPath;
  const validation = keyInput ? playStoreService.validateJsonKey(keyInput) : { valid: false, errors: ['No key data'], warnings: [] };
  const storageMode = config.jsonKeyData ? 'inline (config)' : `file (${config.jsonKeyPath})`;

  let status = `=== Google Play Store Status ===\n\n`;
  status += `Configured: Yes\n`;
  status += `Storage: ${storageMode}\n`;
  status += `Key Valid: ${validation.valid ? 'Yes' : 'No'}\n`;
  status += `Service Account: ${config.serviceAccountEmail ?? 'Unknown'}\n`;
  status += `Project ID: ${config.projectId ?? 'Unknown'}\n`;

  if (!validation.valid) {
    status += `\nIssues:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}\n`;
  }

  if (validation.warnings.length > 0) {
    status += `\nWarnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}\n`;
  }

  return { content: [{ type: 'text', text: status }] };
}

export async function handlePlayStoreSetupKey(args: {
  jsonKeyPath: string;
  projectDir: string;
  packageName?: string;
}): Promise<CallToolResult> {
  // Validate the key
  const validation = playStoreService.validateJsonKey(args.jsonKeyPath);
  if (!validation.valid) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid JSON key:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`,
        },
      ],
      isError: true,
    };
  }

  // Copy key to project
  const destPath = playStoreService.copyKeyToProject(args.jsonKeyPath, args.projectDir);

  // Store globally
  settingsManager.setPlayStoreConfig({
    jsonKeyPath: validation.jsonKeyPath ?? args.jsonKeyPath,
    serviceAccountEmail: validation.serviceAccountEmail,
    projectId: validation.projectId,
  });

  // Create or update Appfile
  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) {
    fs.mkdirSync(fastlaneDir, { recursive: true });
  }

  const appfilePath = path.join(fastlaneDir, 'Appfile');
  const relativeKeyPath = path.relative(args.projectDir, destPath);

  if (fs.existsSync(appfilePath)) {
    let appfile = fs.readFileSync(appfilePath, 'utf-8');
    // Update or add json_key_file
    if (appfile.includes('json_key_file')) {
      appfile = appfile.replace(
        /json_key_file\(".*?"\)/,
        `json_key_file("${relativeKeyPath}")`,
      );
    } else {
      appfile += `\njson_key_file("${relativeKeyPath}")\n`;
    }
    // Update or add package_name
    if (args.packageName) {
      if (appfile.includes('package_name')) {
        appfile = appfile.replace(
          /package_name\(".*?"\)/,
          `package_name("${args.packageName}")`,
        );
      } else {
        appfile += `package_name("${args.packageName}")\n`;
      }
    }
    fs.writeFileSync(appfilePath, appfile);
  } else {
    // Create new Appfile for Android
    let content = `json_key_file("${relativeKeyPath}")\n`;
    if (args.packageName) {
      content += `package_name("${args.packageName}")\n`;
    }
    fs.writeFileSync(appfilePath, content);
  }

  // Create Fastfile if not exists
  const fastfilePath = path.join(fastlaneDir, 'Fastfile');
  if (!fs.existsSync(fastfilePath)) {
    const fastfileContent = `platform :android do
  desc "Upload to Google Play (production)"
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
    fs.writeFileSync(fastfilePath, fastfileContent);
  }

  // Create metadata structure for Android
  const metadataDir = path.join(fastlaneDir, 'metadata', 'android');
  const locales = ['en-US', 'ko-KR'];
  const metadataFiles = [
    'title.txt',
    'short_description.txt',
    'full_description.txt',
    'changelogs/default.txt',
  ];

  for (const locale of locales) {
    const localeDir = path.join(metadataDir, locale);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }
    for (const file of metadataFiles) {
      const filePath = path.join(localeDir, file);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
      }
    }
  }

  let summary = `=== Google Play Store Setup Complete ===\n\n`;
  summary += `Service Account: ${validation.serviceAccountEmail}\n`;
  summary += `Key copied to: ${destPath}\n`;
  summary += `Appfile: ${appfilePath}\n`;
  summary += `Fastfile: ${fastfilePath}\n`;
  summary += `Metadata: ${metadataDir}\n\n`;
  summary += `Created metadata structure:\n`;
  for (const locale of locales) {
    summary += `  ${locale}/\n`;
    for (const file of metadataFiles) {
      summary += `    ${file}\n`;
    }
  }
  summary += `\nNext steps:\n`;
  summary += `1. Fill in metadata files (title, description, changelog)\n`;
  summary += `2. Run: fastlane android metadata (to upload metadata)\n`;
  summary += `3. Run: fastlane android release aab:"path/to/app.aab" (to upload build)\n`;

  return { content: [{ type: 'text', text: summary }] };
}
