import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { geminiService } from './gemini.js';
import { IStoreScreenshotSize, IStoreScreenshotResult } from '../types/index.js';

const IOS_SCREENSHOT_SIZES: IStoreScreenshotSize[] = [
  { name: 'iPhone_6.7', width: 1284, height: 2778, platform: 'ios', device: 'iPhone 6.7"', required: true },
  { name: 'iPhone_6.5', width: 1242, height: 2688, platform: 'ios', device: 'iPhone 6.5"', required: true },
  { name: 'iPhone_5.5', width: 1242, height: 2208, platform: 'ios', device: 'iPhone 5.5"', required: false },
  { name: 'iPad_12.9', width: 2048, height: 2732, platform: 'ios', device: 'iPad 12.9"', required: false },
];

const ANDROID_SCREENSHOT_SIZES: IStoreScreenshotSize[] = [
  { name: 'Phone', width: 1080, height: 1920, platform: 'android', device: 'Phone', required: true },
  { name: 'Tablet_7', width: 1200, height: 1920, platform: 'android', device: 'Tablet 7"', required: false },
  { name: 'Tablet_10', width: 1920, height: 1200, platform: 'android', device: 'Tablet 10"', required: false },
];

export class StoreScreenshotService {
  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  getSizes(platform: 'ios' | 'android' | 'both'): IStoreScreenshotSize[] {
    if (platform === 'ios') return IOS_SCREENSHOT_SIZES;
    if (platform === 'android') return ANDROID_SCREENSHOT_SIZES;
    return [...IOS_SCREENSHOT_SIZES, ...ANDROID_SCREENSHOT_SIZES];
  }

  async createStoreScreenshot(args: {
    screenshotPath: string;
    headline: string;
    platform: 'ios' | 'android' | 'both';
    backgroundColor?: string;
    textColor?: string;
    outputDir: string;
    model?: string;
    devices?: string[];
  }): Promise<{ results: IStoreScreenshotResult[]; geminiImagePath: string }> {
    if (!fs.existsSync(args.screenshotPath)) {
      throw new Error(`Screenshot not found: ${args.screenshotPath}`);
    }

    this.ensureDir(args.outputDir);

    const bgColor = args.backgroundColor ?? '#FFFFFF';
    const txtColor = args.textColor ?? '#000000';

    const geminiPrompt = `Create a professional app store marketing screenshot.
Place the provided app screenshot in the lower 70% of the image inside a clean phone mockup frame.
Add this headline text in the top 25% area: "${args.headline}"
Background color: ${bgColor}
Text color: ${txtColor}
The text should be large, bold, and clearly readable.
Keep the design clean, modern, and professional like Apple or Google store screenshots.
Do NOT add any extra text, watermarks, or logos. Only the headline and the app screenshot.
Output as a vertical/portrait image.`;

    const geminiResult = await geminiService.editImageWithPrompt(
      args.screenshotPath,
      geminiPrompt,
      args.outputDir,
      'store_base',
      args.model,
    );

    if (!geminiResult.imagePath) {
      throw new Error('Gemini failed to generate the marketing screenshot.');
    }

    const allSizes = this.getSizes(args.platform);
    const targetSizes = args.devices
      ? allSizes.filter((s) => args.devices!.includes(s.name) || args.devices!.includes(s.device))
      : allSizes.filter((s) => s.required);

    const results = await this.resizeToStoreSizes(geminiResult.imagePath, targetSizes, args.outputDir);

    return { results, geminiImagePath: geminiResult.imagePath };
  }

  private async resizeToStoreSizes(
    sourcePath: string,
    sizes: IStoreScreenshotSize[],
    outputDir: string,
  ): Promise<IStoreScreenshotResult[]> {
    const results: IStoreScreenshotResult[] = [];

    for (const size of sizes) {
      const platformDir = path.join(outputDir, size.platform);
      this.ensureDir(platformDir);

      const filename = `store_${size.name}_${size.width}x${size.height}.png`;
      const outputPath = path.join(platformDir, filename);

      await sharp(sourcePath)
        .resize(size.width, size.height, { fit: 'cover', position: 'center' })
        .png()
        .toFile(outputPath);

      results.push({
        platform: size.platform,
        device: size.device,
        width: size.width,
        height: size.height,
        path: outputPath,
      });
    }

    return results;
  }
}

export const storeScreenshotService = new StoreScreenshotService();
