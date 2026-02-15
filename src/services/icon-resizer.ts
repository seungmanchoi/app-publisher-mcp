import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { IIconSize, IResizeResult } from '../types/index.js';

const IOS_ICON_SIZES: IIconSize[] = [
  { name: 'Icon-20@2x', size: 40, platform: 'ios', scale: '2x' },
  { name: 'Icon-20@3x', size: 60, platform: 'ios', scale: '3x' },
  { name: 'Icon-29@2x', size: 58, platform: 'ios', scale: '2x' },
  { name: 'Icon-29@3x', size: 87, platform: 'ios', scale: '3x' },
  { name: 'Icon-40@2x', size: 80, platform: 'ios', scale: '2x' },
  { name: 'Icon-40@3x', size: 120, platform: 'ios', scale: '3x' },
  { name: 'Icon-60@2x', size: 120, platform: 'ios', scale: '2x' },
  { name: 'Icon-60@3x', size: 180, platform: 'ios', scale: '3x' },
  { name: 'Icon-20', size: 20, platform: 'ios', scale: '1x' },
  { name: 'Icon-29', size: 29, platform: 'ios', scale: '1x' },
  { name: 'Icon-40', size: 40, platform: 'ios', scale: '1x' },
  { name: 'Icon-76', size: 76, platform: 'ios', scale: '1x' },
  { name: 'Icon-76@2x', size: 152, platform: 'ios', scale: '2x' },
  { name: 'Icon-83.5@2x', size: 167, platform: 'ios', scale: '2x' },
  { name: 'Icon-1024', size: 1024, platform: 'ios', scale: '1x' },
];

const ANDROID_ICON_SIZES: IIconSize[] = [
  { name: 'ic_launcher', size: 48, platform: 'android', folder: 'mipmap-mdpi' },
  { name: 'ic_launcher', size: 72, platform: 'android', folder: 'mipmap-hdpi' },
  { name: 'ic_launcher', size: 96, platform: 'android', folder: 'mipmap-xhdpi' },
  { name: 'ic_launcher', size: 144, platform: 'android', folder: 'mipmap-xxhdpi' },
  { name: 'ic_launcher', size: 192, platform: 'android', folder: 'mipmap-xxxhdpi' },
  { name: 'playstore-icon', size: 512, platform: 'android', folder: '' },
];

export class IconResizerService {
  async resizeForAllPlatforms(
    sourcePath: string,
    outputDir: string,
    platforms: ('ios' | 'android')[] = ['ios', 'android'],
  ): Promise<IResizeResult[]> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source image not found: ${sourcePath}`);
    }

    const results: IResizeResult[] = [];

    if (platforms.includes('ios')) {
      const iosResults = await this.resizeForIOS(sourcePath, outputDir);
      results.push(...iosResults);
    }

    if (platforms.includes('android')) {
      const androidResults = await this.resizeForAndroid(sourcePath, outputDir);
      results.push(...androidResults);
    }

    return results;
  }

  private async resizeForIOS(sourcePath: string, outputDir: string): Promise<IResizeResult[]> {
    const iosDir = path.join(outputDir, 'ios', 'AppIcon.appiconset');
    if (!fs.existsSync(iosDir)) {
      fs.mkdirSync(iosDir, { recursive: true });
    }

    const results: IResizeResult[] = [];

    for (const iconSize of IOS_ICON_SIZES) {
      const outputPath = path.join(iosDir, `${iconSize.name}.png`);
      await sharp(sourcePath)
        .resize(iconSize.size, iconSize.size, { fit: 'cover' })
        .png()
        .toFile(outputPath);

      results.push({
        platform: 'ios',
        name: iconSize.name,
        size: iconSize.size,
        path: outputPath,
      });
    }

    const contentsJson = this.generateContentsJson();
    fs.writeFileSync(path.join(iosDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2));

    return results;
  }

  private async resizeForAndroid(sourcePath: string, outputDir: string): Promise<IResizeResult[]> {
    const androidDir = path.join(outputDir, 'android');
    const results: IResizeResult[] = [];

    for (const iconSize of ANDROID_ICON_SIZES) {
      const folderPath = iconSize.folder
        ? path.join(androidDir, iconSize.folder)
        : androidDir;

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const outputPath = path.join(folderPath, `${iconSize.name}.png`);
      await sharp(sourcePath)
        .resize(iconSize.size, iconSize.size, { fit: 'cover' })
        .png()
        .toFile(outputPath);

      results.push({
        platform: 'android',
        name: `${iconSize.folder ? iconSize.folder + '/' : ''}${iconSize.name}`,
        size: iconSize.size,
        path: outputPath,
      });
    }

    return results;
  }

  private generateContentsJson(): object {
    return {
      images: [
        { filename: 'Icon-20.png', idiom: 'ipad', scale: '1x', size: '20x20' },
        { filename: 'Icon-20@2x.png', idiom: 'iphone', scale: '2x', size: '20x20' },
        { filename: 'Icon-20@3x.png', idiom: 'iphone', scale: '3x', size: '20x20' },
        { filename: 'Icon-29.png', idiom: 'ipad', scale: '1x', size: '29x29' },
        { filename: 'Icon-29@2x.png', idiom: 'iphone', scale: '2x', size: '29x29' },
        { filename: 'Icon-29@3x.png', idiom: 'iphone', scale: '3x', size: '29x29' },
        { filename: 'Icon-40.png', idiom: 'ipad', scale: '1x', size: '40x40' },
        { filename: 'Icon-40@2x.png', idiom: 'iphone', scale: '2x', size: '40x40' },
        { filename: 'Icon-40@3x.png', idiom: 'iphone', scale: '3x', size: '40x40' },
        { filename: 'Icon-60@2x.png', idiom: 'iphone', scale: '2x', size: '60x60' },
        { filename: 'Icon-60@3x.png', idiom: 'iphone', scale: '3x', size: '60x60' },
        { filename: 'Icon-76.png', idiom: 'ipad', scale: '1x', size: '76x76' },
        { filename: 'Icon-76@2x.png', idiom: 'ipad', scale: '2x', size: '76x76' },
        { filename: 'Icon-83.5@2x.png', idiom: 'ipad', scale: '2x', size: '83.5x83.5' },
        { filename: 'Icon-1024.png', idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
      ],
      info: { author: 'app-publisher-mcp', version: 1 },
    };
  }
}

export const iconResizerService = new IconResizerService();
