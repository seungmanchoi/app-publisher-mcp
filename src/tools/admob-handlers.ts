import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as fs from 'fs';
import { settingsManager } from '../config/index.js';
import { admobService } from '../services/admob.js';
import type { TAdFormat } from '../types/index.js';

export async function handleConfigureAdMob(args: {
  clientId: string;
  clientSecret: string;
}): Promise<CallToolResult> {
  settingsManager.setAdMobCredentials(args.clientId, args.clientSecret);
  const authUrl = admobService.getAuthUrl(args.clientId);

  const maskedId = args.clientId.substring(0, 12) + '...';
  const maskedSecret = args.clientSecret.substring(0, 6) + '...';

  let text = `=== AdMob OAuth Credentials Configured ===\n\n`;
  text += `Client ID: ${maskedId}\n`;
  text += `Client Secret: ${maskedSecret}\n\n`;
  text += `--- Next Step: Authorize ---\n\n`;
  text += `1. Open the following URL in your browser:\n\n`;
  text += `${authUrl}\n\n`;
  text += `2. Sign in with your Google account and grant access\n`;
  text += `3. Copy the authorization code\n`;
  text += `4. Run the admob_auth tool with the code\n`;

  return { content: [{ type: 'text', text }] };
}

export async function handleAdMobAuth(args: { authCode: string }): Promise<CallToolResult> {
  try {
    const tokens = await admobService.exchangeAuthCode(args.authCode);
    settingsManager.updateAdMobTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    let text = `=== AdMob Authentication Successful ===\n\n`;
    text += `Access token obtained (expires in ${Math.floor(tokens.expiresIn / 60)} minutes)\n`;
    text += `Refresh token stored for automatic renewal\n\n`;
    text += `You can now use:\n`;
    text += `- admob_list_apps: List your AdMob apps\n`;
    text += `- admob_list_ad_units: List existing ad units\n`;
    text += `- admob_create_ad_unit: Create new ad units\n`;
    text += `- admob_integrate: Generate integration code for your project\n`;

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Authentication failed: ${message}` }],
      isError: true,
    };
  }
}

export async function handleAdMobListApps(): Promise<CallToolResult> {
  try {
    const apps = await admobService.listApps();

    if (apps.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No apps found in your AdMob account.\nCreate an app at https://admob.google.com',
          },
        ],
      };
    }

    let text = `=== AdMob Apps (${apps.length}) ===\n\n`;
    for (const app of apps) {
      text += `App ID: ${app.appId}\n`;
      text += `  Name: ${app.linkedAppInfo?.displayName ?? app.name}\n`;
      text += `  Platform: ${app.platform}\n`;
      text += `  Resource: ${app.name}\n\n`;
    }

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Failed to list apps: ${message}` }], isError: true };
  }
}

export async function handleAdMobListAdUnits(args: { appId?: string }): Promise<CallToolResult> {
  try {
    const adUnits = await admobService.listAdUnits(args.appId);

    if (adUnits.length === 0) {
      let text = 'No ad units found.';
      if (args.appId) {
        text += ` (filtered by appId: ${args.appId})`;
      }
      return { content: [{ type: 'text', text }] };
    }

    let text = `=== AdMob Ad Units (${adUnits.length}) ===\n\n`;
    for (const unit of adUnits) {
      text += `Ad Unit ID: ${unit.adUnitId}\n`;
      text += `  Name: ${unit.displayName}\n`;
      text += `  Format: ${unit.adFormat}\n`;
      text += `  App ID: ${unit.appId}\n`;
      text += `  Resource: ${unit.name}\n\n`;
    }

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Failed to list ad units: ${message}` }], isError: true };
  }
}

export async function handleAdMobCreateAdUnit(args: {
  appId: string;
  displayName: string;
  adFormat: string;
}): Promise<CallToolResult> {
  const validFormats: TAdFormat[] = ['BANNER', 'INTERSTITIAL', 'REWARDED', 'REWARDED_INTERSTITIAL', 'APP_OPEN', 'NATIVE'];
  const format = args.adFormat.toUpperCase() as TAdFormat;

  if (!validFormats.includes(format)) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid ad format: ${args.adFormat}\nValid formats: ${validFormats.join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const adUnit = await admobService.createAdUnit(args.appId, args.displayName, format);

    let text = `=== Ad Unit Created ===\n\n`;
    text += `Ad Unit ID: ${adUnit.adUnitId}\n`;
    text += `Display Name: ${adUnit.displayName}\n`;
    text += `Format: ${adUnit.adFormat}\n`;
    text += `App ID: ${adUnit.appId}\n`;
    text += `Resource: ${adUnit.name}\n\n`;
    text += `Use this Ad Unit ID in your app code or run admob_integrate to generate integration code.`;

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Failed to create ad unit: ${message}` }], isError: true };
  }
}

export async function handleAdMobIntegrate(args: {
  projectDir: string;
  platform?: string;
  iosAppId?: string;
  androidAppId?: string;
  adUnits?: Array<{ id: string; format: string; name: string }>;
}): Promise<CallToolResult> {
  const projectDir = args.projectDir;
  const platform = (args.platform ?? 'both') as 'ios' | 'android' | 'both';
  const iosAppId = args.iosAppId ?? 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy';
  const androidAppId = args.androidAppId ?? 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy';

  const adUnits = (args.adUnits ?? []).map((u) => ({
    id: u.id,
    format: u.format.toUpperCase() as TAdFormat,
    name: u.name,
  }));

  if (adUnits.length === 0) {
    adUnits.push(
      { id: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy', format: 'BANNER', name: 'Home' },
      { id: 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz', format: 'INTERSTITIAL', name: 'Between' },
    );
  }

  const result = admobService.generateIntegrationCode(platform, iosAppId, androidAppId, adUnits);

  const adsDir = path.join(projectDir, 'src', 'features', 'ads');

  try {
    if (!fs.existsSync(adsDir)) {
      fs.mkdirSync(adsDir, { recursive: true });
    }

    const generatedFiles: string[] = [];

    for (const [filename, code] of Object.entries(result.componentCode)) {
      const filePath = path.join(adsDir, filename);
      fs.writeFileSync(filePath, code, 'utf-8');
      generatedFiles.push(filePath);
    }

    const indexContent = Object.keys(result.componentCode)
      .map((f) => {
        const moduleName = f.replace(/\.(tsx?|ts)$/, '');
        return `export * from './${moduleName}';`;
      })
      .join('\n') + '\n';
    const indexPath = path.join(adsDir, 'index.ts');
    fs.writeFileSync(indexPath, indexContent, 'utf-8');
    generatedFiles.push(indexPath);

    let text = `=== AdMob Integration Code Generated ===\n\n`;
    text += `--- 1. Install Dependencies ---\n`;
    text += `$ ${result.installCommand}\n\n`;
    text += `--- 2. App Configuration ---\n`;
    text += `Add to your app.json or app.config.ts:\n\n`;
    text += `${result.appConfig}\n\n`;
    text += `--- 3. Generated Files ---\n`;
    for (const file of generatedFiles) {
      text += `  ${file}\n`;
    }
    text += `\n--- 4. ATT (App Tracking Transparency) ---\n`;
    text += `For iOS, add ATT consent request before showing ads:\n\n`;
    text += `import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';\n\n`;
    text += `const { status } = await requestTrackingPermissionsAsync();\n`;
    text += `// status: 'granted' | 'denied' | 'undetermined'\n\n`;
    text += `--- 5. Important Notes ---\n`;
    text += `- Use TestIds during development (already set in generated code with __DEV__ check)\n`;
    text += `- Replace placeholder App IDs with real ones from AdMob dashboard\n`;
    text += `- Expo Go does NOT support native ads — use Development Build\n`;
    text += `- On Android, declare "contains ads" in Google Play Console\n`;

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Failed to generate integration code: ${message}` }], isError: true };
  }
}

export async function handleAdMobStatus(): Promise<CallToolResult> {
  const admobConfig = settingsManager.getAdMobConfig();
  const isConfigured = settingsManager.isAdMobConfigured();

  let text = `=== AdMob Configuration Status ===\n\n`;

  if (!admobConfig) {
    text += `Status: Not configured\n\n`;
    text += `Run configure_admob with your OAuth credentials to get started.\n`;
    text += `See README for instructions on getting OAuth credentials.\n`;
    return { content: [{ type: 'text', text }] };
  }

  text += `OAuth Client ID: ${admobConfig.clientId ? admobConfig.clientId.substring(0, 12) + '...' : 'Not set'}\n`;
  text += `OAuth Client Secret: ${admobConfig.clientSecret ? '****' : 'Not set'}\n`;
  text += `Refresh Token: ${admobConfig.refreshToken ? 'Stored' : 'Not set'}\n`;
  text += `Account ID: ${admobConfig.accountId ?? 'Not resolved'}\n`;
  text += `Authenticated: ${isConfigured ? 'Yes' : 'No'}\n`;

  if (admobConfig.tokenExpiry) {
    const remaining = admobConfig.tokenExpiry - Date.now();
    if (remaining > 0) {
      text += `Access Token: Valid (${Math.floor(remaining / 60000)} min remaining)\n`;
    } else {
      text += `Access Token: Expired (will auto-refresh)\n`;
    }
  }

  return { content: [{ type: 'text', text }] };
}
