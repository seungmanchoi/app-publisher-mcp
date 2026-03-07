import * as fs from 'fs';
import * as path from 'path';
import { settingsManager } from '../config/index.js';

interface IServiceAccountJson {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export interface IPlayStoreValidationResult {
  valid: boolean;
  jsonKeyPath?: string;
  serviceAccountEmail?: string;
  projectId?: string;
  errors: string[];
  warnings: string[];
}

export class PlayStoreService {
  /**
   * Validate JSON key from file path or inline JSON string.
   */
  validateJsonKey(jsonKeyPathOrData: string): IPlayStoreValidationResult {
    const result: IPlayStoreValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
    };

    let keyData: IServiceAccountJson;

    // Try parsing as inline JSON first
    if (jsonKeyPathOrData.trimStart().startsWith('{')) {
      try {
        keyData = JSON.parse(jsonKeyPathOrData) as IServiceAccountJson;
      } catch {
        result.errors.push('Failed to parse inline JSON data.');
        return result;
      }
    } else {
      // Treat as file path
      const resolvedPath = jsonKeyPathOrData.startsWith('~')
        ? path.join(process.env.HOME ?? '', jsonKeyPathOrData.slice(1))
        : path.resolve(jsonKeyPathOrData);

      if (!fs.existsSync(resolvedPath)) {
        result.errors.push(`JSON key file not found: ${resolvedPath}`);
        return result;
      }

      try {
        const content = fs.readFileSync(resolvedPath, 'utf-8');
        keyData = JSON.parse(content) as IServiceAccountJson;
      } catch {
        result.errors.push('Failed to parse JSON key file.');
        return result;
      }

      result.jsonKeyPath = resolvedPath;
    }

    if (keyData.type !== 'service_account') {
      result.errors.push(`Invalid key type: "${keyData.type}". Expected "service_account".`);
      return result;
    }

    const requiredFields: (keyof IServiceAccountJson)[] = [
      'project_id',
      'private_key',
      'client_email',
      'token_uri',
    ];

    for (const field of requiredFields) {
      if (!keyData[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    result.valid = true;
    result.serviceAccountEmail = keyData.client_email;
    result.projectId = keyData.project_id;

    if (!keyData.client_email.includes('iam.gserviceaccount.com')) {
      result.warnings.push(
        `Service account email doesn't look standard: ${keyData.client_email}`,
      );
    }

    return result;
  }

  /**
   * Write JSON key to a project's fastlane/keys directory.
   * Accepts file path or inline JSON data from config.
   */
  writeKeyToProject(projectDir: string): string {
    const config = settingsManager.getPlayStoreConfig();
    if (!config) {
      throw new Error('Play Store not configured.');
    }

    const keysDir = path.join(projectDir, 'fastlane', 'keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    const destPath = path.join(keysDir, 'play-store-service-account.json');

    if (config.jsonKeyData) {
      // Write inline data
      fs.writeFileSync(destPath, config.jsonKeyData);
    } else if (config.jsonKeyPath) {
      // Copy from file
      const resolvedSource = config.jsonKeyPath.startsWith('~')
        ? path.join(process.env.HOME ?? '', config.jsonKeyPath.slice(1))
        : path.resolve(config.jsonKeyPath);
      fs.copyFileSync(resolvedSource, destPath);
    } else {
      throw new Error('No JSON key data or path configured.');
    }

    // Ensure .gitignore includes the key
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('fastlane/keys/')) {
        fs.appendFileSync(gitignorePath, '\n# Fastlane keys (service account, API keys)\nfastlane/keys/\n');
      }
    }

    return destPath;
  }

  /**
   * Copy key from file path to project (legacy support).
   */
  copyKeyToProject(jsonKeyPath: string, projectDir: string): string {
    const resolvedSource = jsonKeyPath.startsWith('~')
      ? path.join(process.env.HOME ?? '', jsonKeyPath.slice(1))
      : path.resolve(jsonKeyPath);

    const keysDir = path.join(projectDir, 'fastlane', 'keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    const destPath = path.join(keysDir, 'play-store-service-account.json');
    fs.copyFileSync(resolvedSource, destPath);

    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('fastlane/keys/')) {
        fs.appendFileSync(gitignorePath, '\n# Fastlane keys (service account, API keys)\nfastlane/keys/\n');
      }
    }

    return destPath;
  }
}

export const playStoreService = new PlayStoreService();
