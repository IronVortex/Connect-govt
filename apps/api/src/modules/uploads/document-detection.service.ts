import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import * as fs from 'fs';
import sharp from 'sharp';
import * as path from 'path';

export type DetectionStatus = 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'NEEDS_REVIEW' | 'DETECTED';

export interface DocumentDetectionResult {
  detectedType: string;
  confidence: number;
  status: DetectionStatus;
  extractedText: string;
  matchedExpectedType?: string;
  reasons: string[];
}

interface DocumentPattern {
  type: string;
  keywords: Record<string, number>;
  patterns: Array<{ regex: RegExp; score: number }>;
  minConfidence: number;
}

@Injectable()
export class DocumentDetectionService {
  private readonly logger = new Logger(DocumentDetectionService.name);

  private readonly documentPatterns: DocumentPattern[] = [
    {
      type: 'Aadhaar Card',
      keywords: {
        'aadhaar': 8,
        'aadhar': 8,
        'uidai': 10,
        'government of india': 7,
        'unique identification': 8,
        'enrollment number': 9,
        'aadhaar number': 10,
        '12 digit': 7,
      },
      patterns: [
        { regex: /\d{4}\s*\d{4}\s*\d{4}/, score: 15 }, // Aadhaar 12-digit pattern
        { regex: /aadhaar\s*number/i, score: 15 },
        { regex: /enrollement\s*id|enrollment\s*id/i, score: 10 },
        { regex: /uid\s*number|uidai/i, score: 15 },
      ],
      minConfidence: 60,
    },
    {
      type: 'PAN Card',
      keywords: {
        'pan': 8,
        'permanent account number': 10,
        'income tax department': 9,
        'central board of direct taxes': 9,
        'pan number': 10,
        'tax identification': 8,
      },
      patterns: [
        { regex: /[A-Z]{5}[0-9]{4}[A-Z]{1}/, score: 20 }, // PAN format: XXXXX0000X
        { regex: /pan\s*number/i, score: 15 },
        { regex: /income\s*tax\s*department/i, score: 15 },
        { regex: /permanent\s*account\s*number/i, score: 15 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Passport',
      keywords: {
        'passport': 10,
        'republic of india': 9,
        'ministry of external affairs': 9,
        'valid passport': 8,
        'passport number': 10,
      },
      patterns: [
        { regex: /passport/i, score: 15 },
        { regex: /republic\s*of\s*india/i, score: 12 },
        { regex: /ministry\s*of\s*external\s*affairs/i, score: 15 },
        { regex: /[A-Z]{1}[0-9]{7}/, score: 12 }, // Passport number format
      ],
      minConfidence: 60,
    },
    {
      type: 'Driving License',
      keywords: {
        'driving license': 10,
        'driving licence': 10,
        'license number': 9,
        'licence number': 9,
        'date of issue': 7,
        'date of expiry': 7,
        'vehicle class': 8,
      },
      patterns: [
        { regex: /driving\s*licen[cs]e/i, score: 18 },
        { regex: /licen[cs]e\s*number/i, score: 15 },
        { regex: /date\s*of\s*issue|date\s*of\s*expiry/i, score: 10 },
        { regex: /vehicle\s*class|motor\s*vehicle/i, score: 10 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Birth Certificate',
      keywords: {
        'birth certificate': 10,
        'date of birth': 8,
        'certificate number': 9,
        'registrar': 7,
        'registration number': 8,
      },
      patterns: [
        { regex: /birth\s*certificate/i, score: 18 },
        { regex: /certificate\s*number/i, score: 15 },
        { regex: /registrar|registration\s*number/i, score: 12 },
        { regex: /date\s*of\s*birth/i, score: 10 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Proof of Address',
      keywords: {
        'proof of address': 10,
        'address proof': 10,
        'residential address': 8,
        'utility bill': 9,
        'property document': 9,
        'rent agreement': 8,
      },
      patterns: [
        { regex: /proof\s*of\s*address|address\s*proof/i, score: 18 },
        { regex: /utility\s*bill|electric\s*bill|water\s*bill|gas\s*bill/i, score: 15 },
        { regex: /rent\s*agreement|rental\s*agreement/i, score: 15 },
        { regex: /property\s*document|property\s*tax/i, score: 12 },
      ],
      minConfidence: 60,
    },
    {
      type: 'ID Card',
      keywords: {
        'id card': 9,
        'identification': 8,
        'voter id': 9,
        'employee id': 8,
        'school id': 8,
        'college id': 8,
      },
      patterns: [
        { regex: /id\s*card|identification\s*card/i, score: 16 },
        { regex: /voter\s*id|voter\s*identification/i, score: 15 },
        { regex: /employee\s*id|employee\s*identification/i, score: 12 },
        { regex: /school\s*id|college\s*id|student\s*id/i, score: 10 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Transfer Certificate',
      keywords: {
        'transfer certificate': 10,
        'leaving certificate': 10,
        'school leaving certificate': 12,
        'tc no': 8,
        'admission no': 7,
      },
      patterns: [
        { regex: /transfer\s*certificate|leaving\s*certificate/i, score: 18 },
        { regex: /tc\s*no|certificate\s*number/i, score: 12 },
        { regex: /school|college|institution/i, score: 10 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Income Certificate',
      keywords: {
        'income certificate': 12,
        'annual income': 10,
        'tahsildar': 8,
        'revenue department': 8,
        'total income': 7,
      },
      patterns: [
        { regex: /income\s*certificate/i, score: 18 },
        { regex: /annual\s*income|total\s*income/i, score: 15 },
        { regex: /tahsildar|revenue\s*officer/i, score: 12 },
        { regex: /(?:rs\.?|inr|₹)\s*[0-9,]+/i, score: 10 },
      ],
      minConfidence: 60,
    },
    {
      type: 'RC Book / Registration Certificate',
      keywords: {
        'registration certificate': 12,
        'rc book': 10,
        'form 23': 9,
        'chassis no': 8,
        'engine no': 8,
        'vehicle class': 7,
      },
      patterns: [
        { regex: /registration\s*certificate|certificate\s*of\s*registration/i, score: 18 },
        { regex: /chassis\s*no|engine\s*no/i, score: 15 },
        { regex: /reg[n]?\s*no/i, score: 12 },
        { regex: /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}/, score: 15 },
      ],
      minConfidence: 60,
    },
    {
      type: 'Pollution Certificate (PUC)',
      keywords: {
        'pollution under control': 12,
        'puc': 9,
        'pollution certificate': 10,
        'emission': 8,
        'carbon monoxide': 7,
      },
      patterns: [
        { regex: /pollution\s*under\s*control/i, score: 18 },
        { regex: /pollution\s*certificate|puc/i, score: 15 },
        { regex: /valid\s*till|valid\s*upto/i, score: 10 },
        { regex: /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}/, score: 10 },
      ],
      minConfidence: 60,
    },
  ];

  async detectDocument(
    filePath: string,
    mimeType: string,
    expectedType?: string,
  ): Promise<DocumentDetectionResult> {
    try {
      const extractedText = await this.extractText(filePath, mimeType);

      // Use the new detection flow which includes fallback handling
      const detectionResult = await this.detectDocumentFlow(extractedText, filePath, expectedType);
      this.logger.log(
        `Document detection: ${filePath} -> ${detectionResult.detectedType} (confidence: ${detectionResult.confidence}%, status: ${detectionResult.status})`,
      );
      return detectionResult;
    } catch (error: any) {
      this.logger.error(`Document detection failed for ${filePath}: ${error?.message}`);
      // As a last resort, attempt fallback detection based on filename
      return this.fallbackDetection(filePath, mimeType, expectedType);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async extractText(filePath: string, mimeType: string): Promise<string> {
    if (!(await this.fileExists(filePath))) {
      this.logger.warn(`File not found for OCR extraction: ${filePath}`);
      return '';
    }

    if (mimeType === 'application/pdf') {
      return this.extractTextFromPDF(filePath);
    }

    if (mimeType.startsWith('image/')) {
      return this.extractTextFromImage(filePath);
    }

    this.logger.warn(`Unsupported mime type for OCR extraction: ${mimeType}`);
    return '';
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const pdfData = await (pdfParse as any)(fileBuffer);
      const text = (pdfData.text || '').trim();

      if (text.length > 30) {
        this.logger.debug(`PDF text extraction succeeded with ${text.length} chars.`);
        return text;
      }

      this.logger.debug('PDF text extraction returned no usable text; falling back to PDF image OCR.');
      return this.extractTextFromPDFViaImage(fileBuffer);
    } catch (error: any) {
      this.logger.error(`PDF extraction failed: ${error?.message}`);
      return '';
    }
  }

  private async extractTextFromPDFViaImage(pdfBuffer: Buffer): Promise<string> {
    try {
      const imageBuffer = await sharp(pdfBuffer, { density: 300 })
        .png()
        .resize({ width: 2000 })
        .grayscale()
        .sharpen()
        .normalize()
        .toBuffer();

      return this.extractTextFromImageBuffer(imageBuffer);
    } catch (error: any) {
      this.logger.error(`PDF image conversion failed: ${error?.message}`);
      return '';
    }
  }

  private async extractTextFromImageBuffer(imageBuffer: Buffer): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.logger.debug(`OCR buffer extracted length: ${data.text?.length}`);
      return data.text || '';
    } catch (error: any) {
      this.logger.error(`OCR buffer extraction failed: ${error?.message}`);
      return '';
    }
  }

  private async extractTextFromImage(filePath: string): Promise<string> {
    try {
      this.logger.log(`Starting OCR for: ${filePath}`);
      const { data } = await Tesseract.recognize(filePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      return data.text || '';
    } catch (error: any) {
      this.logger.error(`OCR extraction failed: ${error?.message}`);
      return '';
    }
  }

  private classifyDocument(text: string, expectedType?: string): DocumentDetectionResult {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    // Score each document type
    for (const pattern of this.documentPatterns) {
      scores[pattern.type] = this.calculateScore(lowerText, pattern);
    }

    // Find best match
    const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const [bestMatch, bestScore] = sortedScores[0];

    // Determine confidence and status
    const confidence = Math.min(Math.round(bestScore), 100);
    let status: DetectionStatus;
    const reasons: string[] = [];

    if (bestScore < 30) {
      status = 'UNKNOWN';
      reasons.push('Confidence too low to classify document');
    } else if (bestScore >= 80) {
      if (expectedType && this.normalizeDocumentType(bestMatch) === this.normalizeDocumentType(expectedType)) {
        status = 'MATCHED';
        reasons.push(`Document matches expected type: ${expectedType}`);
      } else if (expectedType) {
        status = 'MISMATCHED';
        reasons.push(`Expected ${expectedType}, but detected ${bestMatch}`);
      } else {
        status = 'DETECTED';
        reasons.push(`Document confidently detected as ${bestMatch}`);
      }
    } else if (bestScore >= 40) {
      status = 'NEEDS_REVIEW';
      reasons.push(`Document partially identified as ${bestMatch} - requires review`);
      reasons.push(`Confidence is moderate (${confidence}%)`);
    } else {
      status = 'UNKNOWN';
      reasons.push('Unable to confidently classify document');
    }

    return {
      detectedType: bestMatch,
      confidence,
      status,
      extractedText: text,
      matchedExpectedType: expectedType,
      reasons,
    };
  }

  private calculateScore(text: string, pattern: DocumentPattern): number {
    let score = 0;

    // Check keywords
    for (const [keyword, weight] of Object.entries(pattern.keywords)) {
      if (text.includes(keyword.toLowerCase())) {
        score += weight;
      }
    }

    // Check regex patterns
    for (const { regex, score: patternScore } of pattern.patterns) {
      if (regex.test(text)) {
        score += patternScore;
      }
    }

    return score;
  }

  private normalizeDocumentType(type: string): string {
    return type.toLowerCase().replace(/\s+/g, '');
  }

  // Preprocess image for OCR using sharp
  private async preprocessImage(imagePath: string): Promise<string> {
    const tmpDir = path.join(__dirname, '../../tmp');
    try {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    } catch (e) {}
    const processedPath = path.join(tmpDir, `processed_${Date.now()}.png`);
    try {
      await sharp(imagePath)
        .resize({ width: 2000 })
        .grayscale()
        .sharpen()
        .normalize()
        .toFile(processedPath);
      return processedPath;
    } catch (e) {
      this.logger.error(`Image preprocessing failed: ${(e as any)?.message}`);
      return imagePath; // fallback
    }
  }

  // Heuristic fallback detection based on filename and mime type
  private fallbackDetection(filePath: string, mimeType: string, expectedType?: string): DocumentDetectionResult {
    const basename = path.basename(filePath).toLowerCase();
    const matchedPattern = this.documentPatterns.find(p =>
      Object.keys(p.keywords).some(k => basename.includes(k)));
    if (matchedPattern) {
      return {
        detectedType: matchedPattern.type,
        confidence: 55,
        status: expectedType
          ? this.normalizeDocumentType(matchedPattern.type) === this.normalizeDocumentType(expectedType)
            ? 'MATCHED'
            : 'MISMATCHED'
          : 'DETECTED',
        extractedText: '',
        matchedExpectedType: expectedType,
        reasons: ['Fallback detection based on filename heuristics'],
      };
    }
    return {
      detectedType: 'UNKNOWN',
      confidence: 0,
      status: 'UNKNOWN',
      extractedText: '',
      matchedExpectedType: expectedType,
      reasons: ['Unable to detect document via OCR or heuristics'],
    };
  }

  // Updated detection flow with fallback handling
  private async detectDocumentFlow(extractedText: string, filePath: string, expectedType?: string): Promise<DocumentDetectionResult> {
    const detectionResult = this.classifyDocument(extractedText, expectedType);
    detectionResult.extractedText = extractedText.substring(0, 5000);
    if (detectionResult.status === 'UNKNOWN' || detectionResult.confidence < 40) {
      this.logger.warn(`Low OCR confidence (${detectionResult.confidence}%). Attempting fallback detection.`);
      return this.fallbackDetection(filePath, '', expectedType);
    }
    return detectionResult;
  }
}

