# App Publisher MCP

An MCP (Model Context Protocol) server built for **vibe coders** - generate app icons with AI, auto-resize for iOS/Android, and publish to app stores, all from your AI coding assistant.

Stop wasting time on Figma for app icons or manually resizing images for every screen density. Just describe what you want, and let AI handle the rest.

## What It Does

| Tool | Description |
|------|-------------|
| `generate_icon` | Generate app icons using Google Gemini AI |
| `resize_icons` | Auto-resize to all iOS & Android required sizes |
| `generate_splash` | Generate splash screen designs with AI |
| `generate_screenshot` | Generate app store screenshot mockups |
| `setup_fastlane` | Generate fastlane config with copyright, review info, and precheck settings |
| `populate_metadata` | Write store listing content directly to fastlane metadata files |
| `validate_metadata` | Validate metadata against App Store requirements (length limits, required fields) |
| `publish_ios` | Publish to App Store via fastlane |
| `publish_android` | Publish to Google Play via fastlane |
| `generate_store_listing` | Auto-generate store metadata + iOS age rating guide + App Privacy guide (4 languages) |
| `get_publishing_guide` | Step-by-step publishing guide (iOS 12 steps / Android 7 steps) |
| `configure_api_key` | Set your Gemini API key |
| `configure_model` | Choose AI model (speed vs quality) |
| `get_status` | Check current configuration |

### Maestro UI Testing & Store Screenshots

| Tool | Description |
|------|-------------|
| `setup_maestro` | Install and configure Maestro CLI for mobile UI testing |
| `maestro_screenshot` | Capture screenshot from running iOS Simulator / Android Emulator |
| `maestro_run_flow` | Run UI test flows with natural language steps |
| `maestro_run_yaml` | Run Maestro flows from raw YAML |
| `maestro_store_screenshot` | Create professional store screenshots with AI-generated headlines + device frames |
| `maestro_status` | Check Maestro installation and running devices |

## Quick Start

### 1. Install in Claude Code

```bash
claude mcp add app-publisher -- npx @seungmanchoi/app-publisher-mcp
```

Or with environment variables:

```bash
claude mcp add app-publisher \
  -e GEMINI_API_KEY=your_api_key_here \
  -e GEMINI_MODEL=gemini-2.5-flash-image \
  -- npx @seungmanchoi/app-publisher-mcp
```

### 2. Manual Configuration

Add to your Claude Code MCP config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "app-publisher": {
      "command": "npx",
      "args": ["@seungmanchoi/app-publisher-mcp"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here",
        "GEMINI_MODEL": "gemini-2.5-flash-image"
      }
    }
  }
}
```

### 3. Restart Claude Code

After adding the MCP server, restart Claude Code to connect.

## Getting Your API Keys

### Google Gemini API Key (Required)

The Gemini API key is needed for AI image generation (icons, splash screens, screenshots).

#### Step-by-Step

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Select a Google Cloud project (or create a new one)
5. Copy the generated API key (starts with `AIza...`)

#### Set the API Key

**Option A: Environment variable (recommended)**
```bash
claude mcp add app-publisher \
  -e GEMINI_API_KEY=AIzaSy... \
  -- npx @seungmanchoi/app-publisher-mcp
```

**Option B: Runtime configuration**
Once the MCP is connected, use the `configure_api_key` tool:
> "Set my Gemini API key to AIzaSy..."

**Option C: Config file**
The key is stored in `~/.app-publisher/config.json` and persists across sessions.

#### Pricing

| Model | Price per Image | Speed | Quality |
|-------|----------------|-------|---------|
| `gemini-2.5-flash-image` | ~$0.039 | 3-5 sec | Standard |
| `gemini-3-pro-image-preview` | ~$0.035 (4K: ~$0.24) | 10-15 sec | Best |

Google provides a free tier with generous limits for development. Check [Google AI pricing](https://ai.google.dev/pricing) for current rates.

### Apple App Store Connect (For iOS Publishing)

Required only if you want to publish to the App Store.

#### Step-by-Step

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Sign in with your Apple Developer account ($99/year membership required)
3. Go to **Users and Access** > **Integrations** > **App Store Connect API**
4. Click **"Generate API Key"**
5. Give it a name (e.g., "app-publisher-mcp")
6. Select **"Admin"** role
7. Download the `.p8` private key file (you can only download it once!)
8. Note down:
   - **Key ID** (e.g., `ABC1234567`)
   - **Issuer ID** (shown at the top of the page)

#### Using API Key in Fastlane

Place the `.p8` file in your project (e.g., `fastlane/keys/`) and add the API key block to your `Fastfile`:

```ruby
api_key = app_store_connect_api_key(
  key_id: "ABC1234567",
  issuer_id: "your-issuer-id-here",
  key_filepath: File.join(Dir.pwd, "keys", "AuthKey_ABC1234567.p8"),
  in_house: false
)

platform :ios do
  lane :release do
    deliver(
      api_key: api_key,
      # ... other options
    )
  end
end
```

> **Tip**: Add `fastlane/keys/*.p8` to `.gitignore` to avoid committing the private key. The `.p8` file can be deleted from Downloads after copying to your project.

#### Where to Get Apple Developer Account

1. Go to [Apple Developer Program](https://developer.apple.com/programs/)
2. Click **"Enroll"**
3. Sign in with your Apple ID
4. Pay $99/year membership fee
5. Wait for approval (usually 24-48 hours)

### Google Play Console (For Android Publishing)

Required only if you want to publish to Google Play.

#### Step-by-Step

1. Go to [Google Play Console](https://play.google.com/console/)
2. Sign in with your Google account (one-time $25 registration fee)
3. Go to **Setup** > **API access**
4. Click **"Link"** to connect to a Google Cloud project
5. Under **Service accounts**, click **"Create new service account"**
6. In Google Cloud Console:
   - Create a new service account
   - Name it (e.g., "app-publisher-mcp")
   - Grant role: **Service Account User**
7. Create a JSON key for the service account:
   - Go to **Keys** tab > **Add Key** > **Create new key** > **JSON**
   - Download the JSON key file
8. Back in Google Play Console:
   - Click **"Grant access"** next to the service account
   - Grant **"Release manager"** permission

#### Where to Get Google Play Developer Account

1. Go to [Google Play Console signup](https://play.google.com/console/signup)
2. Sign in with your Google account
3. Pay $25 one-time registration fee
4. Complete developer profile
5. Verify identity (may take a few days)

### Fastlane (For Store Publishing)

**Required** for `setup_fastlane`, `publish_ios`, `publish_android`, `populate_metadata`, and `validate_metadata` tools.

```bash
# macOS (recommended)
brew install fastlane

# or via Ruby
gem install fastlane
```

> **Note**: Age ratings and App Privacy settings must be configured directly in [App Store Connect](https://appstoreconnect.apple.com/) — fastlane does not support uploading these. Use the `generate_store_listing` tool to get a step-by-step guide for these settings.

## Usage Examples

### Generate an App Icon

> "Generate an app icon for a meditation app - a lotus flower with calm blue and purple gradient"

The AI will create a professional app icon and save it to `~/app-publisher-assets/`.

### Resize for All Platforms

> "Resize the icon at ~/app-publisher-assets/icon_xxx.png for both iOS and Android"

This generates:
- **iOS**: 15 sizes (20px ~ 1024px) + Xcode `Contents.json`
- **Android**: 6 sizes (mdpi ~ xxxhdpi) + Play Store 512x512

### Generate Store Screenshots

> "Generate a screenshot mockup for a fitness app showing a workout dashboard with progress charts"

### Set Up Fastlane

> "Set up fastlane for my project at ~/myapp with bundle ID com.example.myapp"

You can also provide review contact info and copyright:

> "Set up fastlane for ~/myapp with bundle ID com.example.myapp, app name 'My App', copyright '2026 John Doe', review contact email john@example.com"

This creates:
- `fastlane/Fastfile` - Build and deploy lanes with:
  - Auto-set copyright with current year
  - `app_review_information` block (prevents `No data` crash on new apps)
  - `precheck_include_in_app_purchases: false` (for API key auth)
  - `skip_app_version_update: true` for metadata-only uploads
- `fastlane/Appfile` - App configuration
- `fastlane/metadata/` - Store listing metadata structure (10 files per locale)

### Populate Metadata

After generating store listing content, write it directly to fastlane metadata files:

> "Populate fastlane metadata for ~/myapp with en-US name 'My App', description 'A great app...', and ko name '내 앱'"

This writes content to `fastlane/metadata/{locale}/{field}.txt` files. Supported fields: `name`, `subtitle`, `description`, `keywords`, `promotional_text`, `release_notes`, `privacy_url`, `support_url`, `marketing_url`, `copyright`.

### Validate Metadata

Check your metadata against App Store requirements before uploading:

> "Validate fastlane metadata for ~/myapp"

Checks:
- **Subtitle**: max 30 characters
- **Keywords**: max 100 characters
- **Required files**: `name.txt`, `description.txt`, `privacy_url.txt`, `support_url.txt`
- **Copyright**: must include current year

### Generate Store Listing Metadata

> "Generate store listing metadata for my project at ~/myapp"

Analyzes your project (package.json, app.json, README.md, CLAUDE.md, docs/) and generates:

**iOS (App Store Connect):**
- App name, subtitle, description, keywords
- Category recommendation
- Privacy policy content
- Review notes for App Review team
- **iOS Age Rating 7-Step Guide** - Auto-detects app capabilities (ads, UGC, chat, web access, gambling, health content, violence, etc.) and generates complete answers for all 7 steps of the App Store Connect age rating questionnaire
- **App Privacy Data Guide** - Auto-detects data collection based on dependencies (AdMob, analytics, auth, IAP, etc.) and generates complete answers for the App Store Connect "Trust & Safety > App Privacy" questionnaire, including data types, usage purposes, identity linkage, and tracking status

**Android (Google Play Console):**
- App title, short/full description
- Category recommendation
- Content rating guide
- Privacy policy content

**4 Languages Supported:**
- Korean (ko), English (en), Japanese (ja), Chinese Simplified (zh)

You can specify platform and language:
> "Generate iOS store listing in Korean for ~/myapp"
> "Generate store listing in Japanese for ~/myapp"
> "Generate store listing in Chinese for ~/myapp"

### Get Publishing Guide

> "Show me the iOS publishing guide for my project at ~/myapp"

Returns a detailed step-by-step guide customized with your project info:

- **iOS**: 12 steps (Developer account → TestFlight)
- **Android**: 7 steps (Play Console → Release management)
- Auto-detects framework (Expo, React Native, Flutter, Native)
- Includes actual build commands for your framework

### Maestro UI Testing

Maestro is a mobile UI testing framework that lets you automate interactions with your app on simulators and emulators.

#### Setup

> "Set up Maestro for UI testing"

This will check Java 17+ and install Maestro CLI automatically.

#### Take a Screenshot

> "Take a screenshot of my running app"

Captures the current screen from the running iOS Simulator or Android Emulator.

#### Run UI Test Flow

> "Run a UI flow on com.myapp: launch the app, tap on 'Login', input 'test@email.com' into the email field, take a screenshot"

Converts natural language steps into a Maestro flow and executes it. Available actions: `launchApp`, `tapOn`, `inputText`, `swipe`, `scroll`, `assertVisible`, `takeScreenshot`, `back`, `home`, and more.

#### Create Store Marketing Screenshots

> "Create a store screenshot with headline 'Your Photos, Perfectly Protected' using the screenshot at ~/screenshot.png for both iOS and Android"

Or auto-capture from the running simulator:

> "Create a store screenshot with headline 'Track Your Habits' for iOS"

This:
1. Captures a screenshot from the simulator (or uses the provided image)
2. Uses Gemini AI to composite the screenshot with a headline and device frame
3. Resizes to exact store dimensions for each platform

**iOS Store Sizes:**

| Device | Dimensions |
|--------|-----------|
| iPhone 6.7" (required) | 1284 x 2778 |
| iPhone 6.5" (required) | 1242 x 2688 |
| iPhone 5.5" | 1242 x 2208 |
| iPad 12.9" | 2048 x 2732 |

**Android Store Sizes:**

| Device | Dimensions |
|--------|-----------|
| Phone (required) | 1080 x 1920 |
| Tablet 7" | 1200 x 1920 |
| Tablet 10" | 1920 x 1200 |

You can customize background color, text color, and select specific device sizes:

> "Create a store screenshot with headline 'Beautiful Design' on black background with white text, for iPhone 6.7 and Phone only"

### Publish to Stores

> "Publish my iOS app to the App Store. Project is at ~/myapp"

> "Publish my Android app to the internal testing track"

## Generated Icon Sizes

### iOS (15 icons + Contents.json)

| Usage | Sizes |
|-------|-------|
| Notification | 20@2x (40px), 20@3x (60px) |
| Settings | 29@2x (58px), 29@3x (87px) |
| Spotlight | 40@2x (80px), 40@3x (120px) |
| App | 60@2x (120px), 60@3x (180px) |
| iPad | 20, 29, 40, 76, 76@2x (152px), 83.5@2x (167px) |
| App Store | 1024x1024 |

The generated `Contents.json` is fully compatible with Xcode - just drag the `AppIcon.appiconset` folder into your asset catalog.

### Android (6 icons)

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48 | mipmap-mdpi |
| hdpi | 72x72 | mipmap-hdpi |
| xhdpi | 96x96 | mipmap-xhdpi |
| xxhdpi | 144x144 | mipmap-xxhdpi |
| xxxhdpi | 192x192 | mipmap-xxxhdpi |
| Play Store | 512x512 | - |

## AI Model Selection

| Model | Best For | Speed | Quality |
|-------|----------|-------|---------|
| `gemini-2.5-flash-image` | Rapid prototyping, iteration | Fast (3-5s) | Good |
| `gemini-3-pro-image-preview` | Final assets, 4K output | Slower (10-15s) | Best |

Set your preferred model:
> "Set the model to gemini-3-pro-image-preview"

Or use environment variable:
```bash
GEMINI_MODEL=gemini-3-pro-image-preview
```

## Configuration Priority

Settings are resolved in this order (highest priority first):

1. **Per-request parameter** - `model` parameter in tool calls
2. **Environment variable** - `GEMINI_API_KEY`, `GEMINI_MODEL`
3. **Config file** - `~/.app-publisher/config.json`
4. **Default** - `gemini-2.5-flash-image`

## Vibe Coding Workflow

This MCP is designed for the vibe coding workflow - build your app with AI, then ship it:

```
1. Build your app with Claude Code
2. "Generate an icon for my app" → AI creates the icon
3. "Resize it for iOS and Android" → All sizes generated
4. "Set up Maestro and take a screenshot of my app" → Live app capture
5. "Create store screenshots with headline 'Your App, Reimagined'" → Marketing-ready images
6. "Generate store listing for my project" → All metadata ready
7. "Set up fastlane for my project" → Fastlane configured with review info & copyright
8. "Populate fastlane metadata" → Store listing written to metadata files
9. "Validate metadata" → Check before uploading
10. "Show me the iOS publishing guide" → Step-by-step instructions
11. "Publish to App Store" → App goes to stores
```

No design skills needed. No Figma. No manual resizing. Just vibe and ship.

## Troubleshooting

### "Gemini API key not configured"
Set your API key using one of the methods described in [Getting Your API Keys](#google-gemini-api-key-required).

### "This model only supports text output"
The model you're using doesn't support image generation. Switch to `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`.

### "fastlane is not installed"
Install fastlane: `brew install fastlane` (macOS) or `gem install fastlane` (Ruby).

### Icon looks wrong at small sizes
Try a simpler icon design. Complex designs don't work well at 20x20 or 29x29 pixels. Use bold shapes and minimal detail.

### "Maestro not available"
Maestro requires Java 17+. Install Java first, then run the `setup_maestro` tool:
```bash
brew install openjdk@17
```

### "No running simulator or emulator"
Start an iOS Simulator or Android Emulator before using Maestro tools:
```bash
# iOS
open -a Simulator

# Android
emulator -avd <avd_name>
```

### MCP not connecting
1. Restart Claude Code after adding the MCP server
2. Check the server config in `~/.claude.json`
3. Verify Node.js is installed: `node --version`

## Development

```bash
git clone https://github.com/seungmanchoi/app-publisher-mcp.git
cd app-publisher-mcp
npm install
npm run build
npm run lint
```

## License

MIT
