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

export type TLanguage = 'ko' | 'en';

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
  teamId?: string;
  dependencies: string[];
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
