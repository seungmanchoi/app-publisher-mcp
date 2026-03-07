import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GoogleAuth } from 'google-auth-library';
import { settingsManager } from '../config/index.js';

const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

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

export interface IPlayStoreListing {
  language: string;
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
}

export interface IPlayStoreTrack {
  track: string;
  releases: {
    name?: string;
    versionCodes?: string[];
    status?: string;
    releaseNotes?: { language: string; text: string }[];
  }[];
}

export interface IPlayStoreImage {
  id: string;
  url: string;
  sha1: string;
  sha256: string;
}

export class PlayStoreService {
  private async getAuthClient(): Promise<GoogleAuth> {
    const config = settingsManager.getPlayStoreConfig();
    if (!config) {
      throw new Error('Play Store not configured. Run configure_playstore first.');
    }

    let credentials: IServiceAccountJson;

    if (config.jsonKeyData) {
      credentials = JSON.parse(config.jsonKeyData) as IServiceAccountJson;
    } else if (config.jsonKeyPath) {
      const resolvedPath = config.jsonKeyPath.startsWith('~')
        ? path.join(os.homedir(), config.jsonKeyPath.slice(1))
        : config.jsonKeyPath;
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      credentials = JSON.parse(content) as IServiceAccountJson;
    } else {
      throw new Error('No JSON key data or path configured.');
    }

    return new GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }

  private async apiRequest(
    method: string,
    url: string,
    body?: unknown,
    contentType?: string,
  ): Promise<{ status: number; data: unknown }> {
    const auth = await this.getAuthClient();
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    } else if (body && !(body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = body instanceof Buffer ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    let data: unknown;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: response.status, data };
  }

  // === Edit session management ===

  private async createEdit(packageName: string): Promise<string> {
    const { status, data } = await this.apiRequest(
      'POST',
      `${API_BASE}/${packageName}/edits`,
      {},
    );
    if (status !== 200) {
      throw new Error(`Failed to create edit: ${JSON.stringify(data)}`);
    }
    return (data as { id: string }).id;
  }

  private async commitEdit(packageName: string, editId: string): Promise<void> {
    const { status, data } = await this.apiRequest(
      'POST',
      `${API_BASE}/${packageName}/edits/${editId}:commit`,
    );
    if (status !== 200) {
      throw new Error(`Failed to commit edit: ${JSON.stringify(data)}`);
    }
  }

  private async deleteEdit(packageName: string, editId: string): Promise<void> {
    await this.apiRequest(
      'DELETE',
      `${API_BASE}/${packageName}/edits/${editId}`,
    );
  }

  // === Public API methods ===

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

    if (jsonKeyPathOrData.trimStart().startsWith('{')) {
      try {
        keyData = JSON.parse(jsonKeyPathOrData) as IServiceAccountJson;
      } catch {
        result.errors.push('Failed to parse inline JSON data.');
        return result;
      }
    } else {
      const resolvedPath = jsonKeyPathOrData.startsWith('~')
        ? path.join(os.homedir(), jsonKeyPathOrData.slice(1))
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
      'project_id', 'private_key', 'client_email', 'token_uri',
    ];

    for (const field of requiredFields) {
      if (!keyData[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    if (result.errors.length > 0) return result;

    result.valid = true;
    result.serviceAccountEmail = keyData.client_email;
    result.projectId = keyData.project_id;

    if (!keyData.client_email.includes('iam.gserviceaccount.com')) {
      result.warnings.push(`Service account email doesn't look standard: ${keyData.client_email}`);
    }

    return result;
  }

  /**
   * Verify API access by creating and deleting an edit session.
   */
  async verifyAccess(packageName: string): Promise<{ success: boolean; message: string }> {
    try {
      const editId = await this.createEdit(packageName);
      await this.deleteEdit(packageName, editId);
      return { success: true, message: `Access verified for ${packageName}` };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { success: false, message: err.message ?? 'Unknown error' };
    }
  }

  /**
   * Get all localized store listings for an app.
   */
  async getListings(packageName: string): Promise<IPlayStoreListing[]> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'GET',
        `${API_BASE}/${packageName}/edits/${editId}/listings`,
      );
      await this.deleteEdit(packageName, editId);

      if (status !== 200) {
        throw new Error(`Failed to get listings: ${JSON.stringify(data)}`);
      }

      const response = data as { listings?: IPlayStoreListing[] };
      return response.listings ?? [];
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Get store listing for a specific language.
   */
  async getListing(packageName: string, language: string): Promise<IPlayStoreListing> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'GET',
        `${API_BASE}/${packageName}/edits/${editId}/listings/${language}`,
      );
      await this.deleteEdit(packageName, editId);

      if (status !== 200) {
        throw new Error(`Failed to get listing for ${language}: ${JSON.stringify(data)}`);
      }

      return data as IPlayStoreListing;
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Update store listing for a specific language.
   */
  async updateListing(
    packageName: string,
    language: string,
    listing: Omit<IPlayStoreListing, 'language'>,
  ): Promise<IPlayStoreListing> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'PUT',
        `${API_BASE}/${packageName}/edits/${editId}/listings/${language}`,
        { language, ...listing },
      );

      if (status !== 200) {
        await this.deleteEdit(packageName, editId);
        throw new Error(`Failed to update listing: ${JSON.stringify(data)}`);
      }

      await this.commitEdit(packageName, editId);
      return data as IPlayStoreListing;
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Get all tracks (release channels) for an app.
   */
  async getTracks(packageName: string): Promise<IPlayStoreTrack[]> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'GET',
        `${API_BASE}/${packageName}/edits/${editId}/tracks`,
      );
      await this.deleteEdit(packageName, editId);

      if (status !== 200) {
        throw new Error(`Failed to get tracks: ${JSON.stringify(data)}`);
      }

      const response = data as { tracks?: IPlayStoreTrack[] };
      return response.tracks ?? [];
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * List images for a specific image type and language.
   */
  async listImages(
    packageName: string,
    language: string,
    imageType: string,
  ): Promise<IPlayStoreImage[]> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'GET',
        `${API_BASE}/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
      );
      await this.deleteEdit(packageName, editId);

      if (status !== 200) {
        throw new Error(`Failed to list images: ${JSON.stringify(data)}`);
      }

      const response = data as { images?: IPlayStoreImage[] };
      return response.images ?? [];
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Upload an image (screenshot, icon, etc.) for a specific language and type.
   */
  async uploadImage(
    packageName: string,
    language: string,
    imageType: string,
    imagePath: string,
  ): Promise<IPlayStoreImage> {
    const resolvedPath = imagePath.startsWith('~')
      ? path.join(os.homedir(), imagePath.slice(1))
      : path.resolve(imagePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }

    const imageBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] ?? 'image/png';

    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'POST',
        `${API_BASE}/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
        imageBuffer,
        contentType,
      );

      if (status !== 200) {
        await this.deleteEdit(packageName, editId);
        throw new Error(`Failed to upload image: ${JSON.stringify(data)}`);
      }

      await this.commitEdit(packageName, editId);
      return (data as { image: IPlayStoreImage }).image;
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Delete all images of a specific type for a language.
   */
  async deleteAllImages(
    packageName: string,
    language: string,
    imageType: string,
  ): Promise<void> {
    const editId = await this.createEdit(packageName);
    try {
      const { status, data } = await this.apiRequest(
        'DELETE',
        `${API_BASE}/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
      );

      if (status !== 200 && status !== 204) {
        await this.deleteEdit(packageName, editId);
        throw new Error(`Failed to delete images: ${JSON.stringify(data)}`);
      }

      await this.commitEdit(packageName, editId);
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  /**
   * Get app details (basically just verifies the app exists and returns edit info).
   */
  async getAppDetails(packageName: string): Promise<{
    packageName: string;
    listings: IPlayStoreListing[];
    tracks: IPlayStoreTrack[];
  }> {
    const listings = await this.getListings(packageName);
    const tracks = await this.getTracks(packageName);
    return { packageName, listings, tracks };
  }

  // === Legacy file operations ===

  writeKeyToProject(projectDir: string): string {
    const config = settingsManager.getPlayStoreConfig();
    if (!config) throw new Error('Play Store not configured.');

    const keysDir = path.join(projectDir, 'fastlane', 'keys');
    if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });

    const destPath = path.join(keysDir, 'play-store-service-account.json');

    if (config.jsonKeyData) {
      fs.writeFileSync(destPath, config.jsonKeyData);
    } else if (config.jsonKeyPath) {
      const resolvedSource = config.jsonKeyPath.startsWith('~')
        ? path.join(os.homedir(), config.jsonKeyPath.slice(1))
        : path.resolve(config.jsonKeyPath);
      fs.copyFileSync(resolvedSource, destPath);
    } else {
      throw new Error('No JSON key data or path configured.');
    }

    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('fastlane/keys/')) {
        fs.appendFileSync(gitignorePath, '\n# Fastlane keys (service account, API keys)\nfastlane/keys/\n');
      }
    }

    return destPath;
  }

  copyKeyToProject(jsonKeyPath: string, projectDir: string): string {
    const resolvedSource = jsonKeyPath.startsWith('~')
      ? path.join(os.homedir(), jsonKeyPath.slice(1))
      : path.resolve(jsonKeyPath);

    const keysDir = path.join(projectDir, 'fastlane', 'keys');
    if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });

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
