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

### Google Play Store

| Tool | Description |
|------|-------------|
| `configure_playstore` | Configure Google Play API with service account JSON key (file path or inline data) |
| `playstore_status` | Check Play Store API configuration and service account status |
| `playstore_setup_key` | Full Android publishing setup: copy key, create Appfile/Fastfile, metadata structure |
| `playstore_verify_access` | Verify service account has API access to a specific app |
| `playstore_get_app_info` | Get comprehensive app info: all listings + all release tracks |
| `playstore_get_listing` | Get store listing(s) - all languages or a specific language |
| `playstore_update_listing` | Update title, short description, full description for a language |
| `playstore_get_tracks` | List release tracks with version codes, status, release notes |
| `playstore_list_images` | List uploaded screenshots/images for a language and type |
| `playstore_upload_image` | Upload screenshot, icon, or feature graphic (PNG/JPEG/WebP) |
| `playstore_delete_images` | Delete all images of a specific type for a language |

### AdMob Integration

| Tool | Description |
|------|-------------|
| `configure_admob` | Set up Google AdMob OAuth credentials and get authorization URL |
| `admob_auth` | Complete OAuth flow by exchanging authorization code for tokens |
| `admob_list_apps` | List all apps registered in your AdMob account |
| `admob_create_app` | Create a new app in AdMob (link to store or manual) * |
| `admob_list_ad_units` | List existing ad units (optionally filter by app) |
| `admob_create_ad_unit` | Create a new ad unit (Banner, Interstitial, Rewarded, App Open, Native) * |
| `admob_integrate` | Generate React Native ad components and configuration for your project |
| `admob_status` | Check AdMob OAuth configuration and authentication status |

> **\* Limited Access**: `admob_create_app` and `admob_create_ad_unit` use the AdMob API v1beta create methods, which have **restricted access by Google**. Most accounts will receive a 403 Permission Denied error. To use these, you must request access from your Google account manager. As an alternative, create apps and ad units directly in the [AdMob console](https://admob.google.com), then use `admob_list_apps`, `admob_list_ad_units`, and `admob_integrate` to generate integration code for your project.

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

### Google AdMob OAuth Credentials (For Ad Management)

Required for creating and managing ad units via the AdMob API.

#### Step-by-Step

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **AdMob API**:
   - Go to **APIs & Services** > **Library**
   - Search for "AdMob API"
   - Click **Enable**
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **"Create Credentials"** > **"OAuth client ID"**
   - Application type: **Desktop app**
   - Name it (e.g., "app-publisher-mcp")
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**

> **Note**: If prompted, configure the OAuth consent screen first (External type is fine for personal use). Add the scopes `admob.monetization` and `admob.readonly`.

#### Set Up AdMob in MCP

```
1. "Configure AdMob with client ID xxx and secret yyy"
   → Stores credentials and returns an authorization URL

2. Open the URL in your browser and sign in with your Google account
   → Grant access and copy the authorization code

3. "Authenticate AdMob with code xxxx"
   → Exchanges code for tokens (stored in ~/.app-publisher/config.json)

4. "List my AdMob apps"
   → Verify connection works
```

#### Where to Get AdMob Account

1. Go to [Google AdMob](https://admob.google.com/home/)
2. Sign in with your Google account
3. Accept the terms of service
4. Create your first app or link an existing one

> **Important**: AdMob credentials are stored locally in `~/.app-publisher/config.json`. The refresh token is used to automatically renew access tokens.

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

#### Step 1: Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Play Android Developer API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google Play Android Developer API"
   - Click **Enable**
4. Create a Service Account:
   - Go to **IAM & Admin** > **Service Accounts**
   - Click **"Create Service Account"**
   - Name: `Play Store Deploy` (or any name)
   - ID: `play-store-deploy`
   - Description: `Service account for Google Play Store publishing via fastlane`
   - Skip role assignment (not needed, permissions are set in Play Console)
5. Create a JSON key:
   - Click the service account > **Keys** tab > **Add Key** > **Create new key** > **JSON**
   - Download the JSON key file
   - Note the **service account email** (e.g., `play-store-deploy@project-id.iam.gserviceaccount.com`)

#### Step 2: Grant Access in Google Play Console

> **Important**: The "API access" menu may not be visible in some accounts. Use the "Users and permissions" method instead.

**Method A: Via API Access (if available)**
1. Go to [Google Play Console](https://play.google.com/console/) > **Settings** > **API access**
2. Link your Google Cloud project
3. Grant access to the service account

**Method B: Via Users and Permissions (recommended)**
1. Go to [Google Play Console](https://play.google.com/console/) > **Users and permissions**
2. Click **"Invite new users"**
3. Enter the **service account email** from Step 1
4. Set permissions:
   - **Release management** (manage production, testing tracks)
   - **Edit store listing** (update metadata, screenshots)
5. Click **"Invite user"**

> **Note**: It may take up to 24 hours for permissions to fully propagate.

#### Step 3: Configure in MCP

**Option A: File path (key file stays on disk)**
```
"Configure Play Store with JSON key at ~/Downloads/my-service-account.json for project ~/works/my-app"
```
This validates the key, copies it to `fastlane/keys/`, updates Appfile, and adds to .gitignore.

**Option B: Inline JSON (store in config, delete original file)**
```
"Configure Play Store with inline JSON key data: { ... }"
```
The JSON content is stored in `~/.app-publisher/config.json`. You can safely delete the original key file after configuration. When deploying to a project, the key is written from config to `fastlane/keys/`.

**Option C: Using playstore_setup_key tool**
```
"Set up Play Store publishing for ~/works/my-app with JSON key ~/Downloads/my-key.json and package name com.example.myapp"
```
This creates the full fastlane Android setup including metadata directory structure.

**Option C: Manual setup**

Place the JSON key file in your project (e.g., `fastlane/keys/`) and reference it in `Appfile`:

```ruby
# fastlane/Appfile
json_key_file("fastlane/keys/play-store-service-account.json")
package_name("com.example.myapp")
```

Then use fastlane supply to upload:

```bash
# Upload to production
fastlane android release aab:"path/to/app.aab"

# Upload to internal testing
fastlane android internal aab:"path/to/app.aab"

# Upload metadata only
fastlane android metadata
```

> **Tip**: Add `fastlane/keys/*.json` to `.gitignore` to avoid committing the service account key.

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

### AdMob Integration

#### Set Up AdMob

> "Configure AdMob with client ID 123456.apps.googleusercontent.com and secret GOCSPX-xxx"

This stores your OAuth credentials and provides an authorization URL. Visit the URL, sign in, and copy the auth code.

> "Authenticate AdMob with code 4/0AY0e-xxx"

#### Create Ad Units

> "List my AdMob apps"

> "Create a banner ad unit named 'Home Banner' for app ca-app-pub-xxxxx~yyyyy"

> "Create a rewarded ad unit named 'Level Complete' for app ca-app-pub-xxxxx~yyyyy"

Supported formats: `BANNER`, `INTERSTITIAL`, `REWARDED`, `REWARDED_INTERSTITIAL`, `APP_OPEN`, `NATIVE`

#### Generate Integration Code

> "Integrate AdMob into my project at ~/myapp with the ad units I just created"

This generates:
- **Ad components** in `src/features/ads/` (Banner, Interstitial, Rewarded, AppOpen)
- **Test ID support** — automatically uses test ads in `__DEV__` mode
- **app.json configuration** for `react-native-google-mobile-ads`
- **ATT (App Tracking Transparency)** setup instructions for iOS

Each generated component is ready to use:
```tsx
import { AdHomeBanner } from '@features/ads';

// In your screen
<AdHomeBanner />
```

#### Complete AdMob Workflow

```
1. "Configure AdMob with client ID and secret"
2. Visit auth URL → Copy code
3. "Authenticate AdMob with code xxxx"
4. "List my AdMob apps"
5. "Create a banner ad unit for my app"
6. "Integrate AdMob into my project at ~/myapp"
7. Import and use the generated components
```

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
4. "Set up AdMob and create ad units" → Monetization ready
5. "Integrate AdMob into my project" → Ad components generated
6. "Set up Maestro and take a screenshot of my app" → Live app capture
7. "Create store screenshots with headline 'Your App, Reimagined'" → Marketing-ready images
8. "Generate store listing for my project" → All metadata ready
9. "Set up fastlane for my project" → Fastlane configured with review info & copyright
10. "Populate fastlane metadata" → Store listing written to metadata files
11. "Validate metadata" → Check before uploading
12. "Show me the iOS publishing guide" → Step-by-step instructions
13. "Publish to App Store" → App goes to stores
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

### "AdMob not authenticated"
Run `configure_admob` with your OAuth client ID and secret, then complete the auth flow with `admob_auth`. Credentials are stored in `~/.app-publisher/config.json`.

### "AdMob API error (403)" on create operations
The AdMob API v1beta **create methods** (`accounts.apps.create`, `accounts.adUnits.create`) have **limited access**. According to Google's documentation: *"This method has limited access. If you see a 403 permission denied error, please reach out to your account manager for access."* Listing and reading operations work normally. Create apps and ad units in the [AdMob console](https://admob.google.com) instead, then use MCP tools to list and integrate them.

### "AdMob API error (403)" on read operations
Ensure:
1. The AdMob API is enabled in your Google Cloud project
2. Your OAuth consent screen has the required scopes (`admob.monetization`, `admob.readonly`)
3. Your AdMob account is active at [admob.google.com](https://admob.google.com)

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
