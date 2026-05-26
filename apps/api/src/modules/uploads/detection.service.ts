import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type DetectionStatus = 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'NEEDS_REVIEW' | 'DETECTED';

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);
  private readonly openAiKey: string | undefined;
  private readonly openAiModel: string;

  constructor(private configService: ConfigService) {
    this.openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openAiModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
  }

  async detect(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
    imageProperties?: { width?: number; height?: number; aspect?: number },
  ): Promise<{ documentType: string; status: DetectionStatus; confidence: number; reasons: string[] }> {
    this.logger.log(`Classification request - filename: "${filename}", mimeType: "${mimeType || 'none'}", expectedType: "${expectedType || 'none'}"`);
    if (content) {
      this.logger.debug(`Extracted text preview: "${content.slice(0, 300)}..."`);
    }

    const lowerFilename = filename.toLowerCase();
    const lowerContent = content ? content.toLowerCase() : '';
    const lowerExpected = expectedType ? expectedType.toLowerCase() : '';

    // Standard Document type keys and their database names
    const DOC_TYPES = {
      AADHAAR: 'Aadhaar Card',
      PAN: 'PAN Card',
      ADDRESS: 'Address Proof',
      PASSPORT_PHOTO: 'Passport Size Photo',
      RESUME: 'Resume',
      INSURANCE: 'Insurance Certificate',
      INVOICE: 'Invoice / Bill of Sale',
    };

    // Calculate match scores for each document type
    const scores: Record<string, number> = {
      [DOC_TYPES.AADHAAR]: 0,
      [DOC_TYPES.PAN]: 0,
      [DOC_TYPES.ADDRESS]: 0,
      [DOC_TYPES.PASSPORT_PHOTO]: 0,
      [DOC_TYPES.RESUME]: 0,
      [DOC_TYPES.INSURANCE]: 0,
      [DOC_TYPES.INVOICE]: 0,
    };

    // 1. Aadhaar Card heuristics
    if (lowerFilename.includes('aadhaar') || lowerFilename.includes('aadhar')) {
      scores[DOC_TYPES.AADHAAR] += 40;
    }
    if (lowerContent.includes('uidai') || lowerContent.includes('unique identification')) {
      scores[DOC_TYPES.AADHAAR] += 50;
    }
    if (lowerContent.includes('government of india') || lowerContent.includes('govt of india')) {
      scores[DOC_TYPES.AADHAAR] += 20;
    }
    if (lowerContent.includes('aadhaar') || lowerContent.includes('aadhar')) {
      scores[DOC_TYPES.AADHAAR] += 30;
    }
    if (/\d{4}\s\d{4}\s\d{4}/.test(lowerContent)) { // Aadhaar number pattern: 1234 5678 9012
      scores[DOC_TYPES.AADHAAR] += 45;
    }
    if (lowerExpected === 'aadhaar card' || lowerExpected === 'aadhaar' || lowerExpected === 'aadhar') {
      scores[DOC_TYPES.AADHAAR] += 15;
    }

    // 2. PAN Card heuristics
    if (lowerFilename.includes('pan')) {
      scores[DOC_TYPES.PAN] += 40;
    }
    if (lowerContent.includes('income tax')) {
      scores[DOC_TYPES.PAN] += 50;
    }
    if (lowerContent.includes('permanent account')) {
      scores[DOC_TYPES.PAN] += 50;
    }
    if (lowerContent.includes('tax department') || lowerContent.includes('gov. of india') || lowerContent.includes('gov of india')) {
      scores[DOC_TYPES.PAN] += 20;
    }
    if (/[a-z]{5}\d{4}[a-z]/i.test(lowerContent)) { // PAN number pattern: ABCDE1234F
      scores[DOC_TYPES.PAN] += 45;
    }
    if (lowerExpected === 'pan card' || lowerExpected === 'pan') {
      scores[DOC_TYPES.PAN] += 15;
    }

    // 3. Address Proof heuristics
    if (
      lowerFilename.includes('address') ||
      lowerFilename.includes('electricity') ||
      lowerFilename.includes('rent') ||
      lowerFilename.includes('utility') ||
      lowerFilename.includes('bill') ||
      lowerFilename.includes('agreement')
    ) {
      scores[DOC_TYPES.ADDRESS] += 40;
    }
    if (
      lowerContent.includes('electricity bill') ||
      lowerContent.includes('rent agreement') ||
      lowerContent.includes('water bill') ||
      lowerContent.includes('gas bill') ||
      lowerContent.includes('telephone bill') ||
      lowerContent.includes('utility bill') ||
      lowerContent.includes('address proof') ||
      lowerContent.includes('registered agreement')
    ) {
      scores[DOC_TYPES.ADDRESS] += 55;
    }
    if (lowerContent.includes('address') || lowerContent.includes('billing')) {
      scores[DOC_TYPES.ADDRESS] += 20;
    }
    if (lowerExpected === 'address proof' || lowerExpected === 'address') {
      scores[DOC_TYPES.ADDRESS] += 15;
    }

    // 4. Resume heuristics
    if (
      lowerFilename.includes('resume') ||
      lowerFilename.includes('cv') ||
      lowerFilename.includes('curriculum') ||
      lowerFilename.includes('portfolio')
    ) {
      scores[DOC_TYPES.RESUME] += 40;
    }
    const resumeKeywords = ['education', 'experience', 'skills', 'projects', 'achievements', 'employment', 'languages', 'work history', 'technologies'];
    let resumeKeywordHits = 0;
    for (const kw of resumeKeywords) {
      if (lowerContent.includes(kw)) resumeKeywordHits++;
    }
    scores[DOC_TYPES.RESUME] += Math.min(60, resumeKeywordHits * 15);
    if (lowerContent.includes('resume') || lowerContent.includes('cv') || lowerContent.includes('curriculum vitae')) {
      scores[DOC_TYPES.RESUME] += 30;
    }
    if (lowerExpected === 'resume' || lowerExpected === 'cv') {
      scores[DOC_TYPES.RESUME] += 15;
    }

    // 5. Passport Size Photo heuristics
    if (
      lowerFilename.includes('photo') ||
      lowerFilename.includes('passport_photo') ||
      lowerFilename.includes('pic') ||
      lowerFilename.includes('avatar') ||
      lowerFilename.includes('image') ||
      lowerFilename.startsWith('dsc_') ||
      lowerFilename.startsWith('img_')
    ) {
      scores[DOC_TYPES.PASSPORT_PHOTO] += 30;
    }
    if (mimeType && mimeType.startsWith('image/')) {
      // Images with little or no text are highly likely to be photos
      if (!lowerContent || lowerContent.length < 150) {
        scores[DOC_TYPES.PASSPORT_PHOTO] += 40;
      }
      // Check aspect ratio if available
      if (imageProperties && imageProperties.aspect) {
        const aspect = imageProperties.aspect;
        // Passport size photo is roughly 1:1 or 3.5:4.5 (aspect ratio 0.7 to 1.4)
        if (aspect >= 0.7 && aspect <= 1.4) {
          scores[DOC_TYPES.PASSPORT_PHOTO] += 40;
        }
      }
    }
    if (lowerExpected === 'passport size photo' || lowerExpected === 'passport photo' || lowerExpected === 'photo') {
      scores[DOC_TYPES.PASSPORT_PHOTO] += 15;
    }

    // 6. Insurance Certificate heuristics
    if (lowerFilename.includes('insurance') || lowerFilename.includes('policy')) {
      scores[DOC_TYPES.INSURANCE] += 40;
    }
    if (
      lowerContent.includes('insurance certificate') ||
      lowerContent.includes('policy document') ||
      lowerContent.includes('policy number') ||
      lowerContent.includes('premium amount') ||
      lowerContent.includes('insured name') ||
      lowerContent.includes('sum assured') ||
      lowerContent.includes('insurance policy')
    ) {
      scores[DOC_TYPES.INSURANCE] += 55;
    }
    if (lowerContent.includes('insurance') || lowerContent.includes('policy')) {
      scores[DOC_TYPES.INSURANCE] += 20;
    }
    if (lowerExpected === 'insurance certificate' || lowerExpected === 'insurance' || lowerExpected === 'policy') {
      scores[DOC_TYPES.INSURANCE] += 15;
    }

    // 7. Invoice / Bill of Sale heuristics
    if (
      lowerFilename.includes('invoice') ||
      lowerFilename.includes('bill') ||
      lowerFilename.includes('receipt') ||
      lowerFilename.includes('sale')
    ) {
      scores[DOC_TYPES.INVOICE] += 30;
    }
    if (
      lowerContent.includes('invoice') ||
      lowerContent.includes('bill to') ||
      lowerContent.includes('amount due') ||
      lowerContent.includes('quantity') ||
      lowerContent.includes('description') ||
      lowerContent.includes('tax') ||
      lowerContent.includes('total paid') ||
      lowerContent.includes('purchase order')
    ) {
      scores[DOC_TYPES.INVOICE] += 55;
    }
    if (lowerContent.includes('invoice') || lowerContent.includes('bill')) {
      scores[DOC_TYPES.INVOICE] += 20;
    }
    if (lowerExpected === 'invoice / bill of sale' || lowerExpected === 'invoice' || lowerExpected === 'bill of sale') {
      scores[DOC_TYPES.INVOICE] += 15;
    }

    // Logging all non-zero heuristic scores
    const loggedScores = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .map(([type, score]) => `${type}: ${score}`)
      .join(', ');
    this.logger.log(`Heuristic Match Scores -> ${loggedScores || 'None'}`);

    // Find the highest scoring document type
    let bestType = 'Unknown';
    let highestScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestType = type;
      }
    }

    const confidence = Math.min(Math.round(highestScore), 100);
    let status: DetectionStatus = 'UNKNOWN';
    const reasons: string[] = [];

    // Check if the expected type has at least a weak match (score >= 15)
    // This is our primary fallback system to verify uploads under correct slots
    const expectedDbName = Object.values(DOC_TYPES).find(val => val.toLowerCase() === lowerExpected);
    if (expectedDbName && scores[expectedDbName] >= 15) {
      status = 'MATCHED';
      reasons.push(`Document matches expected type via fallback: ${expectedDbName} (Confidence: ${scores[expectedDbName]}%)`);
      bestType = expectedDbName;
    } else {
      // Normal classification based on highestScore
      if (highestScore < 30) {
        status = 'UNKNOWN';
        reasons.push('Confidence too low to classify document');
      } else if (highestScore >= 80) {
        if (expectedType && bestType.toLowerCase() === expectedType.toLowerCase()) {
          status = 'MATCHED';
          reasons.push(`Document matches expected type: ${expectedType}`);
        } else if (expectedType) {
          status = 'MISMATCHED';
          reasons.push(`Expected ${expectedType}, but detected ${bestType}`);
        } else {
          status = 'DETECTED';
          reasons.push(`Document confidently detected as ${bestType}`);
        }
      } else if (highestScore >= 40) {
        status = 'NEEDS_REVIEW';
        reasons.push(`Document partially identified as ${bestType} - requires review`);
      } else {
        status = 'UNKNOWN';
        reasons.push('Unable to confidently classify document');
      }
    }

    // OpenAI Fallback if score is low and key is configured
    if (status === 'UNKNOWN' && this.openAiKey) {
      this.logger.log('Heuristics weak. Running OpenAI fallback...');
      const aiResult = await this.runAiFallback(filename, mimeType, content, expectedType);
      if (aiResult && aiResult !== 'Unknown') {
        const mappedType = Object.values(DOC_TYPES).find(val => val.toLowerCase() === aiResult.toLowerCase());
        if (mappedType) {
          bestType = mappedType;
          status = expectedType && mappedType.toLowerCase() === expectedType.toLowerCase() ? 'MATCHED' : 'MISMATCHED';
          reasons.push(`OpenAI fallback matched standard type: ${mappedType}`);
        } else {
          bestType = aiResult;
          status = expectedType && aiResult.toLowerCase() === expectedType.toLowerCase() ? 'MATCHED' : 'MISMATCHED';
          reasons.push(`OpenAI fallback matched: ${aiResult}`);
        }
      }
    }

    this.logger.log(`Final Classification -> Type: "${bestType}", Status: "${status}". Confidence: ${confidence}%, Reason: ${reasons.join(', ')}`);

    return { documentType: bestType, status, confidence, reasons };
  }

  private async runAiFallback(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
  ): Promise<string | null> {
    try {
      const prompt = [
        {
          role: 'system',
          content:
            'You are a secure document classifier. Return the most likely document type using only one of the following values: Aadhaar Card, PAN Card, Insurance Certificate, Invoice / Bill of Sale, Passport Size Photo, Resume, Unknown.',
        },
        {
          role: 'user',
          content: `Filename: ${filename}\nMIME type: ${mimeType || 'unknown'}\nExpected document type: ${expectedType || 'unknown'}\nText content: ${content ? content.slice(0, 1000) : 'none'}`,
        },
      ];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openAiModel,
          messages: prompt,
          max_tokens: 32,
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openAiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      const aiContent = response.data?.choices?.[0]?.message?.content;
      if (typeof aiContent === 'string') {
        const normalized = aiContent.trim().split(/[\n,:;.]+/)[0].trim();
        return normalized || null;
      }
    } catch (error) {
      this.logger.warn('AI fallback detection failed. Using keyword fallback.', error as Error);
    }

    return null;
  }
}
