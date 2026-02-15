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
