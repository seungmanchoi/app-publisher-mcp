export interface IAppConfig {
  geminiApiKey: string;
  geminiModel?: string;
}

export interface IIconSize {
  name: string;
  size: number;
  platform: 'ios' | 'android';
  scale?: string;
  folder?: string;
}

export interface IResizeResult {
  platform: string;
  name: string;
  size: number;
  path: string;
}

export interface IFastlaneConfig {
  projectDir: string;
  appIdentifier: string;
  appName: string;
  teamId?: string;
  itunesConnectTeamId?: string;
  jsonKeyFile?: string;
  packageName?: string;
}

export type TPlatform = 'ios' | 'android' | 'both';

export type TLanguage = 'ko' | 'en' | 'ja' | 'zh';

export interface IStoreMetadata {
  appName: string;
  subtitle: string;
  description: string;
  keywords: string;
  whatsNew: string;
  category: string;
  shortDescription?: string;
  contentRating?: string;
  supportPage: string;
  privacyPolicy: string;
  reviewNotes: string;
}

export type TFramework = 'expo' | 'react-native' | 'flutter' | 'native';

export interface IProjectInfo {
  appName: string;
  bundleId: string;
  version: string;
  description: string;
  features: string[];
  framework: TFramework;
  permissions: string[];
  hasAds: boolean;
  hasAnalytics: boolean;
  hasInAppPurchase: boolean;
  hasUserAuth: boolean;
  hasWebView: boolean;
  hasUGC: boolean;
  hasChat: boolean;
  hasGambling: boolean;
  hasLootBox: boolean;
  hasHealthContent: boolean;
  hasViolentContent: boolean;
  hasSexualContent: boolean;
  teamId?: string;
  dependencies: string[];
}

export type TAgeRatingAnswer = 'none' | 'infrequent' | 'frequent';
export type TYesNo = 'yes' | 'no';

export interface IIOSAgeRatingStep1 {
  parentalControls: TYesNo;
  ageVerification: TYesNo;
  unrestrictedWebAccess: TYesNo;
  userGeneratedContent: TYesNo;
  messagingAndChat: TYesNo;
  ads: TYesNo;
}

export interface IIOSAgeRatingStep2 {
  sexualThemes: TAgeRatingAnswer;
  profanity: TAgeRatingAnswer;
  horrorThemes: TAgeRatingAnswer;
  drugAlcoholTobacco: TAgeRatingAnswer;
}

export interface IIOSAgeRatingStep3 {
  medicalInfo: TAgeRatingAnswer;
  healthTopics: TYesNo;
}

export interface IIOSAgeRatingStep4 {
  sexualSuggestiveThemes: TAgeRatingAnswer;
  sexualContentNudity: TAgeRatingAnswer;
  explicitSexualContent: TAgeRatingAnswer;
}

export interface IIOSAgeRatingStep5 {
  cartoonViolence: TAgeRatingAnswer;
  realisticViolence: TAgeRatingAnswer;
  graphicViolence: TAgeRatingAnswer;
  gunsWeapons: TAgeRatingAnswer;
}

export interface IIOSAgeRatingStep6 {
  simulatedGambling: TAgeRatingAnswer;
  contests: TAgeRatingAnswer;
  gambling: TYesNo;
  lootBox: TYesNo;
}

export interface IIOSAgeRatingStep7 {
  calculatedRating: string;
  ageOverride: 'none' | 'children' | 'higher';
}

export interface IIOSAgeRating {
  step1: IIOSAgeRatingStep1;
  step2: IIOSAgeRatingStep2;
  step3: IIOSAgeRatingStep3;
  step4: IIOSAgeRatingStep4;
  step5: IIOSAgeRatingStep5;
  step6: IIOSAgeRatingStep6;
  step7: IIOSAgeRatingStep7;
}

// App Privacy Data Types
export type TPrivacyDataUsage =
  | 'third_party_advertising'
  | 'developer_advertising'
  | 'analytics'
  | 'product_personalization'
  | 'app_functionality'
  | 'other';

export interface IPrivacyDataType {
  name: string;
  nameKo: string;
  collected: boolean;
  usages: TPrivacyDataUsage[];
  linkedToIdentity: boolean;
  usedForTracking: boolean;
  reason: string;
}

export interface IAppPrivacyGuide {
  collectsData: boolean;
  dataTypes: IPrivacyDataType[];
}

export interface IStoreListingArgs {
  projectDir: string;
  platform?: TPlatform;
  language?: TLanguage;
}

export interface IPublishingGuideArgs {
  platform: 'ios' | 'android';
  projectDir?: string;
  framework?: TFramework;
}

export interface IStoreScreenshotSize {
  name: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
  device: string;
  required: boolean;
}

export interface IStoreScreenshotResult {
  platform: string;
  device: string;
  width: number;
  height: number;
  path: string;
}
