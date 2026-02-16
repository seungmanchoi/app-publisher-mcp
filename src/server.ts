import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { settingsManager } from './config/index.js';
import {
  handleConfigureApiKey,
  handleConfigureModel,
  handleGenerateIcon,
  handleResizeIcons,
  handleGenerateSplash,
  handleGenerateScreenshot,
  handleSetupFastlane,
  handlePublishIOS,
  handlePublishAndroid,
  handleGetStatus,
} from './tools/index.js';

export class AppPublisherServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'app-publisher-mcp',
      version: '1.0.0',
    });

    this.setupTools();
  }

  private setupTools(): void {
    this.server.tool(
      'configure_api_key',
      'Set or update the Gemini API key for AI image generation. The key is stored locally and persists across sessions.',
      { apiKey: z.string().describe('Your Google Gemini API key (get one at https://aistudio.google.com/apikey)') },
      async (args) => handleConfigureApiKey(args),
    );

    this.server.tool(
      'configure_model',
      'Set the default Gemini model for image generation. Persists across sessions. Recommended: gemini-2.5-flash-image (fast), gemini-3-pro-image-preview (best quality).',
      { model: z.string().describe('Gemini model ID (e.g., gemini-2.5-flash-image, gemini-3-pro-image-preview)') },
      async (args) => handleConfigureModel(args),
    );

    this.server.tool(
      'generate_icon',
      'Generate an app icon using AI. Creates a square icon suitable for mobile app stores. Returns the generated image and saves it to disk.',
      {
        prompt: z.string().describe('Description of the app icon to generate (e.g., "a minimalist camera icon with blue gradient")'),
        model: z.string().optional().describe('Optional Gemini model override for this request'),
        outputDir: z.string().optional().describe('Optional output directory (default: ~/app-publisher-assets)'),
      },
      async (args) => handleGenerateIcon(args),
    );

    this.server.tool(
      'resize_icons',
      'Resize an icon image to all required sizes for iOS and/or Android platforms. Generates Xcode-compatible Contents.json for iOS. Source image should be at least 1024x1024.',
      {
        sourcePath: z.string().describe('Path to the source icon image (square, at least 1024x1024 recommended)'),
        outputDir: z.string().describe('Output directory for resized icons'),
        platforms: z.array(z.enum(['ios', 'android'])).optional().describe('Target platforms (default: both ios and android)'),
      },
      async (args) => handleResizeIcons(args),
    );

    this.server.tool(
      'generate_splash',
      'Generate a splash screen (launch screen) design using AI. Creates a professional app launch screen image.',
      {
        prompt: z.string().describe('Description of the splash screen to generate'),
        model: z.string().optional().describe('Optional Gemini model override for this request'),
        outputDir: z.string().optional().describe('Optional output directory (default: ~/app-publisher-assets)'),
      },
      async (args) => handleGenerateSplash(args),
    );

    this.server.tool(
      'generate_screenshot',
      'Generate an app store screenshot mockup using AI. Creates realistic app screenshots for store listings.',
      {
        prompt: z.string().describe('Description of the screenshot to generate (e.g., "a fitness tracking dashboard showing workout stats")'),
        model: z.string().optional().describe('Optional Gemini model override for this request'),
        outputDir: z.string().optional().describe('Optional output directory (default: ~/app-publisher-assets)'),
      },
      async (args) => handleGenerateScreenshot(args),
    );

    this.server.tool(
      'setup_fastlane',
      'Generate fastlane configuration files (Fastfile, Appfile, metadata structure) for automated iOS/Android app publishing.',
      {
        projectDir: z.string().describe('Path to the app project directory'),
        appIdentifier: z.string().describe('App bundle identifier (e.g., com.example.myapp)'),
        appName: z.string().describe('App display name'),
        teamId: z.string().optional().describe('Apple Developer Team ID (for iOS)'),
        itunesConnectTeamId: z.string().optional().describe('App Store Connect Team ID (for iOS, if different from teamId)'),
        jsonKeyFile: z.string().optional().describe('Path to Google Play Console JSON key file (for Android)'),
        packageName: z.string().optional().describe('Android package name (if different from appIdentifier)'),
      },
      async (args) => handleSetupFastlane(args),
    );

    this.server.tool(
      'publish_ios',
      'Publish the app to the iOS App Store using fastlane deliver. Requires fastlane to be installed and configured.',
      {
        projectDir: z.string().describe('Path to the app project directory (must contain fastlane/ directory)'),
        ipaPath: z.string().optional().describe('Path to the IPA file to upload'),
        submitForReview: z.boolean().optional().describe('Whether to submit for Apple review after upload (default: false)'),
      },
      async (args) => handlePublishIOS(args),
    );

    this.server.tool(
      'publish_android',
      'Publish the app to Google Play Store using fastlane supply. Requires fastlane to be installed and configured.',
      {
        projectDir: z.string().describe('Path to the app project directory (must contain fastlane/ directory)'),
        aabPath: z.string().optional().describe('Path to the AAB (Android App Bundle) file to upload'),
        track: z.string().optional().describe('Release track: internal, alpha, beta, production (default: production)'),
      },
      async (args) => handlePublishAndroid(args),
    );

    this.server.tool(
      'get_status',
      'Check the current configuration status including API key, model, fastlane installation, and generated assets.',
      {},
      async () => handleGetStatus(),
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const model = settingsManager.getModel();
    const configured = settingsManager.isConfigured();
    console.error(`App Publisher MCP server running (model: ${model}, configured: ${configured})`);
  }
}
