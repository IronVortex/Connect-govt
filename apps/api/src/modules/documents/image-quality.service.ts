import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageQualityResult {
  qualityScore: number;
  warnings: string[];
  recommendations: string[];
}

@Injectable()
export class ImageQualityService {
  private readonly logger = new Logger(ImageQualityService.name);

  async analyze(buffer: Buffer, mimeType?: string): Promise<ImageQualityResult> {
    const tStart = performance.now();
    this.logger.log(`[Layer 1] Starting Image Quality Analysis`);
    
    if (mimeType === 'application/pdf') {
      // For PDFs, we assume good quality for now, or we'd need to extract images first.
      return {
        qualityScore: 90,
        warnings: [],
        recommendations: [],
      };
    }

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      let qualityScore = 100;
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // 1. Resolution Check
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      if (width < 600 || height < 600) {
        warnings.push('Image resolution is very low');
        recommendations.push('Please upload a higher resolution image');
        qualityScore -= 20;
      }

      // 2. Brightness & Contrast (Exposure)
      // Average luminance
      const luminance = stats.channels.length > 0 ? stats.channels[0].mean : 128;
      const stdev = stats.channels.length > 0 ? stats.channels[0].stdev : 50;

      if (luminance < 40) {
        warnings.push('Image is underexposed (too dark)');
        recommendations.push('Ensure good lighting when taking the photo');
        qualityScore -= 15;
      } else if (luminance > 220) {
        warnings.push('Image is overexposed (too bright / glare)');
        recommendations.push('Avoid reflections or direct flash');
        qualityScore -= 15;
      }

      if (stdev < 20) {
        warnings.push('Image has very low contrast');
        recommendations.push('Ensure the document stands out from the background');
        qualityScore -= 10;
      }

      // 3. Blur & Noise estimation (Heuristic using sharp)
      // We can use the edge detection (convolution) to estimate blur (Laplacian variance)
      const laplacianKernel: sharp.Kernel = {
        width: 3,
        height: 3,
        kernel: [
          0,  1, 0,
          1, -4, 1,
          0,  1, 0
        ],
      };
      
      const edgeImage = await sharp(buffer)
        .grayscale()
        .convolve(laplacianKernel)
        .stats();
        
      const blurVariance = Math.pow(edgeImage.channels[0].stdev, 2);
      
      if (blurVariance < 100) {
        warnings.push('Image is blurry');
        recommendations.push('Hold the camera steady and focus on the document text');
        qualityScore -= 25;
      }

      // 4. Rotation Check
      // Sharp's metadata might have orientation (EXIF)
      if (metadata.orientation && metadata.orientation > 1) {
        warnings.push('Image might be rotated');
        qualityScore -= 5;
      }

      this.logger.log(`[Layer 1] Success - Quality Score: ${qualityScore} (${Math.round(performance.now() - tStart)}ms)`);

      return {
        qualityScore: Math.max(0, qualityScore),
        warnings,
        recommendations,
      };
    } catch (error: any) {
      this.logger.error(`[Layer 1] Analysis failed: ${error.message}`);
      return {
        qualityScore: 50,
        warnings: ['Unable to fully analyze image quality'],
        recommendations: ['Ensure the file is a valid image'],
      };
    }
  }
}
