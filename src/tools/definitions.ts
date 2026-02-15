export const TOOL_DEFINITIONS = [
  {
    name: 'configure_api_key',
    description: 'Set or update the Gemini API key for AI image generation. The key is stored locally and persists across sessions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        apiKey: {
          type: 'string',
          description: 'Your Google Gemini API key (get one at https://aistudio.google.com/apikey)',
        },
      },
      required: ['apiKey'],
    },
  },
  {
    name: 'configure_model',
    description: 'Set the default Gemini model for image generation. Persists across sessions. Recommended: gemini-2.5-flash-image (fast), gemini-3-pro-image-preview (best quality).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        model: {
          type: 'string',
          description: 'Gemini model ID (e.g., gemini-2.5-flash-image, gemini-3-pro-image-preview)',
        },
      },
      required: ['model'],
    },
  },
  {
    name: 'generate_icon',
    description: 'Generate an app icon using AI. Creates a square icon suitable for mobile app stores. Returns the generated image and saves it to disk.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the app icon to generate (e.g., "a minimalist camera icon with blue gradient")',
        },
        model: {
          type: 'string',
          description: 'Optional Gemini model override for this request',
        },
        outputDir: {
          type: 'string',
          description: 'Optional output directory (default: ~/app-publisher-assets)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'resize_icons',
    description: 'Resize an icon image to all required sizes for iOS and/or Android platforms. Generates Xcode-compatible Contents.json for iOS. Source image should be at least 1024x1024.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Path to the source icon image (square, at least 1024x1024 recommended)',
        },
        outputDir: {
          type: 'string',
          description: 'Output directory for resized icons',
        },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['ios', 'android'] },
          description: 'Target platforms (default: both ios and android)',
        },
      },
      required: ['sourcePath', 'outputDir'],
    },
  },
  {
    name: 'generate_splash',
    description: 'Generate a splash screen (launch screen) design using AI. Creates a professional app launch screen image.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the splash screen to generate',
        },
        model: {
          type: 'string',
          description: 'Optional Gemini model override for this request',
        },
        outputDir: {
          type: 'string',
          description: 'Optional output directory (default: ~/app-publisher-assets)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generate_screenshot',
    description: 'Generate an app store screenshot mockup using AI. Creates realistic app screenshots for store listings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the screenshot to generate (e.g., "a fitness tracking dashboard showing workout stats")',
        },
        model: {
          type: 'string',
          description: 'Optional Gemini model override for this request',
        },
        outputDir: {
          type: 'string',
          description: 'Optional output directory (default: ~/app-publisher-assets)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'setup_fastlane',
    description: 'Generate fastlane configuration files (Fastfile, Appfile, metadata structure) for automated iOS/Android app publishing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the app project directory',
        },
        appIdentifier: {
          type: 'string',
          description: 'App bundle identifier (e.g., com.example.myapp)',
        },
        appName: {
          type: 'string',
          description: 'App display name',
        },
        teamId: {
          type: 'string',
          description: 'Apple Developer Team ID (for iOS)',
        },
        itunesConnectTeamId: {
          type: 'string',
          description: 'App Store Connect Team ID (for iOS, if different from teamId)',
        },
        jsonKeyFile: {
          type: 'string',
          description: 'Path to Google Play Console JSON key file (for Android)',
        },
        packageName: {
          type: 'string',
          description: 'Android package name (if different from appIdentifier)',
        },
      },
      required: ['projectDir', 'appIdentifier', 'appName'],
    },
  },
  {
    name: 'publish_ios',
    description: 'Publish the app to the iOS App Store using fastlane deliver. Requires fastlane to be installed and configured.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the app project directory (must contain fastlane/ directory)',
        },
        ipaPath: {
          type: 'string',
          description: 'Path to the IPA file to upload',
        },
        submitForReview: {
          type: 'boolean',
          description: 'Whether to submit for Apple review after upload (default: false)',
        },
      },
      required: ['projectDir'],
    },
  },
  {
    name: 'publish_android',
    description: 'Publish the app to Google Play Store using fastlane supply. Requires fastlane to be installed and configured.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the app project directory (must contain fastlane/ directory)',
        },
        aabPath: {
          type: 'string',
          description: 'Path to the AAB (Android App Bundle) file to upload',
        },
        track: {
          type: 'string',
          enum: ['internal', 'alpha', 'beta', 'production'],
          description: 'Release track (default: production)',
        },
      },
      required: ['projectDir'],
    },
  },
  {
    name: 'get_status',
    description: 'Check the current configuration status including API key, model, fastlane installation, and generated assets.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];
