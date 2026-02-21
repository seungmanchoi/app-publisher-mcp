import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { settingsManager } from '../config/index.js';
import { geminiService, iconResizerService, fastlaneService, maestroService } from '../services/index.js';
import {
  IProjectInfo,
  IStoreListingArgs,
  IPublishingGuideArgs,
  TFramework,
  TLanguage,
} from '../types/index.js';

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'app-publisher-assets');

export async function handleConfigureApiKey(args: { apiKey: string }): Promise<CallToolResult> {
  settingsManager.setApiKey(args.apiKey);
  const maskedKey = args.apiKey.substring(0, 8) + '...' + args.apiKey.substring(args.apiKey.length - 4);
  return {
    content: [{ type: 'text', text: `API key configured: ${maskedKey}` }],
  };
}

export async function handleConfigureModel(args: { model: string }): Promise<CallToolResult> {
  settingsManager.setModel(args.model);
  return {
    content: [{ type: 'text', text: `Model set to: ${args.model}` }],
  };
}

export async function handleGenerateIcon(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateIcon(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleResizeIcons(args: {
  sourcePath: string;
  outputDir: string;
  platforms?: ('ios' | 'android')[];
}): Promise<CallToolResult> {
  const platforms = args.platforms ?? ['ios', 'android'];
  const results = await iconResizerService.resizeForAllPlatforms(
    args.sourcePath,
    args.outputDir,
    platforms,
  );

  const iosCount = results.filter((r) => r.platform === 'ios').length;
  const androidCount = results.filter((r) => r.platform === 'android').length;

  let summary = `=== Icon Resize Complete ===\n\n`;
  summary += `Total: ${results.length} icons generated\n`;

  if (iosCount > 0) {
    summary += `\niOS (${iosCount} icons):\n`;
    summary += `  Output: ${path.join(args.outputDir, 'ios', 'AppIcon.appiconset')}\n`;
    summary += `  Contents.json: Generated (Xcode-compatible)\n`;
    summary += `  Sizes: 20px ~ 1024px\n`;
  }

  if (androidCount > 0) {
    summary += `\nAndroid (${androidCount} icons):\n`;
    summary += `  Output: ${path.join(args.outputDir, 'android')}\n`;
    summary += `  Densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi\n`;
    summary += `  Play Store: 512x512\n`;
  }

  summary += `\nAll Icons:\n`;
  for (const r of results) {
    summary += `  [${r.platform}] ${r.name} (${r.size}x${r.size}) → ${r.path}\n`;
  }

  return { content: [{ type: 'text', text: summary }] };
}

export async function handleGenerateSplash(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateSplash(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleGenerateScreenshot(args: {
  prompt: string;
  model?: string;
  outputDir?: string;
}): Promise<CallToolResult> {
  const outputDir = args.outputDir ?? DEFAULT_OUTPUT_DIR;
  const result = await geminiService.generateScreenshot(args.prompt, outputDir, args.model);
  return { content: result.content };
}

export async function handleSetupFastlane(args: {
  projectDir: string;
  appIdentifier: string;
  appName: string;
  teamId?: string;
  itunesConnectTeamId?: string;
  jsonKeyFile?: string;
  packageName?: string;
}): Promise<CallToolResult> {
  const createdFiles = fastlaneService.setupFastlane({
    projectDir: args.projectDir,
    appIdentifier: args.appIdentifier,
    appName: args.appName,
    teamId: args.teamId,
    itunesConnectTeamId: args.itunesConnectTeamId,
    jsonKeyFile: args.jsonKeyFile,
    packageName: args.packageName,
  });

  let summary = `=== Fastlane Setup Complete ===\n\n`;
  summary += `Project: ${args.projectDir}\n`;
  summary += `App: ${args.appName} (${args.appIdentifier})\n\n`;
  summary += `Created files:\n`;
  for (const file of createdFiles) {
    summary += `  - ${file}\n`;
  }
  summary += `\nNext steps:\n`;
  summary += `  1. Fill in metadata files in fastlane/metadata/\n`;
  summary += `  2. Run 'fastlane ios release' to publish to App Store\n`;
  summary += `  3. Run 'fastlane android release' to publish to Google Play\n`;

  if (!fastlaneService.checkInstalled()) {
    summary += `\n⚠️  fastlane is not installed. Install with: brew install fastlane\n`;
  }

  return { content: [{ type: 'text', text: summary }] };
}

export async function handlePublishIOS(args: {
  projectDir: string;
  ipaPath?: string;
  submitForReview?: boolean;
}): Promise<CallToolResult> {
  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) {
    return {
      content: [{
        type: 'text',
        text: 'Error: fastlane directory not found. Run setup_fastlane first.',
      }],
    };
  }

  const result = fastlaneService.publishIOS(args.projectDir, {
    ipaPath: args.ipaPath,
    submitForReview: args.submitForReview,
  });

  return { content: [{ type: 'text', text: result }] };
}

export async function handlePublishAndroid(args: {
  projectDir: string;
  aabPath?: string;
  track?: string;
}): Promise<CallToolResult> {
  const fastlaneDir = path.join(args.projectDir, 'fastlane');
  if (!fs.existsSync(fastlaneDir)) {
    return {
      content: [{
        type: 'text',
        text: 'Error: fastlane directory not found. Run setup_fastlane first.',
      }],
    };
  }

  const result = fastlaneService.publishAndroid(args.projectDir, {
    aabPath: args.aabPath,
    track: args.track,
  });

  return { content: [{ type: 'text', text: result }] };
}

export async function handleGetStatus(): Promise<CallToolResult> {
  const isConfigured = settingsManager.isConfigured();
  const configSource = settingsManager.getConfigSource();
  const apiKey = settingsManager.getApiKey();
  const model = settingsManager.getModel();
  const fastlaneInstalled = fastlaneService.checkInstalled();
  const maestroInstalled = maestroService.checkInstalled();

  const maskedKey = isConfigured
    ? apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
    : 'Not configured';

  let status = `=== App Publisher MCP Status ===\n\n`;
  status += `Gemini API Key: ${maskedKey} (source: ${configSource})\n`;
  status += `Gemini Model: ${model}\n`;
  status += `Fastlane: ${fastlaneInstalled ? 'Installed' : 'Not installed'}\n`;
  status += `Maestro: ${maestroInstalled ? `Installed (${maestroService.getVersion()})` : 'Not installed'}\n`;
  status += `Output Directory: ${DEFAULT_OUTPUT_DIR}\n`;

  if (maestroInstalled) {
    const devices = maestroService.getBootedDevices();
    status += `Running Simulators: ${devices.ios.length} iOS, ${devices.android.length} Android\n`;
  }

  if (fs.existsSync(DEFAULT_OUTPUT_DIR)) {
    const files = fs.readdirSync(DEFAULT_OUTPUT_DIR);
    status += `Generated Assets: ${files.length} files\n`;
  } else {
    status += `Generated Assets: None\n`;
  }

  return { content: [{ type: 'text', text: status }] };
}

// ============================================================
// Store Listing & Publishing Guide Handlers
// ============================================================

function readFileIfExists(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // ignore
  }
  return null;
}

function readJsonIfExists(filePath: string): Record<string, unknown> | null {
  const content = readFileIfExists(filePath);
  if (content) {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      // ignore
    }
  }
  return null;
}

function detectFramework(projectDir: string): TFramework {
  const packageJson = readJsonIfExists(path.join(projectDir, 'package.json'));
  if (!packageJson) return 'native';

  const deps = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined),
  };

  if (deps['expo'] || deps['expo-router']) return 'expo';
  if (deps['react-native']) return 'react-native';

  // Check for Flutter
  if (fs.existsSync(path.join(projectDir, 'pubspec.yaml'))) return 'flutter';

  return 'native';
}

function extractProjectInfo(projectDir: string): IProjectInfo {
  const packageJson = readJsonIfExists(path.join(projectDir, 'package.json'));
  const appJson = readJsonIfExists(path.join(projectDir, 'app.json'));
  const readme = readFileIfExists(path.join(projectDir, 'README.md'));
  const claudeMd = readFileIfExists(path.join(projectDir, 'CLAUDE.md'));

  // Collect docs/*.md files
  const docsContent: string[] = [];
  const docsDir = path.join(projectDir, 'docs');
  if (fs.existsSync(docsDir)) {
    try {
      const docFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
      for (const docFile of docFiles) {
        const content = readFileIfExists(path.join(docsDir, docFile));
        if (content) docsContent.push(content);
      }
    } catch {
      // ignore
    }
  }

  const framework = detectFramework(projectDir);

  // Extract app name
  const expoConfig = appJson?.expo as Record<string, unknown> | undefined;
  const appName =
    (expoConfig?.name as string) ??
    (appJson?.name as string) ??
    (packageJson?.name as string) ??
    path.basename(projectDir);

  // Extract bundle ID
  const iosBundleId = (expoConfig?.ios as Record<string, unknown> | undefined)?.bundleIdentifier as
    | string
    | undefined;
  const androidPackage = (expoConfig?.android as Record<string, unknown> | undefined)
    ?.package as string | undefined;
  const bundleId = iosBundleId ?? androidPackage ?? `com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Extract version
  const version =
    (expoConfig?.version as string) ?? (packageJson?.version as string) ?? '1.0.0';

  // Extract description
  const description =
    (packageJson?.description as string) ?? (expoConfig?.description as string) ?? '';

  // Extract features from README and CLAUDE.md
  const features: string[] = [];
  const allDocs = [readme, claudeMd, ...docsContent].filter(Boolean).join('\n');

  // Tech stack terms to filter out
  const techStackTerms = [
    'react native', 'expo', 'typescript', 'zustand', 'mmkv', 'nativewind',
    'reanimated', 'expo-', 'react-native-', 'strict mode', 'i18next',
    'file-based', 'state management', 'local storage', 'styling',
    'animation framework', 'svg rendering', 'routing', 'tailwind',
    'webpack', 'babel', 'eslint', 'prettier', 'jest', 'npm',
    'node.js', 'fastlane', 'cocoapods', 'gradle', 'xcode',
    'react-i18next', 'expo router', 'expo go', 'eas build',
  ];

  // Architecture terms to filter out
  const archTerms = [
    'fsd', 'feature-sliced', 'barrel export', 'dependency rule',
    'upper layers', 'layered architecture', 'public api', 'index.ts',
    'import', 'module structure', 'convention', 'alias',
  ];

  // Feature section headers to look for
  const featureSectionPatterns = [
    /^#{1,3}\s*(?:features|key features|main features|app features|주요\s*기능|기능|핵심\s*기능)/im,
    /^(?:features|key features|주요\s*기능|기능)\s*$/im,
  ];

  // Try to extract features from specific "Features" sections first
  let featureLines: string[] = [];
  const docLines = allDocs.split('\n');

  let inFeatureSection = false;
  for (let i = 0; i < docLines.length; i++) {
    const line = docLines[i];

    // Check if entering a feature section
    if (featureSectionPatterns.some((p) => p.test(line.trim()))) {
      inFeatureSection = true;
      continue;
    }

    // Check if leaving the feature section (next header)
    if (inFeatureSection && /^#{1,3}\s+\S/.test(line) && !featureSectionPatterns.some((p) => p.test(line.trim()))) {
      inFeatureSection = false;
      continue;
    }

    if (inFeatureSection) {
      const match = line.match(/^[\s]*[-*]\s+(.+)/);
      if (match) {
        featureLines.push(match[1].trim());
      }
    }
  }

  // If no feature section found, fall back to general bullet extraction but still filter
  if (featureLines.length === 0) {
    const allBullets = allDocs.match(/^[\s]*[-*]\s+.+/gm) ?? [];
    featureLines = allBullets.map((l) => l.replace(/^[\s]*[-*]\s+/, '').trim());
  }

  // Filter out tech stack and architecture lines
  for (const line of featureLines.slice(0, 50)) {
    const cleaned = line.replace(/^\*\*(.+?)\*\*.*/, '$1: ').replace(/^\*\*(.+?)\*\*/, '$1').trim();
    if (cleaned.length <= 5 || cleaned.length >= 200) continue;

    const lowerLine = cleaned.toLowerCase();

    // Skip tech stack items
    if (techStackTerms.some((term) => lowerLine.includes(term))) continue;

    // Skip architecture items
    if (archTerms.some((term) => lowerLine.includes(term))) continue;

    // Skip lines that look like code/config references
    if (/^[`"']/.test(cleaned) || /\.(ts|js|json|md|yaml|yml)/.test(cleaned)) continue;

    // Skip lines that are primarily about dev tools or build systems
    if (/^(framework|routing|state|storage|styling|animation|svg|sensors|i18n|typescript)\s*:/i.test(cleaned)) continue;

    features.push(cleaned);
    if (features.length >= 30) break;
  }

  // Extract dependencies
  const deps = {
    ...(packageJson?.dependencies as Record<string, string> | undefined),
    ...(packageJson?.devDependencies as Record<string, string> | undefined),
  };
  const depNames = Object.keys(deps ?? {});

  // Detect permissions
  const permissions: string[] = [];
  const iosInfoPlist = (expoConfig?.ios as Record<string, unknown> | undefined)?.infoPlist as
    | Record<string, unknown>
    | undefined;
  if (iosInfoPlist) {
    for (const key of Object.keys(iosInfoPlist)) {
      if (key.includes('Usage')) {
        permissions.push(key);
      }
    }
  }
  const androidPermissions = (
    expoConfig?.android as Record<string, unknown> | undefined
  )?.permissions as string[] | undefined;
  if (androidPermissions) {
    permissions.push(...androidPermissions);
  }

  // Detect capabilities
  const hasAds = depNames.some(
    (d) =>
      d.includes('admob') ||
      d.includes('google-mobile-ads') ||
      d.includes('ads') ||
      d.includes('expo-ads'),
  );
  const hasAnalytics = depNames.some(
    (d) =>
      d.includes('analytics') ||
      d.includes('firebase') ||
      d.includes('sentry') ||
      d.includes('amplitude'),
  );
  const hasInAppPurchase = depNames.some(
    (d) =>
      d.includes('purchase') ||
      d.includes('iap') ||
      d.includes('billing') ||
      d.includes('revenue-cat') ||
      d.includes('revenuecat'),
  );
  const hasUserAuth = depNames.some(
    (d) =>
      d.includes('auth') ||
      d.includes('firebase') ||
      d.includes('supabase') ||
      d.includes('clerk'),
  );

  // Detect WebView usage
  const hasWebView = depNames.some(
    (d) =>
      d.includes('webview') ||
      d.includes('web-view') ||
      d.includes('browser'),
  ) || allDocs.toLowerCase().includes('webview') || allDocs.toLowerCase().includes('web browser');

  // Detect User Generated Content
  const hasUGC = depNames.some(
    (d) =>
      d.includes('upload') ||
      d.includes('share') ||
      d.includes('social'),
  ) || allDocs.toLowerCase().includes('user generated content') || allDocs.toLowerCase().includes('ugc');

  // Detect Chat/Messaging
  const hasChat = depNames.some(
    (d) =>
      d.includes('chat') ||
      d.includes('messaging') ||
      d.includes('socket.io') ||
      d.includes('websocket') ||
      d.includes('stream-chat') ||
      d.includes('sendbird'),
  );

  // Detect Gambling
  const hasGambling = allDocs.toLowerCase().includes('gambling') ||
    allDocs.toLowerCase().includes('betting') ||
    allDocs.toLowerCase().includes('casino');

  // Detect Loot Box
  const hasLootBox = allDocs.toLowerCase().includes('loot box') ||
    allDocs.toLowerCase().includes('gacha') ||
    allDocs.toLowerCase().includes('random box');

  // Detect Health Content
  const hasHealthContent = depNames.some(
    (d) =>
      d.includes('health') ||
      d.includes('healthkit') ||
      d.includes('fitness'),
  ) || allDocs.toLowerCase().includes('medical') || allDocs.toLowerCase().includes('health');

  // Detect Violent Content
  const hasViolentContent = allDocs.toLowerCase().includes('violence') ||
    allDocs.toLowerCase().includes('combat') ||
    allDocs.toLowerCase().includes('shooting') ||
    allDocs.toLowerCase().includes('weapon');

  // Detect Sexual Content
  const hasSexualContent = allDocs.toLowerCase().includes('sexual') ||
    allDocs.toLowerCase().includes('adult content') ||
    allDocs.toLowerCase().includes('nudity');

  // Extract team ID
  const teamId = (expoConfig?.ios as Record<string, unknown> | undefined)?.appleTeamId as
    | string
    | undefined;

  return {
    appName,
    bundleId,
    version,
    description,
    features,
    framework,
    permissions,
    hasAds,
    hasAnalytics,
    hasInAppPurchase,
    hasUserAuth,
    hasWebView,
    hasUGC,
    hasChat,
    hasGambling,
    hasLootBox,
    hasHealthContent,
    hasViolentContent,
    hasSexualContent,
    teamId,
    dependencies: depNames,
  };
}

function generateIOSListing(info: IProjectInfo, lang: TLanguage): string {
  const appNameTruncated = info.appName.substring(0, 30);

  // Generate subtitle
  const subtitle = (() => {
    switch (lang) {
      case 'ko': return generateSubtitleKo(info).substring(0, 30);
      case 'en': return generateSubtitleEn(info).substring(0, 30);
      case 'ja': return generateSubtitleJa(info).substring(0, 30);
      case 'zh': return generateSubtitleZh(info).substring(0, 30);
    }
  })();

  // Generate description
  const description = (() => {
    switch (lang) {
      case 'ko': return generateDescriptionKo(info, 4000);
      case 'en': return generateDescriptionEn(info, 4000);
      case 'ja': return generateDescriptionJa(info, 4000);
      case 'zh': return generateDescriptionZh(info, 4000);
    }
  })();

  // Generate keywords
  const keywords = (() => {
    switch (lang) {
      case 'ko': return generateKeywordsKo(info).substring(0, 100);
      case 'en': return generateKeywordsEn(info).substring(0, 100);
      case 'ja': return generateKeywordsJa(info).substring(0, 100);
      case 'zh': return generateKeywordsZh(info).substring(0, 100);
    }
  })();

  // What's New
  const whatsNew = (() => {
    switch (lang) {
      case 'ko': return `v${info.version} 업데이트:\n- 성능 개선 및 버그 수정\n- 사용자 경험 향상`;
      case 'en': return `v${info.version} Update:\n- Performance improvements and bug fixes\n- Enhanced user experience`;
      case 'ja': return `v${info.version} アップデート:\n- パフォーマンス改善およびバグ修正\n- ユーザー体験の向上`;
      case 'zh': return `v${info.version} 更新:\n- 性能改进及错误修复\n- 用户体验提升`;
    }
  })();

  // Category
  const category = (() => {
    switch (lang) {
      case 'ko': return suggestCategoryKo(info);
      case 'en': return suggestCategoryEn(info);
      case 'ja': return suggestCategoryJa(info);
      case 'zh': return suggestCategoryZh(info);
    }
  })();

  // Support URL content
  const supportContent = (() => {
    switch (lang) {
      case 'ko': return generateSupportPageKo(info);
      case 'en': return generateSupportPageEn(info);
      case 'ja': return generateSupportPageJa(info);
      case 'zh': return generateSupportPageZh(info);
    }
  })();

  // Privacy policy
  const privacyPolicy = (() => {
    switch (lang) {
      case 'ko': return generatePrivacyPolicyKo(info);
      case 'en': return generatePrivacyPolicyEn(info);
      case 'ja': return generatePrivacyPolicyJa(info);
      case 'zh': return generatePrivacyPolicyZh(info);
    }
  })();

  // Review notes
  const reviewNotes = (() => {
    switch (lang) {
      case 'ko': return generateReviewNotesKo(info);
      case 'en': return generateReviewNotesEn(info);
      case 'ja': return generateReviewNotesJa(info);
      case 'zh': return generateReviewNotesZh(info);
    }
  })();

  let output = '';
  output += `=== iOS App Store Connect 등록 정보 ===\n\n`;

  output += `--- 앱 이름 (App Name, 최대 30자) ---\n`;
  output += `${appNameTruncated}\n`;
  output += `(${appNameTruncated.length}/30자)\n\n`;

  output += `--- 부제목 (Subtitle, 최대 30자) ---\n`;
  output += `${subtitle}\n`;
  output += `(${subtitle.length}/30자)\n\n`;

  output += `--- 설명 (Description, 최대 4000자) ---\n`;
  output += `${description}\n`;
  output += `(${description.length}/4000자)\n\n`;

  output += `--- 키워드 (Keywords, 최대 100자, 쉼표 구분) ---\n`;
  output += `${keywords}\n`;
  output += `(${keywords.length}/100자)\n\n`;

  output += `--- 새로운 기능 (What's New) ---\n`;
  output += `${whatsNew}\n\n`;

  output += `--- 카테고리 추천 (Category) ---\n`;
  output += `${category}\n\n`;

  output += `--- 지원 URL 내용 (Support Page Content) ---\n`;
  output += `${supportContent}\n\n`;

  output += `--- 개인정보 처리방침 (Privacy Policy) ---\n`;
  output += `${privacyPolicy}\n\n`;

  output += `--- 심사 메모 (Review Notes) ---\n`;
  output += `${reviewNotes}\n`;

  return output;
}

function generateAndroidListing(info: IProjectInfo, lang: TLanguage): string {
  const appTitle = info.appName.substring(0, 30);

  // Short description
  const shortDesc = (() => {
    switch (lang) {
      case 'ko': return generateShortDescKo(info).substring(0, 80);
      case 'en': return generateShortDescEn(info).substring(0, 80);
      case 'ja': return generateShortDescJa(info).substring(0, 80);
      case 'zh': return generateShortDescZh(info).substring(0, 80);
    }
  })();

  // Full description
  const fullDesc = (() => {
    switch (lang) {
      case 'ko': return generateDescriptionKo(info, 4000);
      case 'en': return generateDescriptionEn(info, 4000);
      case 'ja': return generateDescriptionJa(info, 4000);
      case 'zh': return generateDescriptionZh(info, 4000);
    }
  })();

  // Category
  const category = (() => {
    switch (lang) {
      case 'ko': return suggestCategoryKo(info);
      case 'en': return suggestCategoryEn(info);
      case 'ja': return suggestCategoryJa(info);
      case 'zh': return suggestCategoryZh(info);
    }
  })();

  // Content rating guide
  const contentRating = (() => {
    switch (lang) {
      case 'ko': return generateContentRatingGuideKo(info);
      case 'en': return generateContentRatingGuideEn(info);
      case 'ja': return generateContentRatingGuideJa(info);
      case 'zh': return generateContentRatingGuideZh(info);
    }
  })();

  // Privacy policy
  const privacyPolicy = (() => {
    switch (lang) {
      case 'ko': return generatePrivacyPolicyKo(info);
      case 'en': return generatePrivacyPolicyEn(info);
      case 'ja': return generatePrivacyPolicyJa(info);
      case 'zh': return generatePrivacyPolicyZh(info);
    }
  })();

  let output = '';
  output += `=== Google Play Console 등록 정보 ===\n\n`;

  output += `--- 앱 제목 (App Title, 최대 30자) ---\n`;
  output += `${appTitle}\n`;
  output += `(${appTitle.length}/30자)\n\n`;

  output += `--- 간단한 설명 (Short Description, 최대 80자) ---\n`;
  output += `${shortDesc}\n`;
  output += `(${shortDesc.length}/80자)\n\n`;

  output += `--- 자세한 설명 (Full Description, 최대 4000자) ---\n`;
  output += `${fullDesc}\n`;
  output += `(${fullDesc.length}/4000자)\n\n`;

  output += `--- 카테고리 추천 (Category) ---\n`;
  output += `${category}\n\n`;

  output += `--- 콘텐츠 등급 가이드 (Content Rating Guide) ---\n`;
  output += `${contentRating}\n\n`;

  output += `--- 개인정보 처리방침 (Privacy Policy) ---\n`;
  output += `${privacyPolicy}\n`;

  return output;
}

function generateSubtitleKo(info: IProjectInfo): string {
  if (info.features.length > 0) {
    const first = info.features[0];
    if (first.length <= 30) return first;
  }
  if (info.description && info.description.length <= 30) return info.description;
  return `${info.appName} - 최고의 앱`.substring(0, 30);
}

function generateSubtitleEn(info: IProjectInfo): string {
  if (info.features.length > 0) {
    const first = info.features[0];
    if (first.length <= 30) return first;
  }
  if (info.description && info.description.length <= 30) return info.description;
  return `${info.appName} - The Best App`.substring(0, 30);
}

function generateShortDescKo(info: IProjectInfo): string {
  if (info.description && info.description.length <= 80) return info.description;
  const featureSummary = info.features.slice(0, 3).join(', ');
  if (featureSummary && featureSummary.length <= 80) return featureSummary;
  return `${info.appName}으로 더 나은 경험을 시작하세요.`.substring(0, 80);
}

function generateShortDescEn(info: IProjectInfo): string {
  if (info.description && info.description.length <= 80) return info.description;
  const featureSummary = info.features.slice(0, 3).join(', ');
  if (featureSummary && featureSummary.length <= 80) return featureSummary;
  return `Start a better experience with ${info.appName}.`.substring(0, 80);
}

function generateDescriptionKo(info: IProjectInfo, maxLength: number): string {
  let desc = '';

  desc += `${info.appName}을 소개합니다!\n\n`;

  if (info.description) {
    desc += `${info.description}\n\n`;
  }

  if (info.features.length > 0) {
    desc += `주요 기능:\n`;
    for (const feature of info.features.slice(0, 10)) {
      desc += `- ${feature}\n`;
    }
    desc += `\n`;
  }

  desc += `앱 정보:\n`;
  desc += `- 버전: ${info.version}\n`;

  if (info.framework === 'expo' || info.framework === 'react-native') {
    desc += `- 크로스 플랫폼 지원 (iOS/Android)\n`;
  }

  if (info.hasAds) {
    desc += `\n이 앱은 광고를 포함하고 있습니다.\n`;
  }

  if (info.hasInAppPurchase) {
    desc += `이 앱은 인앱 구매를 포함하고 있습니다.\n`;
  }

  desc += `\n문의사항이 있으시면 앱 내 지원 페이지를 통해 연락해 주세요.\n`;

  return desc.substring(0, maxLength);
}

function generateDescriptionEn(info: IProjectInfo, maxLength: number): string {
  let desc = '';

  desc += `Introducing ${info.appName}!\n\n`;

  if (info.description) {
    desc += `${info.description}\n\n`;
  }

  if (info.features.length > 0) {
    desc += `Key Features:\n`;
    for (const feature of info.features.slice(0, 10)) {
      desc += `- ${feature}\n`;
    }
    desc += `\n`;
  }

  desc += `App Info:\n`;
  desc += `- Version: ${info.version}\n`;

  if (info.framework === 'expo' || info.framework === 'react-native') {
    desc += `- Cross-platform support (iOS/Android)\n`;
  }

  if (info.hasAds) {
    desc += `\nThis app contains advertisements.\n`;
  }

  if (info.hasInAppPurchase) {
    desc += `This app contains in-app purchases.\n`;
  }

  desc += `\nIf you have any questions, please contact us through the in-app support page.\n`;

  return desc.substring(0, maxLength);
}

function generateKeywordsKo(info: IProjectInfo): string {
  const keywords: string[] = [];

  // App name words
  const nameWords = info.appName.split(/[\s-_]+/).filter((w) => w.length > 1);
  keywords.push(...nameWords);

  // Feature-based keywords
  for (const feature of info.features.slice(0, 5)) {
    const words = feature
      .split(/[\s,.\-_()]+/)
      .filter((w) => w.length > 1 && w.length < 15);
    keywords.push(...words.slice(0, 3));
  }

  // Deduplicate
  const unique = [...new Set(keywords)];
  return unique.join(',').substring(0, 100);
}

function generateKeywordsEn(info: IProjectInfo): string {
  const keywords: string[] = [];

  const nameWords = info.appName.split(/[\s-_]+/).filter((w) => w.length > 1);
  keywords.push(...nameWords.map((w) => w.toLowerCase()));

  for (const feature of info.features.slice(0, 5)) {
    const words = feature
      .split(/[\s,.\-_()]+/)
      .filter((w) => w.length > 1 && w.length < 15);
    keywords.push(...words.slice(0, 3).map((w) => w.toLowerCase()));
  }

  const unique = [...new Set(keywords)];
  return unique.join(',').substring(0, 100);
}

function suggestCategoryKo(info: IProjectInfo): string {
  const allText = [info.description, ...info.features].join(' ').toLowerCase();

  const categoryMap: Array<{ keywords: string[]; primary: string; secondary: string }> = [
    {
      keywords: ['학습', 'learn', 'education', '교육', '단어', 'word', 'vocabulary', '공부', 'study', 'quiz'],
      primary: '교육 (Education)',
      secondary: '참고 (Reference)',
    },
    {
      keywords: ['game', '게임', 'play', 'puzzle', 'adventure'],
      primary: '게임 (Games)',
      secondary: '엔터테인먼트 (Entertainment)',
    },
    {
      keywords: ['health', '건강', 'fitness', '운동', 'workout', 'diet'],
      primary: '건강 및 피트니스 (Health & Fitness)',
      secondary: '라이프스타일 (Lifestyle)',
    },
    {
      keywords: ['shop', '쇼핑', 'store', 'buy', 'purchase', 'commerce'],
      primary: '쇼핑 (Shopping)',
      secondary: '라이프스타일 (Lifestyle)',
    },
    {
      keywords: ['social', '소셜', 'chat', 'message', 'community', '커뮤니티'],
      primary: '소셜 네트워킹 (Social Networking)',
      secondary: '엔터테인먼트 (Entertainment)',
    },
    {
      keywords: ['photo', '사진', 'camera', 'video', '동영상', 'edit'],
      primary: '사진 및 비디오 (Photo & Video)',
      secondary: '엔터테인먼트 (Entertainment)',
    },
    {
      keywords: ['music', '음악', 'audio', 'sound', 'podcast'],
      primary: '음악 (Music)',
      secondary: '엔터테인먼트 (Entertainment)',
    },
    {
      keywords: ['finance', '금융', 'money', 'bank', 'budget', '가계부', 'expense'],
      primary: '금융 (Finance)',
      secondary: '비즈니스 (Business)',
    },
    {
      keywords: ['productivity', '생산성', 'task', 'todo', 'note', '메모', 'calendar'],
      primary: '생산성 (Productivity)',
      secondary: '비즈니스 (Business)',
    },
    {
      keywords: ['travel', '여행', 'map', '지도', 'navigation', 'trip'],
      primary: '여행 (Travel)',
      secondary: '내비게이션 (Navigation)',
    },
    {
      keywords: ['food', '음식', 'recipe', '레시피', 'cook', 'restaurant', '맛집'],
      primary: '음식 및 음료 (Food & Drink)',
      secondary: '라이프스타일 (Lifestyle)',
    },
    {
      keywords: ['news', '뉴스', 'article', 'magazine', 'read'],
      primary: '뉴스 (News)',
      secondary: '매거진 및 신문 (Magazines & Newspapers)',
    },
    {
      keywords: ['utility', '유틸리티', 'tool', '도구', 'calculator', '계산기'],
      primary: '유틸리티 (Utilities)',
      secondary: '라이프스타일 (Lifestyle)',
    },
    {
      keywords: ['lifestyle', '라이프스타일', 'life', '생활'],
      primary: '라이프스타일 (Lifestyle)',
      secondary: '유틸리티 (Utilities)',
    },
    {
      keywords: ['entertainment', '엔터테인먼트', '오락', 'fun', 'led', 'banner', 'neon', 'display'],
      primary: '엔터테인먼트 (Entertainment)',
      secondary: '라이프스타일 (Lifestyle)',
    },
    {
      keywords: ['business', '비즈니스', '사업', 'enterprise'],
      primary: '비즈니스 (Business)',
      secondary: '생산성 (Productivity)',
    },
  ];

  for (const mapping of categoryMap) {
    if (mapping.keywords.some((kw) => allText.includes(kw))) {
      return `기본 카테고리: ${mapping.primary}\n보조 카테고리: ${mapping.secondary}`;
    }
  }

  return `기본 카테고리: 유틸리티 (Utilities)\n보조 카테고리: 라이프스타일 (Lifestyle)`;
}

function suggestCategoryEn(info: IProjectInfo): string {
  const allText = [info.description, ...info.features].join(' ').toLowerCase();

  const categoryMap: Array<{ keywords: string[]; primary: string; secondary: string }> = [
    {
      keywords: ['learn', 'education', 'word', 'vocabulary', 'study', 'quiz'],
      primary: 'Education',
      secondary: 'Reference',
    },
    { keywords: ['game', 'play', 'puzzle', 'adventure'], primary: 'Games', secondary: 'Entertainment' },
    { keywords: ['health', 'fitness', 'workout', 'diet'], primary: 'Health & Fitness', secondary: 'Lifestyle' },
    { keywords: ['shop', 'store', 'buy', 'purchase', 'commerce'], primary: 'Shopping', secondary: 'Lifestyle' },
    {
      keywords: ['social', 'chat', 'message', 'community'],
      primary: 'Social Networking',
      secondary: 'Entertainment',
    },
    { keywords: ['photo', 'camera', 'video', 'edit'], primary: 'Photo & Video', secondary: 'Entertainment' },
    { keywords: ['music', 'audio', 'sound', 'podcast'], primary: 'Music', secondary: 'Entertainment' },
    { keywords: ['finance', 'money', 'bank', 'budget', 'expense'], primary: 'Finance', secondary: 'Business' },
    {
      keywords: ['productivity', 'task', 'todo', 'note', 'calendar'],
      primary: 'Productivity',
      secondary: 'Business',
    },
    { keywords: ['travel', 'map', 'navigation', 'trip'], primary: 'Travel', secondary: 'Navigation' },
    { keywords: ['food', 'recipe', 'cook', 'restaurant'], primary: 'Food & Drink', secondary: 'Lifestyle' },
    { keywords: ['news', 'article', 'magazine', 'read'], primary: 'News', secondary: 'Magazines & Newspapers' },
    { keywords: ['utility', 'tool', 'calculator'], primary: 'Utilities', secondary: 'Lifestyle' },
    { keywords: ['lifestyle', 'life'], primary: 'Lifestyle', secondary: 'Utilities' },
    {
      keywords: ['entertainment', 'fun', 'led', 'banner', 'neon', 'display'],
      primary: 'Entertainment',
      secondary: 'Lifestyle',
    },
    { keywords: ['business', 'enterprise'], primary: 'Business', secondary: 'Productivity' },
  ];

  for (const mapping of categoryMap) {
    if (mapping.keywords.some((kw) => allText.includes(kw))) {
      return `Primary Category: ${mapping.primary}\nSecondary Category: ${mapping.secondary}`;
    }
  }

  return `Primary Category: Utilities\nSecondary Category: Lifestyle`;
}

function generateSupportPageKo(info: IProjectInfo): string {
  let content = '';
  content += `${info.appName} 고객 지원\n\n`;
  content += `앱 사용 중 문제가 발생하거나 도움이 필요하시면 아래 방법으로 문의해 주세요.\n\n`;
  content += `문의 방법:\n`;
  content += `- 이메일: support@example.com (실제 이메일로 변경 필요)\n`;
  content += `- 응답 시간: 영업일 기준 1-2일 이내\n\n`;
  content += `자주 묻는 질문 (FAQ):\n\n`;
  content += `Q: 앱이 정상적으로 작동하지 않아요.\n`;
  content += `A: 앱을 최신 버전으로 업데이트한 후 다시 시도해 주세요. 문제가 지속되면 앱을 삭제 후 재설치해 주세요.\n\n`;
  content += `Q: 데이터가 사라졌어요.\n`;
  content += `A: 앱 데이터는 기기에 로컬로 저장됩니다. 앱을 삭제하면 데이터가 초기화될 수 있습니다.\n\n`;
  content += `현재 버전: ${info.version}\n`;
  return content;
}

function generateSupportPageEn(info: IProjectInfo): string {
  let content = '';
  content += `${info.appName} Customer Support\n\n`;
  content += `If you encounter any issues or need help while using the app, please contact us using the methods below.\n\n`;
  content += `Contact Methods:\n`;
  content += `- Email: support@example.com (replace with actual email)\n`;
  content += `- Response Time: Within 1-2 business days\n\n`;
  content += `Frequently Asked Questions (FAQ):\n\n`;
  content += `Q: The app is not working properly.\n`;
  content += `A: Please update the app to the latest version and try again. If the problem persists, delete and reinstall the app.\n\n`;
  content += `Q: My data has disappeared.\n`;
  content += `A: App data is stored locally on your device. Deleting the app may reset your data.\n\n`;
  content += `Current Version: ${info.version}\n`;
  return content;
}

function generatePrivacyPolicyKo(info: IProjectInfo): string {
  let policy = '';
  policy += `개인정보 처리방침\n\n`;
  policy += `최종 수정일: ${new Date().toISOString().split('T')[0]}\n\n`;
  policy += `${info.appName} (이하 "앱")은 사용자의 개인정보를 중요하게 생각합니다.\n`;
  policy += `본 개인정보 처리방침은 앱이 수집하는 정보와 그 사용 방법에 대해 설명합니다.\n\n`;

  policy += `1. 수집하는 정보\n\n`;

  const collectedData: string[] = [];

  if (info.hasUserAuth) {
    collectedData.push('- 계정 정보: 이메일 주소, 사용자 이름 (회원가입 시)');
  }

  if (info.hasAnalytics) {
    collectedData.push('- 사용 데이터: 앱 사용 패턴, 화면 조회 기록 (서비스 개선 목적)');
    collectedData.push('- 기기 정보: 기기 모델, OS 버전, 앱 버전');
  }

  if (info.hasAds) {
    collectedData.push('- 광고 식별자: 맞춤형 광고 제공을 위한 광고 ID (IDFA/GAID)');
  }

  if (collectedData.length === 0) {
    policy += `본 앱은 개인정보를 수집하지 않습니다. 모든 데이터는 사용자의 기기에 로컬로 저장되며, 외부 서버로 전송되지 않습니다.\n\n`;
  } else {
    for (const item of collectedData) {
      policy += `${item}\n`;
    }
    policy += `\n`;
  }

  policy += `2. 정보의 사용 목적\n\n`;
  policy += `수집된 정보는 다음 목적으로 사용됩니다:\n`;
  policy += `- 앱 서비스 제공 및 유지보수\n`;
  if (info.hasAnalytics) {
    policy += `- 앱 사용 분석 및 서비스 개선\n`;
  }
  if (info.hasAds) {
    policy += `- 맞춤형 광고 제공\n`;
  }
  policy += `\n`;

  policy += `3. 정보의 공유\n\n`;
  policy += `앱은 법적 요구가 있는 경우를 제외하고 사용자의 개인정보를 제3자에게 판매하거나 공유하지 않습니다.\n`;

  if (info.hasAds) {
    policy += `단, 광고 파트너(Google AdMob 등)와 광고 식별자가 공유될 수 있습니다.\n`;
  }
  policy += `\n`;

  policy += `4. 데이터 보안\n\n`;
  policy += `사용자의 데이터를 보호하기 위해 적절한 기술적, 관리적 보안 조치를 취하고 있습니다.\n\n`;

  policy += `5. 아동의 개인정보\n\n`;
  policy += `본 앱은 13세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.\n\n`;

  policy += `6. 문의하기\n\n`;
  policy += `개인정보 처리방침에 대한 문의사항이 있으시면 support@example.com (실제 이메일로 변경 필요)으로 연락해 주세요.\n`;

  return policy;
}

function generatePrivacyPolicyEn(info: IProjectInfo): string {
  let policy = '';
  policy += `Privacy Policy\n\n`;
  policy += `Last Updated: ${new Date().toISOString().split('T')[0]}\n\n`;
  policy += `${info.appName} ("the App") values your privacy.\n`;
  policy += `This Privacy Policy explains the information the App collects and how it is used.\n\n`;

  policy += `1. Information We Collect\n\n`;

  const collectedData: string[] = [];

  if (info.hasUserAuth) {
    collectedData.push('- Account Information: Email address, username (during registration)');
  }

  if (info.hasAnalytics) {
    collectedData.push('- Usage Data: App usage patterns, screen views (for service improvement)');
    collectedData.push('- Device Information: Device model, OS version, app version');
  }

  if (info.hasAds) {
    collectedData.push('- Advertising Identifier: Ad ID (IDFA/GAID) for personalized advertising');
  }

  if (collectedData.length === 0) {
    policy += `This app does not collect personal information. All data is stored locally on your device and is not transmitted to external servers.\n\n`;
  } else {
    for (const item of collectedData) {
      policy += `${item}\n`;
    }
    policy += `\n`;
  }

  policy += `2. How We Use Information\n\n`;
  policy += `Collected information is used for the following purposes:\n`;
  policy += `- Providing and maintaining app services\n`;
  if (info.hasAnalytics) {
    policy += `- Analyzing app usage and improving services\n`;
  }
  if (info.hasAds) {
    policy += `- Providing personalized advertisements\n`;
  }
  policy += `\n`;

  policy += `3. Information Sharing\n\n`;
  policy += `The App does not sell or share your personal information with third parties except as required by law.\n`;
  if (info.hasAds) {
    policy += `However, advertising identifiers may be shared with advertising partners (e.g., Google AdMob).\n`;
  }
  policy += `\n`;

  policy += `4. Data Security\n\n`;
  policy += `We implement appropriate technical and administrative security measures to protect your data.\n\n`;

  policy += `5. Children's Privacy\n\n`;
  policy += `This App does not knowingly collect personal information from children under 13.\n\n`;

  policy += `6. Contact Us\n\n`;
  policy += `If you have questions about this Privacy Policy, please contact us at support@example.com (replace with actual email).\n`;

  return policy;
}

function generateReviewNotesKo(info: IProjectInfo): string {
  let notes = '';
  notes += `심사팀 참고 사항:\n\n`;
  notes += `앱 이름: ${info.appName}\n`;
  notes += `번들 ID: ${info.bundleId}\n`;
  notes += `버전: ${info.version}\n`;
  notes += `프레임워크: ${info.framework}\n\n`;

  if (!info.hasUserAuth) {
    notes += `- 이 앱은 로그인 없이 사용할 수 있습니다. 별도의 테스트 계정이 필요하지 않습니다.\n`;
  } else {
    notes += `- 테스트 계정:\n`;
    notes += `  이메일: test@example.com (실제 테스트 계정으로 변경 필요)\n`;
    notes += `  비밀번호: testpassword (실제 비밀번호로 변경 필요)\n`;
  }

  if (info.hasAds) {
    notes += `- 이 앱은 Google AdMob을 통한 광고를 포함하고 있습니다.\n`;
  }

  if (info.hasInAppPurchase) {
    notes += `- 이 앱은 인앱 구매를 포함하고 있습니다.\n`;
  }

  notes += `\n모든 기능은 네트워크 연결 없이도 기본적으로 사용 가능합니다.\n`;
  notes += `(실제 앱 요구사항에 맞게 수정 필요)\n`;

  return notes;
}

function generateReviewNotesEn(info: IProjectInfo): string {
  let notes = '';
  notes += `Review Notes:\n\n`;
  notes += `App Name: ${info.appName}\n`;
  notes += `Bundle ID: ${info.bundleId}\n`;
  notes += `Version: ${info.version}\n`;
  notes += `Framework: ${info.framework}\n\n`;

  if (!info.hasUserAuth) {
    notes += `- This app can be used without login. No test account is required.\n`;
  } else {
    notes += `- Test Account:\n`;
    notes += `  Email: test@example.com (replace with actual test account)\n`;
    notes += `  Password: testpassword (replace with actual password)\n`;
  }

  if (info.hasAds) {
    notes += `- This app contains advertisements via Google AdMob.\n`;
  }

  if (info.hasInAppPurchase) {
    notes += `- This app contains in-app purchases.\n`;
  }

  notes += `\nAll features are available without network connectivity.\n`;
  notes += `(Modify according to actual app requirements)\n`;

  return notes;
}

function generateContentRatingGuideKo(info: IProjectInfo): string {
  let guide = '';
  guide += `Google Play 콘텐츠 등급 설정 가이드:\n\n`;
  guide += `Google Play Console > 앱 콘텐츠 > 콘텐츠 등급 에서 설문을 완료해야 합니다.\n\n`;
  guide += `다음 항목에 대해 답변이 필요합니다:\n\n`;

  guide += `1. 폭력성: `;
  guide += `없음 (해당하지 않는 경우)\n`;

  guide += `2. 성적 콘텐츠: `;
  guide += `없음 (해당하지 않는 경우)\n`;

  guide += `3. 언어: `;
  guide += `경미한 수준 (일반적인 텍스트 포함 시)\n`;

  guide += `4. 약물/알코올/담배: `;
  guide += `없음 (해당하지 않는 경우)\n`;

  if (info.hasAds) {
    guide += `5. 광고: 예 - 앱에 광고가 포함되어 있습니다\n`;
  } else {
    guide += `5. 광고: 아니오\n`;
  }

  if (info.hasInAppPurchase) {
    guide += `6. 인앱 구매: 예 - 디지털 상품 구매 가능\n`;
  } else {
    guide += `6. 인앱 구매: 아니오\n`;
  }

  if (info.hasUserAuth) {
    guide += `7. 사용자 생성 콘텐츠: 확인 필요 (사용자 간 상호작용 여부)\n`;
  } else {
    guide += `7. 사용자 생성 콘텐츠: 아니오\n`;
  }

  guide += `\n예상 등급: 전체 이용가 (Everyone) 또는 만 12세 이상 (Everyone 12+)\n`;
  guide += `(실제 앱 콘텐츠에 따라 달라질 수 있습니다)\n`;

  return guide;
}

function generateContentRatingGuideEn(info: IProjectInfo): string {
  let guide = '';
  guide += `Google Play Content Rating Guide:\n\n`;
  guide += `Complete the questionnaire in Google Play Console > App content > Content rating.\n\n`;
  guide += `You need to answer the following:\n\n`;

  guide += `1. Violence: None (if not applicable)\n`;
  guide += `2. Sexual Content: None (if not applicable)\n`;
  guide += `3. Language: Mild (if general text is included)\n`;
  guide += `4. Drugs/Alcohol/Tobacco: None (if not applicable)\n`;

  if (info.hasAds) {
    guide += `5. Ads: Yes - The app contains advertisements\n`;
  } else {
    guide += `5. Ads: No\n`;
  }

  if (info.hasInAppPurchase) {
    guide += `6. In-App Purchases: Yes - Digital goods available\n`;
  } else {
    guide += `6. In-App Purchases: No\n`;
  }

  if (info.hasUserAuth) {
    guide += `7. User-Generated Content: Check if applicable (user interaction)\n`;
  } else {
    guide += `7. User-Generated Content: No\n`;
  }

  guide += `\nExpected Rating: Everyone or Everyone 12+\n`;
  guide += `(May vary depending on actual app content)\n`;

  return guide;
}

// ============================================================
// Japanese (ja) Generation Functions
// ============================================================

function generateSubtitleJa(info: IProjectInfo): string {
  if (info.features.length > 0) {
    const first = info.features[0];
    if (first.length <= 30) return first;
  }
  if (info.description && info.description.length <= 30) return info.description;
  return `${info.appName} - 最高のアプリ`.substring(0, 30);
}

function generateShortDescJa(info: IProjectInfo): string {
  if (info.description && info.description.length <= 80) return info.description;
  const featureSummary = info.features.slice(0, 3).join('、');
  if (featureSummary && featureSummary.length <= 80) return featureSummary;
  return `${info.appName}でより良い体験を始めましょう。`.substring(0, 80);
}

function generateDescriptionJa(info: IProjectInfo, maxLength: number): string {
  let desc = '';

  desc += `${info.appName}をご紹介します！\n\n`;

  if (info.description) {
    desc += `${info.description}\n\n`;
  }

  if (info.features.length > 0) {
    desc += `主な機能：\n`;
    for (const feature of info.features.slice(0, 10)) {
      desc += `- ${feature}\n`;
    }
    desc += `\n`;
  }

  desc += `アプリ情報：\n`;
  desc += `- バージョン: ${info.version}\n`;

  if (info.framework === 'expo' || info.framework === 'react-native') {
    desc += `- クロスプラットフォーム対応 (iOS/Android)\n`;
  }

  if (info.hasAds) {
    desc += `\nこのアプリには広告が含まれています。\n`;
  }

  if (info.hasInAppPurchase) {
    desc += `このアプリにはアプリ内課金が含まれています。\n`;
  }

  desc += `\nご質問がございましたら、アプリ内のサポートページからお問い合わせください。\n`;

  return desc.substring(0, maxLength);
}

function generateKeywordsJa(info: IProjectInfo): string {
  const keywords: string[] = [];

  const nameWords = info.appName.split(/[\s-_]+/).filter((w) => w.length > 1);
  keywords.push(...nameWords);

  for (const feature of info.features.slice(0, 5)) {
    const words = feature
      .split(/[\s,.\-_()、]+/)
      .filter((w) => w.length > 1 && w.length < 15);
    keywords.push(...words.slice(0, 3));
  }

  const unique = [...new Set(keywords)];
  return unique.join(',').substring(0, 100);
}

function suggestCategoryJa(info: IProjectInfo): string {
  const allText = [info.description, ...info.features].join(' ').toLowerCase();

  const categoryMap: Array<{ keywords: string[]; primary: string; secondary: string }> = [
    {
      keywords: ['学習', 'learn', 'education', '教育', '単語', 'word', 'vocabulary', '勉強', 'study', 'quiz'],
      primary: '教育 (Education)',
      secondary: '辞書/辞典 (Reference)',
    },
    {
      keywords: ['game', 'ゲーム', 'play', 'puzzle', 'adventure'],
      primary: 'ゲーム (Games)',
      secondary: 'エンターテインメント (Entertainment)',
    },
    {
      keywords: ['health', '健康', 'fitness', '運動', 'workout', 'diet', 'フィットネス'],
      primary: 'ヘルス＆フィットネス (Health & Fitness)',
      secondary: 'ライフスタイル (Lifestyle)',
    },
    {
      keywords: ['shop', 'ショッピング', 'store', 'buy', 'purchase', 'commerce', '買い物'],
      primary: 'ショッピング (Shopping)',
      secondary: 'ライフスタイル (Lifestyle)',
    },
    {
      keywords: ['social', 'ソーシャル', 'chat', 'message', 'community', 'コミュニティ', 'sns'],
      primary: 'ソーシャル (Social Networking)',
      secondary: 'エンターテインメント (Entertainment)',
    },
    {
      keywords: ['photo', '写真', 'camera', 'video', '動画', 'edit', 'ビデオ'],
      primary: '写真＆ビデオ (Photo & Video)',
      secondary: 'エンターテインメント (Entertainment)',
    },
    {
      keywords: ['music', '音楽', 'audio', 'sound', 'podcast', 'ミュージック'],
      primary: 'ミュージック (Music)',
      secondary: 'エンターテインメント (Entertainment)',
    },
    {
      keywords: ['finance', '金融', 'money', 'bank', 'budget', '家計簿', 'expense'],
      primary: 'ファイナンス (Finance)',
      secondary: 'ビジネス (Business)',
    },
    {
      keywords: ['productivity', '生産性', 'task', 'todo', 'note', 'メモ', 'calendar', '仕事'],
      primary: '仕事効率化 (Productivity)',
      secondary: 'ビジネス (Business)',
    },
    {
      keywords: ['travel', '旅行', 'map', '地図', 'navigation', 'trip'],
      primary: '旅行 (Travel)',
      secondary: 'ナビゲーション (Navigation)',
    },
    {
      keywords: ['food', '食べ物', 'recipe', 'レシピ', 'cook', 'restaurant', 'グルメ', '料理'],
      primary: 'フード＆ドリンク (Food & Drink)',
      secondary: 'ライフスタイル (Lifestyle)',
    },
    {
      keywords: ['news', 'ニュース', 'article', 'magazine', 'read'],
      primary: 'ニュース (News)',
      secondary: '雑誌/新聞 (Magazines & Newspapers)',
    },
    {
      keywords: ['utility', 'ユーティリティ', 'tool', 'ツール', 'calculator', '計算'],
      primary: 'ユーティリティ (Utilities)',
      secondary: 'ライフスタイル (Lifestyle)',
    },
    {
      keywords: ['lifestyle', 'ライフスタイル', 'life', '生活'],
      primary: 'ライフスタイル (Lifestyle)',
      secondary: 'ユーティリティ (Utilities)',
    },
    {
      keywords: ['entertainment', 'エンターテインメント', '娯楽', 'fun', 'led', 'banner', 'neon', 'display'],
      primary: 'エンターテインメント (Entertainment)',
      secondary: 'ライフスタイル (Lifestyle)',
    },
    {
      keywords: ['business', 'ビジネス', '仕事', 'enterprise'],
      primary: 'ビジネス (Business)',
      secondary: '仕事効率化 (Productivity)',
    },
  ];

  for (const mapping of categoryMap) {
    if (mapping.keywords.some((kw) => allText.includes(kw))) {
      return `基本カテゴリ: ${mapping.primary}\n補助カテゴリ: ${mapping.secondary}`;
    }
  }

  return `基本カテゴリ: ユーティリティ (Utilities)\n補助カテゴリ: ライフスタイル (Lifestyle)`;
}

function generateSupportPageJa(info: IProjectInfo): string {
  let content = '';
  content += `${info.appName} カスタマーサポート\n\n`;
  content += `アプリの使用中に問題が発生した場合や、サポートが必要な場合は、以下の方法でお問い合わせください。\n\n`;
  content += `お問い合わせ方法:\n`;
  content += `- メール: support@example.com（実際のメールアドレスに変更してください）\n`;
  content += `- 応答時間: 営業日基準1〜2日以内\n\n`;
  content += `よくある質問 (FAQ):\n\n`;
  content += `Q: アプリが正常に動作しません。\n`;
  content += `A: アプリを最新バージョンにアップデートしてから再度お試しください。問題が解決しない場合は、アプリを削除して再インストールしてください。\n\n`;
  content += `Q: データが消えてしまいました。\n`;
  content += `A: アプリデータはデバイスにローカル保存されています。アプリを削除するとデータがリセットされる場合があります。\n\n`;
  content += `現在のバージョン: ${info.version}\n`;
  return content;
}

function generatePrivacyPolicyJa(info: IProjectInfo): string {
  let policy = '';
  policy += `プライバシーポリシー\n\n`;
  policy += `最終更新日: ${new Date().toISOString().split('T')[0]}\n\n`;
  policy += `${info.appName}（以下「本アプリ」）は、ユーザーのプライバシーを重視しています。\n`;
  policy += `本プライバシーポリシーは、本アプリが収集する情報とその利用方法について説明します。\n\n`;

  policy += `1. 収集する情報\n\n`;

  const collectedData: string[] = [];

  if (info.hasUserAuth) {
    collectedData.push('- アカウント情報: メールアドレス、ユーザー名（会員登録時）');
  }

  if (info.hasAnalytics) {
    collectedData.push('- 利用データ: アプリ使用パターン、画面閲覧履歴（サービス改善目的）');
    collectedData.push('- デバイス情報: デバイスモデル、OSバージョン、アプリバージョン');
  }

  if (info.hasAds) {
    collectedData.push('- 広告識別子: カスタマイズ広告配信のための広告ID（IDFA/GAID）');
  }

  if (collectedData.length === 0) {
    policy += `本アプリは個人情報を収集しません。すべてのデータはユーザーのデバイスにローカル保存され、外部サーバーには送信されません。\n\n`;
  } else {
    for (const item of collectedData) {
      policy += `${item}\n`;
    }
    policy += `\n`;
  }

  policy += `2. 情報の利用目的\n\n`;
  policy += `収集した情報は以下の目的で使用されます:\n`;
  policy += `- アプリサービスの提供および維持管理\n`;
  if (info.hasAnalytics) {
    policy += `- アプリ使用分析およびサービス改善\n`;
  }
  if (info.hasAds) {
    policy += `- カスタマイズ広告の配信\n`;
  }
  policy += `\n`;

  policy += `3. 情報の共有\n\n`;
  policy += `本アプリは、法的要求がある場合を除き、ユーザーの個人情報を第三者に販売または共有することはありません。\n`;
  if (info.hasAds) {
    policy += `ただし、広告パートナー（Google AdMob等）と広告識別子が共有される場合があります。\n`;
  }
  policy += `\n`;

  policy += `4. データセキュリティ\n\n`;
  policy += `ユーザーのデータを保護するために、適切な技術的・管理的セキュリティ対策を講じています。\n\n`;

  policy += `5. お子様のプライバシー\n\n`;
  policy += `本アプリは、13歳未満のお子様の個人情報を意図的に収集することはありません。\n\n`;

  policy += `6. お問い合わせ\n\n`;
  policy += `プライバシーポリシーに関するお問い合わせは、support@example.com（実際のメールアドレスに変更してください）までご連絡ください。\n`;

  return policy;
}

function generateReviewNotesJa(info: IProjectInfo): string {
  let notes = '';
  notes += `審査メモ：\n\n`;
  notes += `アプリ名: ${info.appName}\n`;
  notes += `バンドルID: ${info.bundleId}\n`;
  notes += `バージョン: ${info.version}\n`;
  notes += `フレームワーク: ${info.framework}\n\n`;

  if (!info.hasUserAuth) {
    notes += `- このアプリはログイン不要で使用できます。テストアカウントは必要ありません。\n`;
  } else {
    notes += `- テストアカウント:\n`;
    notes += `  メール: test@example.com（実際のテストアカウントに変更してください）\n`;
    notes += `  パスワード: testpassword（実際のパスワードに変更してください）\n`;
  }

  if (info.hasAds) {
    notes += `- このアプリにはGoogle AdMobによる広告が含まれています。\n`;
  }

  if (info.hasInAppPurchase) {
    notes += `- このアプリにはアプリ内課金が含まれています。\n`;
  }

  notes += `\nすべての機能はネットワーク接続なしでも基本的に使用可能です。\n`;
  notes += `（実際のアプリ要件に合わせて修正してください）\n`;

  return notes;
}

function generateContentRatingGuideJa(info: IProjectInfo): string {
  let guide = '';
  guide += `Google Play コンテンツレーティングガイド：\n\n`;
  guide += `Google Play Console > アプリのコンテンツ > コンテンツレーティング でアンケートを完了してください。\n\n`;
  guide += `以下の項目に回答が必要です:\n\n`;

  guide += `1. 暴力性: `;
  guide += `なし（該当しない場合）\n`;

  guide += `2. 性的コンテンツ: `;
  guide += `なし（該当しない場合）\n`;

  guide += `3. 言語: `;
  guide += `軽度（一般的なテキストを含む場合）\n`;

  guide += `4. 薬物/アルコール/タバコ: `;
  guide += `なし（該当しない場合）\n`;

  if (info.hasAds) {
    guide += `5. 広告: はい - アプリに広告が含まれています\n`;
  } else {
    guide += `5. 広告: いいえ\n`;
  }

  if (info.hasInAppPurchase) {
    guide += `6. アプリ内課金: はい - デジタル商品の購入が可能です\n`;
  } else {
    guide += `6. アプリ内課金: いいえ\n`;
  }

  if (info.hasUserAuth) {
    guide += `7. ユーザー生成コンテンツ: 確認が必要（ユーザー間の対話の有無）\n`;
  } else {
    guide += `7. ユーザー生成コンテンツ: いいえ\n`;
  }

  guide += `\n予想レーティング: 全ユーザー対象 (Everyone) または 12歳以上 (Everyone 12+)\n`;
  guide += `（実際のアプリコンテンツにより異なる場合があります）\n`;

  return guide;
}

// ============================================================
// Chinese (zh) Generation Functions
// ============================================================

function generateSubtitleZh(info: IProjectInfo): string {
  if (info.features.length > 0) {
    const first = info.features[0];
    if (first.length <= 30) return first;
  }
  if (info.description && info.description.length <= 30) return info.description;
  return `${info.appName} - 最佳应用`.substring(0, 30);
}

function generateShortDescZh(info: IProjectInfo): string {
  if (info.description && info.description.length <= 80) return info.description;
  const featureSummary = info.features.slice(0, 3).join('、');
  if (featureSummary && featureSummary.length <= 80) return featureSummary;
  return `使用${info.appName}开启更好的体验。`.substring(0, 80);
}

function generateDescriptionZh(info: IProjectInfo, maxLength: number): string {
  let desc = '';

  desc += `${info.appName}隆重登场！\n\n`;

  if (info.description) {
    desc += `${info.description}\n\n`;
  }

  if (info.features.length > 0) {
    desc += `主要功能：\n`;
    for (const feature of info.features.slice(0, 10)) {
      desc += `- ${feature}\n`;
    }
    desc += `\n`;
  }

  desc += `应用信息：\n`;
  desc += `- 版本: ${info.version}\n`;

  if (info.framework === 'expo' || info.framework === 'react-native') {
    desc += `- 跨平台支持 (iOS/Android)\n`;
  }

  if (info.hasAds) {
    desc += `\n此应用包含广告。\n`;
  }

  if (info.hasInAppPurchase) {
    desc += `此应用包含应用内购买。\n`;
  }

  desc += `\n如有任何问题，请通过应用内的支持页面与我们联系。\n`;

  return desc.substring(0, maxLength);
}

function generateKeywordsZh(info: IProjectInfo): string {
  const keywords: string[] = [];

  const nameWords = info.appName.split(/[\s-_]+/).filter((w) => w.length > 1);
  keywords.push(...nameWords);

  for (const feature of info.features.slice(0, 5)) {
    const words = feature
      .split(/[\s,.\-_()、]+/)
      .filter((w) => w.length > 1 && w.length < 15);
    keywords.push(...words.slice(0, 3));
  }

  const unique = [...new Set(keywords)];
  return unique.join(',').substring(0, 100);
}

function suggestCategoryZh(info: IProjectInfo): string {
  const allText = [info.description, ...info.features].join(' ').toLowerCase();

  const categoryMap: Array<{ keywords: string[]; primary: string; secondary: string }> = [
    {
      keywords: ['学习', 'learn', 'education', '教育', '单词', 'word', 'vocabulary', '学', 'study', 'quiz'],
      primary: '教育 (Education)',
      secondary: '参考 (Reference)',
    },
    {
      keywords: ['game', '游戏', 'play', 'puzzle', 'adventure'],
      primary: '游戏 (Games)',
      secondary: '娱乐 (Entertainment)',
    },
    {
      keywords: ['health', '健康', 'fitness', '运动', 'workout', 'diet', '健身'],
      primary: '健康健美 (Health & Fitness)',
      secondary: '生活 (Lifestyle)',
    },
    {
      keywords: ['shop', '购物', 'store', 'buy', 'purchase', 'commerce', '商店'],
      primary: '购物 (Shopping)',
      secondary: '生活 (Lifestyle)',
    },
    {
      keywords: ['social', '社交', 'chat', 'message', 'community', '社区'],
      primary: '社交 (Social Networking)',
      secondary: '娱乐 (Entertainment)',
    },
    {
      keywords: ['photo', '照片', 'camera', 'video', '视频', 'edit'],
      primary: '照片与视频 (Photo & Video)',
      secondary: '娱乐 (Entertainment)',
    },
    {
      keywords: ['music', '音乐', 'audio', 'sound', 'podcast'],
      primary: '音乐 (Music)',
      secondary: '娱乐 (Entertainment)',
    },
    {
      keywords: ['finance', '金融', 'money', 'bank', 'budget', '记账', 'expense', '财务'],
      primary: '财务 (Finance)',
      secondary: '商务 (Business)',
    },
    {
      keywords: ['productivity', '生产力', 'task', 'todo', 'note', '备忘录', 'calendar', '效率'],
      primary: '效率 (Productivity)',
      secondary: '商务 (Business)',
    },
    {
      keywords: ['travel', '旅行', 'map', '地图', 'navigation', 'trip', '旅游'],
      primary: '旅行 (Travel)',
      secondary: '导航 (Navigation)',
    },
    {
      keywords: ['food', '美食', 'recipe', '食谱', 'cook', 'restaurant', '餐厅', '料理'],
      primary: '美食佳饮 (Food & Drink)',
      secondary: '生活 (Lifestyle)',
    },
    {
      keywords: ['news', '新闻', 'article', 'magazine', 'read'],
      primary: '新闻 (News)',
      secondary: '杂志和报纸 (Magazines & Newspapers)',
    },
    {
      keywords: ['utility', '工具', 'tool', 'calculator', '计算'],
      primary: '工具 (Utilities)',
      secondary: '生活 (Lifestyle)',
    },
    {
      keywords: ['lifestyle', '生活', 'life'],
      primary: '生活 (Lifestyle)',
      secondary: '工具 (Utilities)',
    },
    {
      keywords: ['entertainment', '娱乐', 'fun', 'led', 'banner', 'neon', 'display'],
      primary: '娱乐 (Entertainment)',
      secondary: '生活 (Lifestyle)',
    },
    {
      keywords: ['business', '商务', '商业', 'enterprise'],
      primary: '商务 (Business)',
      secondary: '效率 (Productivity)',
    },
  ];

  for (const mapping of categoryMap) {
    if (mapping.keywords.some((kw) => allText.includes(kw))) {
      return `基本分类: ${mapping.primary}\n辅助分类: ${mapping.secondary}`;
    }
  }

  return `基本分类: 工具 (Utilities)\n辅助分类: 生活 (Lifestyle)`;
}

function generateSupportPageZh(info: IProjectInfo): string {
  let content = '';
  content += `${info.appName} 客户支持\n\n`;
  content += `如果您在使用应用时遇到问题或需要帮助，请通过以下方式联系我们。\n\n`;
  content += `联系方式:\n`;
  content += `- 邮箱: support@example.com（请替换为实际邮箱地址）\n`;
  content += `- 响应时间: 1-2个工作日内\n\n`;
  content += `常见问题 (FAQ):\n\n`;
  content += `Q: 应用无法正常运行。\n`;
  content += `A: 请将应用更新到最新版本后重试。如果问题仍然存在，请删除并重新安装应用。\n\n`;
  content += `Q: 数据丢失了。\n`;
  content += `A: 应用数据存储在您的设备本地。删除应用可能会导致数据重置。\n\n`;
  content += `当前版本: ${info.version}\n`;
  return content;
}

function generatePrivacyPolicyZh(info: IProjectInfo): string {
  let policy = '';
  policy += `隐私政策\n\n`;
  policy += `最后更新日期：${new Date().toISOString().split('T')[0]}\n\n`;
  policy += `${info.appName}（以下简称"本应用"）重视用户的隐私保护。\n`;
  policy += `本隐私政策说明了本应用收集的信息及其使用方式。\n\n`;

  policy += `1. 收集的信息\n\n`;

  const collectedData: string[] = [];

  if (info.hasUserAuth) {
    collectedData.push('- 账户信息: 电子邮箱、用户名（注册时）');
  }

  if (info.hasAnalytics) {
    collectedData.push('- 使用数据: 应用使用模式、页面浏览记录（用于服务改进）');
    collectedData.push('- 设备信息: 设备型号、操作系统版本、应用版本');
  }

  if (info.hasAds) {
    collectedData.push('- 广告标识符: 用于个性化广告的广告ID（IDFA/GAID）');
  }

  if (collectedData.length === 0) {
    policy += `本应用不收集个人信息。所有数据均存储在用户设备本地，不会传输到外部服务器。\n\n`;
  } else {
    for (const item of collectedData) {
      policy += `${item}\n`;
    }
    policy += `\n`;
  }

  policy += `2. 信息使用目的\n\n`;
  policy += `收集的信息用于以下目的:\n`;
  policy += `- 提供和维护应用服务\n`;
  if (info.hasAnalytics) {
    policy += `- 分析应用使用情况并改进服务\n`;
  }
  if (info.hasAds) {
    policy += `- 提供个性化广告\n`;
  }
  policy += `\n`;

  policy += `3. 信息共享\n\n`;
  policy += `除法律要求外，本应用不会向第三方出售或共享用户的个人信息。\n`;
  if (info.hasAds) {
    policy += `但广告标识符可能会与广告合作伙伴（如Google AdMob）共享。\n`;
  }
  policy += `\n`;

  policy += `4. 数据安全\n\n`;
  policy += `我们采取适当的技术和管理安全措施来保护用户数据。\n\n`;

  policy += `5. 儿童隐私\n\n`;
  policy += `本应用不会故意收集13岁以下儿童的个人信息。\n\n`;

  policy += `6. 联系我们\n\n`;
  policy += `如对隐私政策有任何疑问，请通过 support@example.com（请替换为实际邮箱地址）与我们联系。\n`;

  return policy;
}

function generateReviewNotesZh(info: IProjectInfo): string {
  let notes = '';
  notes += `审核备注：\n\n`;
  notes += `应用名称: ${info.appName}\n`;
  notes += `Bundle ID: ${info.bundleId}\n`;
  notes += `版本: ${info.version}\n`;
  notes += `框架: ${info.framework}\n\n`;

  if (!info.hasUserAuth) {
    notes += `- 此应用无需登录即可使用。不需要测试账号。\n`;
  } else {
    notes += `- 测试账号:\n`;
    notes += `  邮箱: test@example.com（请替换为实际测试账号）\n`;
    notes += `  密码: testpassword（请替换为实际密码）\n`;
  }

  if (info.hasAds) {
    notes += `- 此应用包含通过Google AdMob提供的广告。\n`;
  }

  if (info.hasInAppPurchase) {
    notes += `- 此应用包含应用内购买。\n`;
  }

  notes += `\n所有功能在无网络连接的情况下也可基本使用。\n`;
  notes += `（请根据实际应用需求进行修改）\n`;

  return notes;
}

function generateContentRatingGuideZh(info: IProjectInfo): string {
  let guide = '';
  guide += `Google Play 内容分级指南：\n\n`;
  guide += `请在 Google Play Console > 应用内容 > 内容分级 中完成问卷调查。\n\n`;
  guide += `需要回答以下项目:\n\n`;

  guide += `1. 暴力内容: `;
  guide += `无（如不适用）\n`;

  guide += `2. 色情内容: `;
  guide += `无（如不适用）\n`;

  guide += `3. 语言: `;
  guide += `轻微（如包含一般文本）\n`;

  guide += `4. 毒品/酒精/烟草: `;
  guide += `无（如不适用）\n`;

  if (info.hasAds) {
    guide += `5. 广告: 是 - 应用包含广告\n`;
  } else {
    guide += `5. 广告: 否\n`;
  }

  if (info.hasInAppPurchase) {
    guide += `6. 应用内购买: 是 - 可购买数字商品\n`;
  } else {
    guide += `6. 应用内购买: 否\n`;
  }

  if (info.hasUserAuth) {
    guide += `7. 用户生成内容: 需确认（是否存在用户间互动）\n`;
  } else {
    guide += `7. 用户生成内容: 否\n`;
  }

  guide += `\n预计分级: 适合所有人 (Everyone) 或 12岁以上 (Everyone 12+)\n`;
  guide += `（可能因实际应用内容而有所不同）\n`;

  return guide;
}

function generateIOSAgeRatingGuide(info: IProjectInfo): string {
  let guide = '';

  guide += `=== iOS 연령 등급 설정 가이드 (7단계) ===\n\n`;
  guide += `프로젝트 분석을 기반으로 자동 생성된 연령 등급 답변입니다.\n`;
  guide += `실제 앱 콘텐츠에 맞게 검토 후 수정하세요.\n\n`;

  // Step 1: App Controls & Features
  guide += `--- 1단계: 앱 내 제어 및 제공 기능 ---\n\n`;
  guide += `[앱 내 제어]\n`;
  guide += `유해 콘텐츠 차단: 아니요\n`;
  guide += `  → 자녀 보호/모니터링 기능이 감지되지 않았습니다.\n`;
  guide += `나이 확인: 아니요\n`;
  guide += `  → 연령 확인 메커니즘이 감지되지 않았습니다.\n\n`;

  guide += `[제공 기능]\n`;
  guide += `제한되지 않은 웹 액세스: ${info.hasWebView ? '예' : '아니요'}\n`;
  if (info.hasWebView) {
    guide += `  → WebView 또는 브라우저 관련 의존성이 감지되었습니다.\n`;
  } else {
    guide += `  → 웹 브라우징 기능이 감지되지 않았습니다.\n`;
  }
  guide += `사용자 생성 콘텐츠: ${info.hasUGC ? '예' : '아니요'}\n`;
  if (info.hasUGC) {
    guide += `  → 사용자 콘텐츠 배포/공유 관련 기능이 감지되었습니다.\n`;
  } else {
    guide += `  → 사용자 콘텐츠 배포 기능이 감지되지 않았습니다.\n`;
  }
  guide += `메시지 및 채팅: ${info.hasChat ? '예' : '아니요'}\n`;
  if (info.hasChat) {
    guide += `  → 채팅/메시징 관련 의존성이 감지되었습니다.\n`;
  } else {
    guide += `  → 사용자 간 통신 기능이 감지되지 않았습니다.\n`;
  }
  guide += `광고: ${info.hasAds ? '예' : '아니요'}\n`;
  if (info.hasAds) {
    guide += `  → 광고 관련 의존성(AdMob 등)이 감지되었습니다.\n`;
  } else {
    guide += `  → 광고 관련 의존성이 감지되지 않았습니다.\n`;
  }
  guide += `\n`;

  // Step 2: Content Frequency
  guide += `--- 2단계: 콘텐츠 빈도 ---\n\n`;
  guide += `성적 테마: ${info.hasSexualContent ? '빈번' : '없음'}\n`;
  guide += `욕설 또는 노골적인 유머: 없음\n`;
  guide += `  → 욕설/노골적 유머 콘텐츠가 감지되지 않았습니다.\n`;
  guide += `잔혹/공포 테마: 없음\n`;
  guide += `  → 공포/잔혹 콘텐츠가 감지되지 않았습니다.\n`;
  guide += `음주, 흡연 또는 약물 사용: 없음\n`;
  guide += `  → 약물/음주/흡연 관련 콘텐츠가 감지되지 않았습니다.\n`;
  guide += `\n`;

  // Step 3: Medical/Health
  guide += `--- 3단계: 의료/건강 콘텐츠 ---\n\n`;
  guide += `의료 또는 치료 정보: ${info.hasHealthContent ? '드문' : '없음'}\n`;
  if (info.hasHealthContent) {
    guide += `  → 건강/의료 관련 의존성 또는 콘텐츠가 감지되었습니다.\n`;
  } else {
    guide += `  → 의료/치료 관련 콘텐츠가 감지되지 않았습니다.\n`;
  }
  guide += `건강 또는 웰빙 주제: ${info.hasHealthContent ? '예' : '아니요'}\n`;
  guide += `\n`;

  // Step 4: Sexual Content
  guide += `--- 4단계: 성적 콘텐츠 ---\n\n`;
  guide += `성적이거나 선정적인 테마: ${info.hasSexualContent ? '드문' : '없음'}\n`;
  guide += `성적인 내용 또는 노출: 없음\n`;
  guide += `노골적인 성적 내용 및 노출: 없음\n`;
  guide += `\n`;

  // Step 5: Violence
  guide += `--- 5단계: 폭력 콘텐츠 ---\n\n`;
  guide += `만화 또는 비현실적인 폭력: ${info.hasViolentContent ? '드문' : '없음'}\n`;
  guide += `적나라한 폭력: 없음\n`;
  guide += `잇따른 폭력의 생생한 묘사: 없음\n`;
  guide += `총 또는 기타 무기: ${info.hasViolentContent ? '드문' : '없음'}\n`;
  if (info.hasViolentContent) {
    guide += `  → 폭력/무기 관련 콘텐츠가 감지되었습니다. 실제 수준을 확인하세요.\n`;
  }
  guide += `\n`;

  // Step 6: Gambling
  guide += `--- 6단계: 도박/경쟁 콘텐츠 ---\n\n`;
  guide += `가상 도박: ${info.hasGambling ? '드문' : '없음'}\n`;
  guide += `시합: 없음\n`;
  guide += `도박: ${info.hasGambling ? '예' : '아니요'}\n`;
  guide += `랜덤 박스: ${info.hasLootBox ? '예' : '아니요'}\n`;
  if (info.hasGambling) {
    guide += `  → 도박 관련 콘텐츠가 감지되었습니다.\n`;
  }
  if (info.hasLootBox) {
    guide += `  → 랜덤 박스/가챠 관련 콘텐츠가 감지되었습니다.\n`;
  }
  guide += `\n`;

  // Step 7: Calculated Rating
  guide += `--- 7단계: 예상 등급 ---\n\n`;

  // Calculate expected rating
  let rating = '4+';
  if (info.hasSexualContent || info.hasGambling) {
    rating = '17+';
  } else if (info.hasViolentContent) {
    rating = '12+';
  } else if (info.hasWebView || info.hasUGC || info.hasChat) {
    rating = '12+';
  } else if (info.hasHealthContent) {
    rating = '12+';
  }

  guide += `예상 연령 등급: ${rating}\n`;
  guide += `연령 카테고리 재정의: 해당 없음\n\n`;

  // Summary table
  guide += `--- 답변 요약 ---\n\n`;
  guide += `| 단계 | 항목 | 답변 |\n`;
  guide += `|------|------|------|\n`;
  guide += `| 1 | 유해 콘텐츠 차단 | 아니요 |\n`;
  guide += `| 1 | 나이 확인 | 아니요 |\n`;
  guide += `| 1 | 제한되지 않은 웹 액세스 | ${info.hasWebView ? '예' : '아니요'} |\n`;
  guide += `| 1 | 사용자 생성 콘텐츠 | ${info.hasUGC ? '예' : '아니요'} |\n`;
  guide += `| 1 | 메시지 및 채팅 | ${info.hasChat ? '예' : '아니요'} |\n`;
  guide += `| 1 | 광고 | ${info.hasAds ? '예' : '아니요'} |\n`;
  guide += `| 2 | 성적 테마 | ${info.hasSexualContent ? '빈번' : '없음'} |\n`;
  guide += `| 2 | 욕설 또는 노골적인 유머 | 없음 |\n`;
  guide += `| 2 | 잔혹/공포 테마 | 없음 |\n`;
  guide += `| 2 | 음주/흡연/약물 | 없음 |\n`;
  guide += `| 3 | 의료 또는 치료 정보 | ${info.hasHealthContent ? '드문' : '없음'} |\n`;
  guide += `| 3 | 건강 또는 웰빙 주제 | ${info.hasHealthContent ? '예' : '아니요'} |\n`;
  guide += `| 4 | 성적이거나 선정적인 테마 | ${info.hasSexualContent ? '드문' : '없음'} |\n`;
  guide += `| 4 | 성적인 내용 또는 노출 | 없음 |\n`;
  guide += `| 4 | 노골적인 성적 내용 | 없음 |\n`;
  guide += `| 5 | 만화/비현실적 폭력 | ${info.hasViolentContent ? '드문' : '없음'} |\n`;
  guide += `| 5 | 적나라한 폭력 | 없음 |\n`;
  guide += `| 5 | 잇따른 폭력 묘사 | 없음 |\n`;
  guide += `| 5 | 총 또는 기타 무기 | ${info.hasViolentContent ? '드문' : '없음'} |\n`;
  guide += `| 6 | 가상 도박 | ${info.hasGambling ? '드문' : '없음'} |\n`;
  guide += `| 6 | 시합 | 없음 |\n`;
  guide += `| 6 | 도박 | ${info.hasGambling ? '예' : '아니요'} |\n`;
  guide += `| 6 | 랜덤 박스 | ${info.hasLootBox ? '예' : '아니요'} |\n`;
  guide += `| 7 | 예상 등급 | ${rating} |\n`;
  guide += `| 7 | 재정의 | 해당 없음 |\n`;

  return guide;
}

export async function handleGenerateStoreListing(args: IStoreListingArgs): Promise<CallToolResult> {
  const { projectDir, platform = 'both', language = 'ko' } = args;

  // Validate project directory
  if (!fs.existsSync(projectDir)) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: 프로젝트 디렉토리를 찾을 수 없습니다: ${projectDir}`,
        },
      ],
    };
  }

  // Extract project information
  const projectInfo = extractProjectInfo(projectDir);

  let output = '';
  output += `=== 스토어 등록 정보 생성 결과 ===\n`;
  output += `프로젝트: ${projectDir}\n`;
  output += `앱 이름: ${projectInfo.appName}\n`;
  output += `번들 ID: ${projectInfo.bundleId}\n`;
  output += `프레임워크: ${projectInfo.framework}\n`;
  output += `버전: ${projectInfo.version}\n`;
  const langNames: Record<TLanguage, string> = {
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    zh: '中文',
  };
  output += `언어: ${langNames[language]}\n`;
  output += `\n${'='.repeat(50)}\n\n`;

  if (platform === 'ios' || platform === 'both') {
    output += generateIOSListing(projectInfo, language);
    output += `\n${'='.repeat(50)}\n\n`;
  }

  if (platform === 'android' || platform === 'both') {
    output += generateAndroidListing(projectInfo, language);
    output += `\n${'='.repeat(50)}\n\n`;
  }

  // iOS Age Rating Guide
  if (platform === 'ios' || platform === 'both') {
    output += generateIOSAgeRatingGuide(projectInfo);
    output += `\n${'='.repeat(50)}\n\n`;
  }

  // Detected capabilities summary
  output += `=== 감지된 앱 특성 ===\n\n`;
  output += `광고 포함: ${projectInfo.hasAds ? '예' : '아니오'}\n`;
  output += `분석/통계: ${projectInfo.hasAnalytics ? '예' : '아니오'}\n`;
  output += `인앱 구매: ${projectInfo.hasInAppPurchase ? '예' : '아니오'}\n`;
  output += `사용자 인증: ${projectInfo.hasUserAuth ? '예' : '아니오'}\n`;
  output += `웹뷰: ${projectInfo.hasWebView ? '예' : '아니오'}\n`;
  output += `사용자 생성 콘텐츠: ${projectInfo.hasUGC ? '예' : '아니오'}\n`;
  output += `채팅/메시징: ${projectInfo.hasChat ? '예' : '아니오'}\n`;
  output += `도박: ${projectInfo.hasGambling ? '예' : '아니오'}\n`;
  output += `랜덤 박스: ${projectInfo.hasLootBox ? '예' : '아니오'}\n`;
  output += `건강/의료 콘텐츠: ${projectInfo.hasHealthContent ? '예' : '아니오'}\n`;
  output += `폭력 콘텐츠: ${projectInfo.hasViolentContent ? '예' : '아니오'}\n`;
  output += `성적 콘텐츠: ${projectInfo.hasSexualContent ? '예' : '아니오'}\n`;
  if (projectInfo.permissions.length > 0) {
    output += `감지된 권한: ${projectInfo.permissions.join(', ')}\n`;
  }
  output += `\n참고: 생성된 내용은 초안입니다. 실제 앱의 특성에 맞게 수정해 주세요.\n`;
  output += `"support@example.com" 등의 플레이스홀더는 실제 값으로 교체해 주세요.\n`;

  return { content: [{ type: 'text', text: output }] };
}

function generateIOSGuide(
  info: IProjectInfo | null,
  framework: TFramework,
): string {
  const bundleId = info?.bundleId ?? 'com.example.myapp';
  const appName = info?.appName ?? 'MyApp';
  const teamId = info?.teamId ?? 'YOUR_TEAM_ID';

  let guide = '';

  guide += `=== iOS App Store 등록 가이드 ===\n\n`;

  // Step 1
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `1단계: Apple Developer 계정 등록\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. https://developer.apple.com 에 접속합니다.\n`;
  guide += `2. "Account" 클릭 후 Apple ID로 로그인합니다.\n`;
  guide += `3. Apple Developer Program에 등록합니다.\n`;
  guide += `   - 개인: $99/년 (USD)\n`;
  guide += `   - 기업: $299/년 (USD)\n`;
  guide += `4. 결제 완료 후 승인까지 최대 48시간 소요됩니다.\n`;
  guide += `5. D-U-N-S Number가 필요할 수 있습니다 (기업의 경우).\n\n`;

  // Step 2
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `2단계: App ID (Bundle ID) 등록\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. Apple Developer Portal > Certificates, IDs & Profiles 이동\n`;
  guide += `2. Identifiers > "+" 버튼 클릭\n`;
  guide += `3. "App IDs" 선택 > "App" 타입 선택\n`;
  guide += `4. Description 입력: ${appName}\n`;
  guide += `5. Bundle ID 입력: ${bundleId}\n`;
  guide += `6. Capabilities에서 필요한 기능 체크:\n`;
  if (info?.hasInAppPurchase) {
    guide += `   - In-App Purchase (인앱 구매 사용 시)\n`;
  }
  guide += `   - Push Notifications (필요시)\n`;
  guide += `   - Sign in with Apple (필요시)\n`;
  guide += `7. "Register" 클릭하여 완료\n\n`;

  // Step 3
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `3단계: 인증서 & 프로비저닝 프로파일\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (framework === 'expo') {
    guide += `Expo를 사용하므로 EAS Build가 인증서를 자동 관리합니다.\n\n`;
    guide += `1. EAS CLI 설치 (이미 설치되어 있지 않은 경우):\n`;
    guide += `   npm install -g eas-cli\n\n`;
    guide += `2. EAS 로그인:\n`;
    guide += `   eas login\n\n`;
    guide += `3. EAS Build 설정:\n`;
    guide += `   eas build:configure\n\n`;
    guide += `4. 인증서 자동 생성 (빌드 시 자동 처리):\n`;
    guide += `   - EAS가 Distribution Certificate를 자동으로 생성/관리합니다.\n`;
    guide += `   - Provisioning Profile도 자동 생성됩니다.\n\n`;
    guide += `5. 수동 관리가 필요한 경우:\n`;
    guide += `   eas credentials\n\n`;
  } else {
    guide += `A. 배포 인증서 (Distribution Certificate) 생성:\n`;
    guide += `   1. Certificates > "+" 버튼 클릭\n`;
    guide += `   2. "Apple Distribution" 선택\n`;
    guide += `   3. CSR (Certificate Signing Request) 파일 생성:\n`;
    guide += `      - 키체인 접근 > 인증서 지원 > 인증서 요청\n`;
    guide += `      - "인증 기관에서 인증서 요청" 선택\n`;
    guide += `   4. CSR 파일 업로드 후 인증서 다운로드\n`;
    guide += `   5. 다운로드한 .cer 파일을 더블클릭하여 키체인에 등록\n\n`;

    guide += `B. 프로비저닝 프로파일 생성:\n`;
    guide += `   1. Profiles > "+" 버튼 클릭\n`;
    guide += `   2. "App Store Connect" (Distribution) 선택\n`;
    guide += `   3. App ID 선택: ${bundleId}\n`;
    guide += `   4. 인증서 선택 (위에서 생성한 Distribution Certificate)\n`;
    guide += `   5. 프로파일 이름 입력 후 "Generate" 클릭\n`;
    guide += `   6. 다운로드 후 더블클릭하여 Xcode에 설치\n\n`;
  }

  // Step 4
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `4단계: App Store Connect에서 앱 생성\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. https://appstoreconnect.apple.com 에 접속\n`;
  guide += `2. "나의 앱" > "+" > "신규 앱" 클릭\n`;
  guide += `3. 플랫폼: iOS 체크\n`;
  guide += `4. 앱 이름: ${appName}\n`;
  guide += `5. 기본 언어: 한국어 (Korean)\n`;
  guide += `6. 번들 ID: ${bundleId}\n`;
  guide += `7. SKU: ${bundleId.replace(/\./g, '-')}\n`;
  guide += `8. 사용자 액세스: 전체 액세스\n`;
  guide += `9. "생성" 클릭\n\n`;

  // Step 5
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `5단계: 스크린샷 요구사항\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `필수 스크린샷 (최소 1장, 최대 10장):\n\n`;
  guide += `iPhone 6.7인치 (필수):\n`;
  guide += `  - 크기: 1284 x 2778 px (세로) 또는 2778 x 1284 px (가로)\n`;
  guide += `  - 대상: iPhone 16 Pro Max, iPhone 15 Pro Max, iPhone 15 Plus, iPhone 14 Pro Max\n\n`;
  guide += `iPhone 6.5인치 (필수):\n`;
  guide += `  - 크기: 1242 x 2688 px (세로) 또는 2688 x 1242 px (가로)\n`;
  guide += `  - 대상: iPhone 11 Pro Max, iPhone XS Max\n\n`;
  guide += `iPhone 5.5인치:\n`;
  guide += `  - 크기: 1242 x 2208 px (세로) 또는 2208 x 1242 px (가로)\n`;
  guide += `  - 대상: iPhone 8 Plus, iPhone 7 Plus\n\n`;
  guide += `iPad 12.9인치 (iPad 지원 시):\n`;
  guide += `  - 크기: 2048 x 2732 px (세로) 또는 2732 x 2048 px (가로)\n`;
  guide += `  - 대상: iPad Pro 12.9인치\n\n`;
  guide += `스크린샷 팁:\n`;
  guide += `  - 실제 앱 화면에 설명 텍스트와 디자인 요소를 추가하면 효과적입니다.\n`;
  guide += `  - 첫 3장이 가장 중요합니다 (검색 결과에 노출).\n`;
  guide += `  - generate_screenshot 도구를 사용하여 AI로 스크린샷 목업을 생성할 수 있습니다.\n\n`;

  // Step 6
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `6단계: 메타데이터 입력\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `App Store Connect > 앱 정보에서 다음 항목을 입력합니다:\n\n`;
  guide += `- 앱 이름: 최대 30자\n`;
  guide += `- 부제목: 최대 30자\n`;
  guide += `- 설명: 최대 4000자\n`;
  guide += `- 키워드: 최대 100자 (쉼표로 구분)\n`;
  guide += `- 새로운 기능: 이번 버전의 변경 사항\n`;
  guide += `- 지원 URL: 사용자 지원 페이지 URL\n`;
  guide += `- 마케팅 URL: (선택) 앱 홍보 페이지 URL\n`;
  guide += `- 개인정보 처리방침 URL: (필수) 개인정보 처리방침 페이지 URL\n\n`;
  guide += `TIP: generate_store_listing 도구를 사용하면 이 내용을 자동으로 생성할 수 있습니다.\n\n`;

  // Step 7
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `7단계: 앱 개인정보 보호 설정\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `App Store Connect > 앱 개인정보 보호에서 데이터 수집 유형을 설정합니다.\n\n`;

  if (info && !info.hasAds && !info.hasAnalytics && !info.hasUserAuth) {
    guide += `이 앱은 데이터를 수집하지 않는 것으로 감지되었습니다.\n`;
    guide += `"데이터를 수집하지 않음"을 선택하면 됩니다.\n\n`;
  } else {
    guide += `감지된 데이터 수집 항목:\n`;
    if (info?.hasUserAuth) {
      guide += `  - 연락처 정보: 이메일 주소 (계정 기능)\n`;
      guide += `  - 식별자: 사용자 ID (계정 기능)\n`;
    }
    if (info?.hasAnalytics) {
      guide += `  - 사용 데이터: 제품 상호 작용 (분석)\n`;
      guide += `  - 진단: 성능 데이터 (앱 기능)\n`;
    }
    if (info?.hasAds) {
      guide += `  - 식별자: 기기 ID (광고)\n`;
      guide += `  - 사용 데이터: 광고 데이터 (제3자 광고)\n`;
    }
    guide += `\n각 항목에 대해 "사용자에게 연결됨" 또는 "사용자 추적에 사용됨" 여부를 설정합니다.\n\n`;
  }

  // Step 8
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `8단계: 연령 등급 설정\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `App Store Connect > 연령 등급에서 설문에 응답합니다.\n\n`;
  guide += `주요 질문 항목:\n`;
  guide += `  - 폭력적 또는 무섭거나 강렬한 콘텐츠\n`;
  guide += `  - 성인/외설적 콘텐츠\n`;
  guide += `  - 도박 (시뮬레이션 포함)\n`;
  guide += `  - 의료 또는 치료 정보\n`;
  guide += `  - 욕설 또는 저속한 유머\n`;
  guide += `  - 약물, 알코올, 담배 참조\n`;
  guide += `  - 무제한 웹 액세스\n\n`;
  guide += `앱 콘텐츠에 해당하는 항목을 정확히 체크하면 연령 등급이 자동으로 산정됩니다.\n\n`;

  // Step 9
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `9단계: 가격 및 배포 설정\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `App Store Connect > 가격 및 사용 가능 여부:\n\n`;
  guide += `1. 가격:\n`;
  guide += `   - 무료 앱: "무료" 선택\n`;
  guide += `   - 유료 앱: 가격대 선택 (예: $0.99, $1.99 등)\n`;
  guide += `   - 유료 앱의 경우 세금 및 은행 정보 설정이 필요합니다.\n\n`;
  guide += `2. 사용 가능 여부:\n`;
  guide += `   - 배포할 국가/지역 선택\n`;
  guide += `   - 출시 방법: 수동 출시 또는 자동 출시 선택\n\n`;

  // Step 10
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `10단계: 빌드 업로드\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (framework === 'expo') {
    guide += `Expo EAS Build를 사용하여 빌드합니다:\n\n`;
    guide += `1. eas.json 설정 확인:\n`;
    guide += `   {\n`;
    guide += `     "build": {\n`;
    guide += `       "production": {\n`;
    guide += `         "ios": {\n`;
    guide += `           "buildConfiguration": "Release",\n`;
    guide += `           "autoIncrement": true\n`;
    guide += `         }\n`;
    guide += `       }\n`;
    guide += `     },\n`;
    guide += `     "submit": {\n`;
    guide += `       "production": {\n`;
    guide += `         "ios": {\n`;
    guide += `           "appleId": "your-apple-id@example.com",\n`;
    guide += `           "ascAppId": "your-app-store-connect-app-id",\n`;
    guide += `           "appleTeamId": "${teamId}"\n`;
    guide += `         }\n`;
    guide += `       }\n`;
    guide += `     }\n`;
    guide += `   }\n\n`;
    guide += `2. 프로덕션 빌드 생성:\n`;
    guide += `   eas build --platform ios --profile production\n\n`;
    guide += `3. App Store Connect에 제출:\n`;
    guide += `   eas submit --platform ios --profile production\n\n`;
    guide += `4. 또는 빌드와 제출을 한 번에:\n`;
    guide += `   eas build --platform ios --profile production --auto-submit\n\n`;
  } else if (framework === 'react-native') {
    guide += `React Native 프로젝트 빌드:\n\n`;
    guide += `1. Xcode에서 프로젝트 열기:\n`;
    guide += `   open ios/${appName}.xcworkspace\n\n`;
    guide += `2. Xcode에서:\n`;
    guide += `   - Product > Scheme > Edit Scheme > Release 설정\n`;
    guide += `   - Product > Archive 실행\n`;
    guide += `   - Organizer에서 "Distribute App" 클릭\n`;
    guide += `   - "App Store Connect" 선택 > "Upload" 클릭\n\n`;
    guide += `3. 또는 Xcode CLI 사용:\n`;
    guide += `   xcodebuild -workspace ios/${appName}.xcworkspace \\\n`;
    guide += `     -scheme ${appName} \\\n`;
    guide += `     -configuration Release \\\n`;
    guide += `     -archivePath build/${appName}.xcarchive \\\n`;
    guide += `     archive\n\n`;
  } else {
    guide += `Xcode를 사용하여 빌드합니다:\n\n`;
    guide += `1. Xcode에서 프로젝트 열기\n`;
    guide += `2. Product > Archive 실행\n`;
    guide += `3. Organizer에서 "Distribute App" > "App Store Connect" > "Upload"\n\n`;
  }

  // Step 11
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `11단계: 심사 제출\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. App Store Connect에서 빌드가 "처리 완료" 상태인지 확인\n`;
  guide += `2. 빌드를 버전에 연결 (빌드 선택)\n`;
  guide += `3. 모든 메타데이터가 입력되었는지 확인:\n`;
  guide += `   - 스크린샷 업로드 완료\n`;
  guide += `   - 설명, 키워드 등 입력 완료\n`;
  guide += `   - 연령 등급 설정 완료\n`;
  guide += `   - 개인정보 보호 설정 완료\n`;
  guide += `4. "심사를 위해 제출" 클릭\n`;
  guide += `5. 심사 기간: 보통 24-48시간 (최대 7일)\n\n`;
  guide += `심사 거절 시 대응:\n`;
  guide += `  - 거절 사유를 Resolution Center에서 확인\n`;
  guide += `  - 문제 수정 후 재제출\n`;
  guide += `  - 이의가 있으면 Reply를 통해 항소 가능\n\n`;

  // Step 12
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `12단계: TestFlight 배포 (선택)\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `심사 제출 전 TestFlight로 베타 테스트를 진행할 수 있습니다:\n\n`;
  guide += `1. 내부 테스터 (최대 100명):\n`;
  guide += `   - App Store Connect > TestFlight > 내부 그룹\n`;
  guide += `   - Apple Developer 계정 멤버만 가능\n`;
  guide += `   - 빌드 업로드 후 즉시 테스트 가능 (별도 심사 불요)\n\n`;
  guide += `2. 외부 테스터 (최대 10,000명):\n`;
  guide += `   - App Store Connect > TestFlight > 외부 그룹\n`;
  guide += `   - 이메일 초대 또는 공개 링크로 초대\n`;
  guide += `   - 첫 빌드는 Beta App Review 필요 (보통 24시간 이내)\n\n`;

  if (framework === 'expo') {
    guide += `Expo EAS를 사용한 TestFlight 배포:\n`;
    guide += `   eas build --platform ios --profile production\n`;
    guide += `   eas submit --platform ios --profile production\n`;
    guide += `   (업로드 후 App Store Connect에서 TestFlight에 빌드가 자동으로 나타남)\n\n`;
  }

  return guide;
}

function generateAndroidGuide(
  info: IProjectInfo | null,
  framework: TFramework,
): string {
  const bundleId = info?.bundleId ?? 'com.example.myapp';
  const appName = info?.appName ?? 'MyApp';

  let guide = '';

  guide += `=== Google Play Store 등록 가이드 ===\n\n`;

  // Step 1
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `1단계: Google Play Console 계정 등록\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. https://play.google.com/console 에 접속\n`;
  guide += `2. Google 계정으로 로그인\n`;
  guide += `3. 개발자 계정 등록:\n`;
  guide += `   - 등록비: $25 (일회성, USD)\n`;
  guide += `   - 개인 또는 기업 계정 선택\n`;
  guide += `   - 신원 확인이 필요할 수 있습니다.\n`;
  guide += `4. 결제 프로필 설정 (유료 앱 또는 인앱 구매 시)\n`;
  guide += `5. 계정 승인까지 최대 48시간 소요\n\n`;

  // Step 2
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `2단계: 앱 생성\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `1. Google Play Console > "앱 만들기" 클릭\n`;
  guide += `2. 기본 정보 입력:\n`;
  guide += `   - 앱 이름: ${appName}\n`;
  guide += `   - 패키지명: ${bundleId}\n`;
  guide += `   - 기본 언어: 한국어\n`;
  guide += `   - 앱 또는 게임: 앱\n`;
  guide += `   - 무료 또는 유료: 선택\n`;
  guide += `3. 개발자 프로그램 정책 동의\n`;
  guide += `4. "앱 만들기" 클릭\n\n`;

  // Step 3
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `3단계: 스토어 등록정보 입력\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `Google Play Console > 스토어 등록정보 > 기본 스토어 등록정보:\n\n`;

  guide += `A. 앱 세부정보:\n`;
  guide += `   - 앱 이름: 최대 30자\n`;
  guide += `   - 간단한 설명: 최대 80자\n`;
  guide += `   - 자세한 설명: 최대 4000자\n\n`;

  guide += `B. 그래픽:\n`;
  guide += `   - 앱 아이콘: 512 x 512 px (PNG, 32-bit, alpha 포함)\n`;
  guide += `   - 그래픽 이미지 (Feature Graphic): 1024 x 500 px\n`;
  guide += `   - 스크린샷:\n`;
  guide += `     * 휴대전화: 최소 2장, 최대 8장\n`;
  guide += `       크기: 최소 320px, 최대 3840px (16:9 또는 9:16)\n`;
  guide += `     * 태블릿 (7인치): 선택사항, 최대 8장\n`;
  guide += `     * 태블릿 (10인치): 선택사항, 최대 8장\n\n`;

  guide += `C. 앱 카테고리:\n`;
  guide += `   - 앱 카테고리 선택\n`;
  guide += `   - 태그 추가 (최대 5개)\n`;
  guide += `   - 연락처 이메일 입력 (필수)\n\n`;

  guide += `TIP: generate_store_listing 도구를 사용하면 텍스트 내용을 자동으로 생성할 수 있습니다.\n\n`;

  // Step 4
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `4단계: 콘텐츠 등급 설정\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `Google Play Console > 앱 콘텐츠 > 콘텐츠 등급:\n\n`;
  guide += `1. "설문 시작" 클릭\n`;
  guide += `2. 이메일 주소 입력\n`;
  guide += `3. 앱 카테고리 선택 (유틸리티, 게임, 커뮤니케이션 등)\n`;
  guide += `4. 설문 응답:\n`;
  guide += `   - 폭력성, 성적 콘텐츠, 언어, 약물 관련 질문\n`;
  guide += `   - 사용자 생성 콘텐츠 여부\n`;
  guide += `   - 위치 정보 공유 여부\n`;
  guide += `5. "저장" > "다음" > "제출" 클릭\n\n`;
  guide += `등급이 자동으로 산정됩니다 (예: 전체 이용가, 만 12세 이상 등)\n\n`;

  // Step 5
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `5단계: 가격 및 배포 설정\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  guide += `Google Play Console > 수익 창출 설정:\n\n`;
  guide += `1. 앱 가격:\n`;
  guide += `   - 무료: 나중에 유료로 변경 불가\n`;
  guide += `   - 유료: 가격 설정 (국가별 가격 자동 변환)\n\n`;
  guide += `2. 배포 국가 선택:\n`;
  guide += `   - Google Play Console > 출시 > 프로덕션 > 국가 및 지역\n`;
  guide += `   - 배포할 국가/지역 선택\n\n`;
  guide += `3. 추가 설정:\n`;
  guide += `   - 앱 콘텐츠 > 개인정보 처리방침 URL (필수)\n`;
  guide += `   - 앱 콘텐츠 > 광고 포함 여부\n`;
  guide += `   - 앱 콘텐츠 > 데이터 안전 섹션 작성\n\n`;

  guide += `데이터 안전 섹션 작성 가이드:\n`;
  if (info) {
    if (!info.hasAds && !info.hasAnalytics && !info.hasUserAuth) {
      guide += `   이 앱은 데이터를 수집/공유하지 않는 것으로 감지되었습니다.\n`;
      guide += `   "데이터를 수집하거나 공유하지 않음"을 선택할 수 있습니다.\n\n`;
    } else {
      guide += `   감지된 데이터 수집:\n`;
      if (info.hasUserAuth) {
        guide += `   - 개인정보 (이메일, 이름)\n`;
      }
      if (info.hasAnalytics) {
        guide += `   - 앱 활동 (앱 상호작용, 검색 기록)\n`;
        guide += `   - 기기 또는 기타 ID\n`;
      }
      if (info.hasAds) {
        guide += `   - 기기 또는 기타 ID (광고 목적)\n`;
      }
      guide += `\n`;
    }
  }

  // Step 6
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `6단계: 앱 빌드 및 업로드\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  guide += `A. 앱 서명 설정:\n`;
  guide += `   Google Play Console > 설정 > 앱 서명에서 "Google Play 앱 서명"을 활성화합니다.\n`;
  guide += `   (Google이 앱 서명 키를 관리하며, 키 분실 위험이 없습니다.)\n\n`;

  if (framework === 'expo') {
    guide += `B. Expo EAS Build로 빌드:\n\n`;
    guide += `1. eas.json 설정 확인:\n`;
    guide += `   {\n`;
    guide += `     "build": {\n`;
    guide += `       "production": {\n`;
    guide += `         "android": {\n`;
    guide += `           "buildType": "app-bundle"\n`;
    guide += `         }\n`;
    guide += `       }\n`;
    guide += `     },\n`;
    guide += `     "submit": {\n`;
    guide += `       "production": {\n`;
    guide += `         "android": {\n`;
    guide += `           "serviceAccountKeyPath": "./google-play-key.json"\n`;
    guide += `         }\n`;
    guide += `       }\n`;
    guide += `     }\n`;
    guide += `   }\n\n`;
    guide += `2. Google Play Console 서비스 계정 키 생성:\n`;
    guide += `   - Google Cloud Console > IAM & Admin > Service Accounts\n`;
    guide += `   - 새 서비스 계정 생성 > 키 생성 (JSON)\n`;
    guide += `   - Google Play Console > 설정 > API 액세스에서 서비스 계정 연결\n\n`;
    guide += `3. 프로덕션 빌드 생성:\n`;
    guide += `   eas build --platform android --profile production\n\n`;
    guide += `4. Google Play에 제출:\n`;
    guide += `   eas submit --platform android --profile production\n\n`;
    guide += `5. 또는 빌드와 제출을 한 번에:\n`;
    guide += `   eas build --platform android --profile production --auto-submit\n\n`;
  } else if (framework === 'react-native') {
    guide += `B. React Native Android 빌드:\n\n`;
    guide += `1. 서명 키 생성 (최초 1회):\n`;
    guide += `   keytool -genkeypair -v -storetype PKCS12 -keystore ${appName}.keystore \\\n`;
    guide += `     -alias ${appName} -keyalg RSA -keysize 2048 -validity 10000\n\n`;
    guide += `2. android/app/build.gradle에 서명 설정 추가\n\n`;
    guide += `3. Release 빌드 생성:\n`;
    guide += `   cd android && ./gradlew bundleRelease\n\n`;
    guide += `4. AAB 파일 위치:\n`;
    guide += `   android/app/build/outputs/bundle/release/app-release.aab\n\n`;
    guide += `5. Google Play Console에 AAB 업로드\n\n`;
  } else {
    guide += `B. Android Studio에서 빌드:\n\n`;
    guide += `1. Build > Generate Signed Bundle/APK 선택\n`;
    guide += `2. Android App Bundle (AAB) 선택 (권장)\n`;
    guide += `3. 키스토어 선택 또는 새로 생성\n`;
    guide += `4. Release 빌드 생성\n`;
    guide += `5. Google Play Console에 AAB 업로드\n\n`;
  }

  // Step 7
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  guide += `7단계: 출시 관리\n`;
  guide += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  guide += `A. 출시 트랙 선택:\n`;
  guide += `   Google Play Console > 출시에서 트랙을 선택합니다:\n\n`;
  guide += `   - 내부 테스트: 최대 100명, 즉시 배포, 심사 불요\n`;
  guide += `   - 비공개 테스트 (Alpha): 이메일 목록으로 초대\n`;
  guide += `   - 공개 테스트 (Beta): 누구나 참여 가능\n`;
  guide += `   - 프로덕션: 모든 사용자에게 공개\n\n`;

  guide += `B. 단계적 출시 (Stage Rollout):\n`;
  guide += `   프로덕션 출시 시 단계적으로 사용자에게 배포할 수 있습니다:\n`;
  guide += `   - 예: 처음 10% → 25% → 50% → 100%\n`;
  guide += `   - 문제 발생 시 중단 가능\n\n`;

  guide += `C. 출시 절차:\n`;
  guide += `   1. 출시 트랙 선택 > "새 릴리스 만들기"\n`;
  guide += `   2. AAB 파일 업로드\n`;
  guide += `   3. 출시 이름 및 출시 노트 작성\n`;
  guide += `   4. "출시 검토" 클릭\n`;
  guide += `   5. "프로덕션에 출시 시작" 클릭\n\n`;

  guide += `D. 심사 기간:\n`;
  guide += `   - 신규 앱: 최대 7일 (보통 1-3일)\n`;
  guide += `   - 업데이트: 보통 수 시간 ~ 1일\n`;
  guide += `   - 정책 위반 시 거절될 수 있으며, 이메일로 사유가 통보됩니다.\n\n`;

  guide += `E. 앱 콘텐츠 필수 체크리스트:\n`;
  guide += `   출시 전 Google Play Console > 앱 콘텐츠에서 모든 항목을 완료해야 합니다:\n`;
  guide += `   - [ ] 개인정보 처리방침\n`;
  guide += `   - [ ] 광고\n`;
  guide += `   - [ ] 앱 액세스 권한\n`;
  guide += `   - [ ] 콘텐츠 등급\n`;
  guide += `   - [ ] 타겟 고객층\n`;
  guide += `   - [ ] 뉴스 앱 여부\n`;
  guide += `   - [ ] 코로나19 접촉 추적 앱 여부\n`;
  guide += `   - [ ] 데이터 안전\n`;
  guide += `   - [ ] 정부 앱 여부\n`;
  guide += `   - [ ] 금융 기능 여부\n\n`;

  return guide;
}

export async function handleGetPublishingGuide(args: IPublishingGuideArgs): Promise<CallToolResult> {
  const { platform, projectDir, framework: explicitFramework } = args;

  let projectInfo: IProjectInfo | null = null;
  let framework: TFramework = explicitFramework ?? 'native';

  // If projectDir is provided, extract project info
  if (projectDir && fs.existsSync(projectDir)) {
    projectInfo = extractProjectInfo(projectDir);
    framework = explicitFramework ?? projectInfo.framework;
  }

  let output = '';
  output += `=== 앱 스토어 등록 가이드 ===\n`;
  output += `플랫폼: ${platform === 'ios' ? 'iOS (App Store)' : 'Android (Google Play)'}\n`;
  output += `프레임워크: ${framework}\n`;
  if (projectInfo) {
    output += `앱 이름: ${projectInfo.appName}\n`;
    output += `번들 ID: ${projectInfo.bundleId}\n`;
  }
  output += `\n`;

  if (platform === 'ios') {
    output += generateIOSGuide(projectInfo, framework);
  } else {
    output += generateAndroidGuide(projectInfo, framework);
  }

  return { content: [{ type: 'text', text: output }] };
}
