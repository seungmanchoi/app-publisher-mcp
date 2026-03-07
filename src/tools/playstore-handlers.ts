import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { settingsManager } from '../config/index.js';
import { playStoreService } from '../services/index.js';

// === Configuration Tools ===

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
      content: [{ type: 'text', text: `Play Store configuration failed:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}` }],
      isError: true,
    };
  }

  const configUpdate: { jsonKeyPath?: string; jsonKeyData?: string; serviceAccountEmail?: string; projectId?: string } = {
    serviceAccountEmail: validation.serviceAccountEmail,
    projectId: validation.projectId,
  };

  if (args.jsonKeyData) configUpdate.jsonKeyData = args.jsonKeyData;
  if (args.jsonKeyPath) configUpdate.jsonKeyPath = validation.jsonKeyPath ?? args.jsonKeyPath;

  settingsManager.setPlayStoreConfig(configUpdate);

  const storageMode = args.jsonKeyData ? 'inline (embedded in config)' : `file (${validation.jsonKeyPath})`;
  let summary = `=== Google Play Store Configured ===\n\n`;
  summary += `Storage: ${storageMode}\n`;
  summary += `Service Account: ${validation.serviceAccountEmail}\n`;
  summary += `Project ID: ${validation.projectId}\n`;

  if (validation.warnings.length > 0) {
    summary += `\nWarnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}\n`;
  }

  if (args.projectDir) {
    let destPath: string;
    if (args.jsonKeyData) {
      const keysDir = path.join(args.projectDir, 'fastlane', 'keys');
      if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });
      destPath = path.join(keysDir, 'play-store-service-account.json');
      fs.writeFileSync(destPath, args.jsonKeyData);
    } else {
      destPath = playStoreService.copyKeyToProject(args.jsonKeyPath!, args.projectDir);
    }
    summary += `\nKey written to: ${destPath}\n`;

    const appfilePath = path.join(args.projectDir, 'fastlane', 'Appfile');
    if (fs.existsSync(appfilePath)) {
      const appfile = fs.readFileSync(appfilePath, 'utf-8');
      const relativeKeyPath = path.relative(args.projectDir, destPath);
      if (!appfile.includes('json_key_file')) {
        fs.appendFileSync(appfilePath, `\njson_key_file("${relativeKeyPath}")\n`);
        summary += `Updated Appfile with json_key_file path\n`;
      }
    }
  }

  if (args.jsonKeyData) {
    summary += `\nThe JSON key is stored in ~/.app-publisher/config.json.\n`;
    summary += `You can safely delete the original key file.\n`;
  }

  return { content: [{ type: 'text', text: summary }] };
}

export async function handlePlayStoreStatus(): Promise<CallToolResult> {
  const config = settingsManager.getPlayStoreConfig();

  if (!config) {
    return {
      content: [{ type: 'text', text: `=== Google Play Store Status ===\n\nNot configured.\n\nRun configure_playstore with jsonKeyPath or jsonKeyData to set up.` }],
    };
  }

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

  return { content: [{ type: 'text', text: status }] };
}

export async function handlePlayStoreSetupKey(args: {
  jsonKeyPath: string;
  projectDir: string;
  packageName?: string;
}): Promise<CallToolResult> {
  const validation = playStoreService.validateJsonKey(args.jsonKeyPath);
  if (!validation.valid) {
    return {
      content: [{ type: 'text', text: `Invalid JSON key:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}` }],
      isError: true,
    };
  }

  const destPath = playStoreService.copyKeyToProject(args.jsonKeyPath, args.projectDir);

  settingsManager.setPlayStoreConfig({
    jsonKeyPath: validation.jsonKeyPath ?? args.jsonKeyPath,
    serviceAccountEmail: validation.serviceAccountEmail,
    projectId: validation.projectId,
  });

  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) fs.mkdirSync(fastlaneDir, { recursive: true });

  const appfilePath = path.join(fastlaneDir, 'Appfile');
  const relativeKeyPath = path.relative(args.projectDir, destPath);

  if (fs.existsSync(appfilePath)) {
    let appfile = fs.readFileSync(appfilePath, 'utf-8');
    if (appfile.includes('json_key_file')) {
      appfile = appfile.replace(/json_key_file\(".*?"\)/, `json_key_file("${relativeKeyPath}")`);
    } else {
      appfile += `\njson_key_file("${relativeKeyPath}")\n`;
    }
    if (args.packageName) {
      if (appfile.includes('package_name')) {
        appfile = appfile.replace(/package_name\(".*?"\)/, `package_name("${args.packageName}")`);
      } else {
        appfile += `package_name("${args.packageName}")\n`;
      }
    }
    fs.writeFileSync(appfilePath, appfile);
  } else {
    let content = `json_key_file("${relativeKeyPath}")\n`;
    if (args.packageName) content += `package_name("${args.packageName}")\n`;
    fs.writeFileSync(appfilePath, content);
  }

  let summary = `=== Google Play Store Setup Complete ===\n\n`;
  summary += `Service Account: ${validation.serviceAccountEmail}\n`;
  summary += `Key copied to: ${destPath}\n`;
  summary += `Appfile: ${appfilePath}\n`;

  return { content: [{ type: 'text', text: summary }] };
}

// === App Information Tools ===

export async function handlePlayStoreVerifyAccess(args: {
  packageName: string;
}): Promise<CallToolResult> {
  try {
    const result = await playStoreService.verifyAccess(args.packageName);
    return {
      content: [{ type: 'text', text: result.success ? `Access verified for ${args.packageName}` : `Access denied: ${result.message}` }],
      isError: !result.success,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
}

export async function handlePlayStoreGetAppInfo(args: {
  packageName: string;
}): Promise<CallToolResult> {
  try {
    const details = await playStoreService.getAppDetails(args.packageName);

    let summary = `=== ${args.packageName} ===\n\n`;

    summary += `--- Store Listings ---\n`;
    if (details.listings.length === 0) {
      summary += `  No listings found\n`;
    } else {
      for (const listing of details.listings) {
        summary += `\n[${listing.language}]\n`;
        summary += `  Title: ${listing.title ?? '(empty)'}\n`;
        summary += `  Short Description: ${listing.shortDescription ?? '(empty)'}\n`;
        summary += `  Full Description: ${(listing.fullDescription ?? '(empty)').substring(0, 200)}${(listing.fullDescription?.length ?? 0) > 200 ? '...' : ''}\n`;
      }
    }

    summary += `\n--- Tracks ---\n`;
    if (details.tracks.length === 0) {
      summary += `  No tracks found\n`;
    } else {
      for (const track of details.tracks) {
        summary += `\n[${track.track}]\n`;
        for (const release of track.releases) {
          summary += `  Status: ${release.status ?? 'unknown'}\n`;
          summary += `  Version Codes: ${release.versionCodes?.join(', ') ?? 'none'}\n`;
          if (release.name) summary += `  Name: ${release.name}\n`;
        }
      }
    }

    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
}

// === Store Listing Tools ===

export async function handlePlayStoreGetListing(args: {
  packageName: string;
  language?: string;
}): Promise<CallToolResult> {
  try {
    if (args.language) {
      const listing = await playStoreService.getListing(args.packageName, args.language);
      let summary = `=== Store Listing [${listing.language}] ===\n\n`;
      summary += `Title: ${listing.title ?? '(empty)'}\n`;
      summary += `Short Description: ${listing.shortDescription ?? '(empty)'}\n`;
      summary += `Full Description:\n${listing.fullDescription ?? '(empty)'}\n`;
      return { content: [{ type: 'text', text: summary }] };
    }

    const listings = await playStoreService.getListings(args.packageName);
    let summary = `=== Store Listings for ${args.packageName} ===\n\n`;
    if (listings.length === 0) {
      summary += 'No listings found.\n';
    } else {
      for (const listing of listings) {
        summary += `[${listing.language}]\n`;
        summary += `  Title: ${listing.title ?? '(empty)'}\n`;
        summary += `  Short Description: ${listing.shortDescription ?? '(empty)'}\n\n`;
      }
    }
    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

export async function handlePlayStoreUpdateListing(args: {
  packageName: string;
  language: string;
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
}): Promise<CallToolResult> {
  try {
    const listing: Record<string, string> = {};
    if (args.title) listing.title = args.title;
    if (args.shortDescription) listing.shortDescription = args.shortDescription;
    if (args.fullDescription) listing.fullDescription = args.fullDescription;

    if (Object.keys(listing).length === 0) {
      return {
        content: [{ type: 'text', text: 'Error: Provide at least one of title, shortDescription, or fullDescription.' }],
        isError: true,
      };
    }

    const result = await playStoreService.updateListing(args.packageName, args.language, listing);

    let summary = `=== Listing Updated [${args.language}] ===\n\n`;
    summary += `Title: ${result.title ?? '(empty)'}\n`;
    summary += `Short Description: ${result.shortDescription ?? '(empty)'}\n`;
    summary += `Full Description: ${(result.fullDescription ?? '(empty)').substring(0, 200)}...\n`;

    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

// === Track Tools ===

export async function handlePlayStoreGetTracks(args: {
  packageName: string;
}): Promise<CallToolResult> {
  try {
    const tracks = await playStoreService.getTracks(args.packageName);

    let summary = `=== Release Tracks for ${args.packageName} ===\n\n`;
    if (tracks.length === 0) {
      summary += 'No tracks found.\n';
    } else {
      for (const track of tracks) {
        summary += `[${track.track}]\n`;
        for (const release of track.releases) {
          summary += `  Status: ${release.status ?? 'unknown'}\n`;
          summary += `  Version Codes: ${release.versionCodes?.join(', ') ?? 'none'}\n`;
          if (release.name) summary += `  Name: ${release.name}\n`;
          if (release.releaseNotes) {
            for (const note of release.releaseNotes) {
              summary += `  Release Notes [${note.language}]: ${note.text.substring(0, 100)}${note.text.length > 100 ? '...' : ''}\n`;
            }
          }
        }
        summary += '\n';
      }
    }

    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

// === Image/Screenshot Tools ===

export async function handlePlayStoreListImages(args: {
  packageName: string;
  language: string;
  imageType: string;
}): Promise<CallToolResult> {
  try {
    const images = await playStoreService.listImages(args.packageName, args.language, args.imageType);

    let summary = `=== ${args.imageType} Images [${args.language}] ===\n\n`;
    if (images.length === 0) {
      summary += 'No images found.\n';
    } else {
      summary += `Total: ${images.length}\n\n`;
      for (const img of images) {
        summary += `  ID: ${img.id}\n`;
        summary += `  URL: ${img.url}\n\n`;
      }
    }

    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

export async function handlePlayStoreUploadImage(args: {
  packageName: string;
  language: string;
  imageType: string;
  imagePath: string;
}): Promise<CallToolResult> {
  try {
    const image = await playStoreService.uploadImage(
      args.packageName,
      args.language,
      args.imageType,
      args.imagePath,
    );

    let summary = `=== Image Uploaded ===\n\n`;
    summary += `Type: ${args.imageType}\n`;
    summary += `Language: ${args.language}\n`;
    summary += `ID: ${image.id}\n`;
    summary += `URL: ${image.url}\n`;

    return { content: [{ type: 'text', text: summary }] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

export async function handlePlayStoreDeleteImages(args: {
  packageName: string;
  language: string;
  imageType: string;
}): Promise<CallToolResult> {
  try {
    await playStoreService.deleteAllImages(args.packageName, args.language, args.imageType);
    return {
      content: [{ type: 'text', text: `All ${args.imageType} images for [${args.language}] deleted successfully.` }],
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}
