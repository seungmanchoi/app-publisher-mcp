import { GoogleGenAI } from '@google/genai';
import { TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { settingsManager } from '../config/index.js';

type TContentItem = TextContent | ImageContent;

export class GeminiService {
  private getClient(): GoogleGenAI {
    const apiKey = settingsManager.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Use configure_api_key tool first.');
    }
    return new GoogleGenAI({ apiKey });
  }

  private resolveModel(override?: string): string {
    return override ?? settingsManager.getModel();
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private generateFilename(prefix: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${suffix}.png`;
  }

  async generateIcon(
    prompt: string,
    outputDir: string,
    model?: string,
  ): Promise<{ content: TContentItem[]; imagePath: string }> {
    const client = this.getClient();
    const modelId = this.resolveModel(model);
    this.ensureDir(outputDir);

    const enhancedPrompt = `Create an app icon design: ${prompt}. The icon should be perfectly square, clean, modern, suitable for mobile app stores. No rounded corners (the OS handles rounding). High resolution, centered composition, simple and recognizable at small sizes. No text unless specifically requested.`;

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      config: { responseModalities: ['Text', 'Image'] },
    });

    return this.processResponse(response, outputDir, 'icon');
  }

  async generateSplash(
    prompt: string,
    outputDir: string,
    model?: string,
  ): Promise<{ content: TContentItem[]; imagePath: string }> {
    const client = this.getClient();
    const modelId = this.resolveModel(model);
    this.ensureDir(outputDir);

    const enhancedPrompt = `Create a splash screen design: ${prompt}. The design should be clean and centered with the app branding prominently featured. Suitable for a mobile app launch screen. Simple background, professional and modern look. Portrait orientation.`;

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      config: { responseModalities: ['Text', 'Image'] },
    });

    return this.processResponse(response, outputDir, 'splash');
  }

  async generateScreenshot(
    prompt: string,
    outputDir: string,
    model?: string,
  ): Promise<{ content: TContentItem[]; imagePath: string }> {
    const client = this.getClient();
    const modelId = this.resolveModel(model);
    this.ensureDir(outputDir);

    const enhancedPrompt = `Create an app store screenshot mockup: ${prompt}. The screenshot should look like a real mobile app screen, modern UI design, clean layout, suitable for App Store or Google Play listing. Show the app in use with realistic content.`;

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      config: { responseModalities: ['Text', 'Image'] },
    });

    return this.processResponse(response, outputDir, 'screenshot');
  }

  async editImageWithPrompt(
    imagePath: string,
    prompt: string,
    outputDir: string,
    prefix: string,
    model?: string,
  ): Promise<{ content: TContentItem[]; imagePath: string }> {
    const client = this.getClient();
    const modelId = this.resolveModel(model);
    this.ensureDir(outputDir);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png';

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      }],
      config: { responseModalities: ['Image', 'Text'] },
    });

    return this.processResponse(response, outputDir, prefix);
  }

  private processResponse(
    response: { candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> } }> },
    outputDir: string,
    prefix: string,
  ): { content: TContentItem[]; imagePath: string } {
    const content: TContentItem[] = [];
    let imagePath = '';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          content.push({ type: 'text' as const, text: part.text });
        }
        if (part.inlineData?.data) {
          const filename = this.generateFilename(prefix);
          imagePath = path.join(outputDir, filename);

          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(imagePath, imageBuffer);

          content.push({
            type: 'image' as const,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? 'image/png',
          });
          content.push({
            type: 'text' as const,
            text: `Image saved to: ${imagePath}`,
          });
        }
      }
    }

    if (content.length === 0) {
      content.push({ type: 'text' as const, text: 'No image was generated. Try a different prompt or model.' });
    }

    return { content, imagePath };
  }
}

export const geminiService = new GeminiService();
