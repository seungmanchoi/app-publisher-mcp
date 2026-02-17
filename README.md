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
| `setup_fastlane` | Generate fastlane config for store publishing |
| `publish_ios` | Publish to App Store via fastlane |
| `publish_android` | Publish to Google Play via fastlane |
| `generate_store_listing` | Auto-generate App Store / Google Play metadata from project |
| `get_publishing_guide` | Step-by-step publishing guide (iOS 12 steps / Android 7 steps) |
| `configure_api_key` | Set your Gemini API key |
| `configure_model` | Choose AI model (speed vs quality) |
| `get_status` | Check current configuration |

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

Required only if you want to use the `publish_ios` or `publish_android` tools.

```bash
# macOS
brew install fastlane

# or via Ruby
gem install fastlane
```

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

This creates:
- `fastlane/Fastfile` - Build and deploy lanes
- `fastlane/Appfile` - App configuration
- `fastlane/metadata/` - Store listing metadata structure

### Generate Store Listing Metadata

> "Generate store listing metadata for my project at ~/myapp"

Analyzes your project (package.json, app.json, README.md, etc.) and generates:

**iOS (App Store Connect):**
- App name, subtitle, description, keywords
- Category recommendation
- Privacy policy content
- Review notes for App Review team

**Android (Google Play Console):**
- App title, short/full description
- Category recommendation
- Content rating guide
- Privacy policy content

You can specify platform and language:
> "Generate iOS store listing in Korean for ~/myapp"

### Get Publishing Guide

> "Show me the iOS publishing guide for my project at ~/myapp"

Returns a detailed step-by-step guide customized with your project info:

- **iOS**: 12 steps (Developer account → TestFlight)
- **Android**: 7 steps (Play Console → Release management)
- Auto-detects framework (Expo, React Native, Flutter, Native)
- Includes actual build commands for your framework

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
4. "Generate store listing for my project" → All metadata ready
5. "Show me the iOS publishing guide" → Step-by-step instructions
6. "Set up fastlane and publish" → App goes to stores
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
