import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IAppConfig, IAdMobConfig, IPlayStoreConfig } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.app-publisher');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_MODEL = 'gemini-2.5-flash-image';

class SettingsManager {
  private config: Partial<IAppConfig> = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
      }
    } catch {
      this.config = {};
    }
  }

  private persistConfig(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch {
      // Silently fail
    }
  }

  getApiKey(): string {
    return process.env.GEMINI_API_KEY ?? this.config.geminiApiKey ?? '';
  }

  setApiKey(key: string): void {
    this.config.geminiApiKey = key;
    this.persistConfig();
  }

  getModel(): string {
    return process.env.GEMINI_MODEL ?? this.config.geminiModel ?? DEFAULT_MODEL;
  }

  setModel(model: string): void {
    this.config.geminiModel = model;
    this.persistConfig();
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  getConfigSource(): string {
    if (process.env.GEMINI_API_KEY) return 'env';
    if (this.config.geminiApiKey) return 'config';
    return 'none';
  }

  getAdMobConfig(): IAdMobConfig | undefined {
    return this.config.admob;
  }

  setAdMobCredentials(clientId: string, clientSecret: string): void {
    this.config.admob = {
      ...this.config.admob,
      clientId,
      clientSecret,
    } as IAdMobConfig;
    this.persistConfig();
  }

  updateAdMobTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    if (!this.config.admob) {
      throw new Error('AdMob not configured');
    }
    this.config.admob.accessToken = accessToken;
    if (refreshToken) {
      this.config.admob.refreshToken = refreshToken;
    }
    if (expiresIn) {
      this.config.admob.tokenExpiry = Date.now() + expiresIn * 1000;
    }
    this.persistConfig();
  }

  updateAdMobAccountId(accountId: string): void {
    if (!this.config.admob) {
      throw new Error('AdMob not configured');
    }
    this.config.admob.accountId = accountId;
    this.persistConfig();
  }

  isAdMobConfigured(): boolean {
    const admob = this.config.admob;
    return !!(admob?.clientId && admob?.clientSecret && admob?.refreshToken);
  }

  // Play Store
  getPlayStoreConfig(): IPlayStoreConfig | undefined {
    return this.config.playStore;
  }

  setPlayStoreConfig(config: { jsonKeyPath?: string; jsonKeyData?: string; serviceAccountEmail?: string; projectId?: string }): void {
    this.config.playStore = {
      ...this.config.playStore,
      ...config,
    };
    this.persistConfig();
  }

  isPlayStoreConfigured(): boolean {
    const ps = this.config.playStore;
    return !!(ps?.jsonKeyPath || ps?.jsonKeyData);
  }
}

export const settingsManager = new SettingsManager();
