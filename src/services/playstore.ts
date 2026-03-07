import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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
  jsonKeyPath: string;
  serviceAccountEmail?: string;
  projectId?: string;
  errors: string[];
  warnings: string[];
}

export class PlayStoreService {
  validateJsonKey(jsonKeyPath: string): IPlayStoreValidationResult {
    const result: IPlayStoreValidationResult = {
      valid: false,
      jsonKeyPath,
      errors: [],
      warnings: [],
    };

    const resolvedPath = jsonKeyPath.startsWith('~')
      ? path.join(process.env.HOME ?? '', jsonKeyPath.slice(1))
      : path.resolve(jsonKeyPath);

    if (!fs.existsSync(resolvedPath)) {
      result.errors.push(`JSON key file not found: ${resolvedPath}`);
      return result;
    }

    let keyData: IServiceAccountJson;
    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      keyData = JSON.parse(content) as IServiceAccountJson;
    } catch {
      result.errors.push('Failed to parse JSON key file. Ensure it is valid JSON.');
      return result;
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
    result.jsonKeyPath = resolvedPath;

    if (!keyData.client_email.includes('iam.gserviceaccount.com')) {
      result.warnings.push(
        `Service account email doesn't look standard: ${keyData.client_email}`,
      );
    }

    return result;
  }

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

  testConnection(projectDir: string): { success: boolean; message: string } {
    const config = settingsManager.getPlayStoreConfig();
    if (!config) {
      return { success: false, message: 'Play Store not configured. Run configure_playstore first.' };
    }

    try {
      // Test using fastlane supply with validate_only
      const result = execSync(
        'fastlane supply init --track production 2>&1 || true',
        {
          cwd: projectDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: { ...process.env },
        },
      );

      if (result.includes('Error') || result.includes('error')) {
        return { success: false, message: result.trim() };
      }

      return { success: true, message: 'Successfully connected to Google Play Console API.' };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { success: false, message: err.message ?? 'Unknown error' };
    }
  }
}

export const playStoreService = new PlayStoreService();
