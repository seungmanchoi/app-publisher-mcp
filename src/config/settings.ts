import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IAppConfig } from '../types/index.js';

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
}

export const settingsManager = new SettingsManager();
