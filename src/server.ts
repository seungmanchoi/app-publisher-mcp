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
  handleGenerateStoreListing,
  handleGetPublishingGuide,
  handlePopulateMetadata,
  handleValidateMetadata,
  handleSetupMaestro,
  handleMaestroScreenshot,
  handleMaestroRunFlow,
  handleMaestroRunYaml,
  handleMaestroStatus,
  handleMaestroStoreScreenshot,
} from './tools/index.js';

export class AppPublisherServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'app-publisher-mcp',
      version: '1.5.2',
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
      'Generate fastlane configuration files (Fastfile, Appfile, metadata structure) for automated iOS/Android app publishing. Includes: copyright auto-set, app_review_information, precheck_include_in_app_purchases: false, skip_app_version_update for metadata lane.',
      {
        projectDir: z.string().describe('Path to the app project directory'),
        appIdentifier: z.string().describe('App bundle identifier (e.g., com.example.myapp)'),
        appName: z.string().describe('App display name'),
        teamId: z.string().optional().describe('Apple Developer Team ID (for iOS)'),
        itunesConnectTeamId: z.string().optional().describe('App Store Connect Team ID (for iOS, if different from teamId)'),
        jsonKeyFile: z.string().optional().describe('Path to Google Play Console JSON key file (for Android)'),
        packageName: z.string().optional().describe('Android package name (if different from appIdentifier)'),
        copyright: z.string().optional().describe('Copyright text (default: "{year} {appName}")'),
        reviewContactEmail: z.string().optional().describe('App Review contact email address'),
        reviewContactFirstName: z.string().optional().describe('App Review contact first name'),
        reviewContactLastName: z.string().optional().describe('App Review contact last name'),
        reviewContactPhone: z.string().optional().describe('App Review contact phone number'),
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
      'populate_metadata',
      'Populate fastlane metadata directory with locale-specific content. Creates all required .txt files (name, subtitle, description, keywords, etc.) for each locale. Use this after generate_store_listing to write content directly to fastlane metadata files.',
      {
        projectDir: z.string().describe('Path to the app project directory (must contain fastlane/ directory)'),
        locales: z.record(
          z.string(),
          z.object({
            name: z.string().optional().describe('App name (max 30 chars)'),
            subtitle: z.string().optional().describe('App subtitle (max 30 chars)'),
            description: z.string().optional().describe('Full app description'),
            keywords: z.string().optional().describe('Comma-separated keywords (max 100 chars)'),
            promotional_text: z.string().optional().describe('Promotional text'),
            release_notes: z.string().optional().describe('Release notes / What\'s New'),
            privacy_url: z.string().optional().describe('Privacy policy URL'),
            support_url: z.string().optional().describe('Support URL'),
            marketing_url: z.string().optional().describe('Marketing URL'),
            copyright: z.string().optional().describe('Copyright text'),
          }),
        ).describe('Map of locale code to metadata content. Example: {"en-US": {"name": "My App", ...}, "ko": {"name": "내 앱", ...}}'),
      },
      async (args) => handlePopulateMetadata(args),
    );

    this.server.tool(
      'validate_metadata',
      'Validate fastlane metadata files for App Store requirements. Checks: subtitle <= 30 chars, keywords <= 100 chars, required files present (name, description, privacy_url, support_url), copyright includes current year.',
      {
        projectDir: z.string().describe('Path to the app project directory (must contain fastlane/metadata/ directory)'),
      },
      async (args) => handleValidateMetadata(args),
    );

    this.server.tool(
      'get_status',
      'Check the current configuration status including API key, model, fastlane installation, and generated assets.',
      {},
      async () => handleGetStatus(),
    );

    this.server.tool(
      'generate_store_listing',
      'Analyze a project directory and generate complete store listing content (app name, description, keywords, privacy policy, etc.) for iOS App Store and/or Google Play Store.',
      {
        projectDir: z.string().describe('Path to the project directory to analyze'),
        platform: z
          .enum(['ios', 'android', 'both'])
          .optional()
          .describe('Target platform: ios, android, or both (default: both)'),
        language: z
          .enum(['ko', 'en', 'ja', 'zh'])
          .optional()
          .describe('Output language: ko (Korean), en (English), ja (Japanese), or zh (Chinese). Default: ko'),
      },
      async (args) => handleGenerateStoreListing(args),
    );

    this.server.tool(
      'get_publishing_guide',
      'Get a comprehensive step-by-step guide for publishing an app to the iOS App Store or Google Play Store. Customized based on project info if projectDir is provided.',
      {
        platform: z
          .enum(['ios', 'android'])
          .describe('Target platform: ios or android'),
        projectDir: z
          .string()
          .optional()
          .describe('Optional path to project directory for customized guide with actual bundle ID, app name, etc.'),
        framework: z
          .enum(['expo', 'react-native', 'flutter', 'native'])
          .optional()
          .describe('App framework (auto-detected if projectDir is given). Options: expo, react-native, flutter, native'),
      },
      async (args) => handleGetPublishingGuide(args),
    );

    // Maestro UI Testing Tools

    this.server.tool(
      'setup_maestro',
      'Install and configure Maestro CLI for mobile UI testing automation. Checks Java 17+ requirement and installs Maestro if not present. Run this first before using other maestro_* tools.',
      {},
      async () => handleSetupMaestro(),
    );

    this.server.tool(
      'maestro_screenshot',
      'Take a screenshot of the currently running app on iOS Simulator or Android Emulator using Maestro. Returns the screenshot image. Requires Maestro CLI and a running simulator/emulator.',
      {
        outputDir: z
          .string()
          .optional()
          .describe('Output directory for screenshots (default: ~/app-publisher-assets/maestro)'),
        filename: z
          .string()
          .optional()
          .describe('Screenshot filename without extension (default: screenshot_<timestamp>)'),
      },
      async (args) => handleMaestroScreenshot(args),
    );

    this.server.tool(
      'maestro_run_flow',
      'Run a UI test flow on a simulator/emulator using Maestro. Accepts structured steps that are converted to a Maestro flow YAML. Use takeScreenshot steps to capture screenshots during the flow. Returns all captured screenshots as images.\n\nAvailable actions: launchApp, stopApp, clearState, tapOn, tapOnPoint, longPressOn, doubleTapOn, inputText, eraseText, swipe, scroll, scrollUntilVisible, back, home, pressKey, hideKeyboard, takeScreenshot, assertVisible, assertNotVisible, waitForAnimationToEnd, wait, openLink, copyTextFrom, pasteText, runScript',
      {
        appId: z.string().describe('App bundle identifier (e.g., com.calcvault.app)'),
        steps: z
          .array(
            z.object({
              action: z
                .string()
                .describe(
                  'Maestro action: launchApp, tapOn, inputText, takeScreenshot, swipe, scroll, assertVisible, back, home, etc.',
                ),
              value: z
                .string()
                .optional()
                .describe('Action value: text to tap, text to input, screenshot name, app ID for launchApp, etc.'),
              direction: z
                .string()
                .optional()
                .describe('Swipe direction: UP, DOWN, LEFT, RIGHT (for swipe action)'),
              timeout: z
                .number()
                .optional()
                .describe('Timeout in milliseconds (for assertVisible, wait actions)'),
            }),
          )
          .describe('Array of flow steps to execute sequentially'),
        outputDir: z
          .string()
          .optional()
          .describe('Output directory for flow results and screenshots'),
      },
      async (args) => handleMaestroRunFlow(args),
    );

    this.server.tool(
      'maestro_run_yaml',
      'Run a Maestro flow from raw YAML content. For advanced users who want full control over the flow definition. Returns all captured screenshots as images.',
      {
        yaml: z.string().describe('Complete Maestro flow YAML content'),
        outputDir: z
          .string()
          .optional()
          .describe('Output directory for flow results and screenshots'),
      },
      async (args) => handleMaestroRunYaml(args),
    );

    this.server.tool(
      'maestro_status',
      'Check Maestro installation status, version, and list running iOS Simulators and Android Emulators.',
      {},
      async () => handleMaestroStatus(),
    );

    this.server.tool(
      'maestro_store_screenshot',
      'Create professional app store marketing screenshots with headline text and device-framed app screenshot. Uses Gemini AI to composite the image, then resizes to exact iOS/Android store dimensions. Can auto-capture screenshot from running simulator via Maestro, or accept an existing screenshot path.',
      {
        headline: z.string().describe('Marketing headline text to display above the app screenshot (e.g., "Your Photos, Perfectly Protected")'),
        screenshotPath: z.string().optional().describe('Path to existing screenshot image. If not provided, automatically captures from running simulator via Maestro.'),
        platform: z.enum(['ios', 'android', 'both']).optional().describe('Target platform for store screenshots (default: both)'),
        backgroundColor: z.string().optional().describe('Background color hex code (default: #FFFFFF)'),
        textColor: z.string().optional().describe('Headline text color hex code (default: #000000)'),
        devices: z.array(z.string()).optional().describe('Specific device sizes to generate. Options: iPhone_6.7, iPhone_6.5, iPhone_5.5, iPad_12.9, Phone, Tablet_7, Tablet_10. Default: required sizes only.'),
        model: z.string().optional().describe('Optional Gemini model override'),
        outputDir: z.string().optional().describe('Output directory for store screenshots (default: ~/app-publisher-assets/maestro/store_<timestamp>)'),
      },
      async (args) => handleMaestroStoreScreenshot(args),
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
