import { Injectable, Logger } from '@nestjs/common';
import {
  DOCUMENT_PATTERN_DEFINITIONS,
  DocumentPatternDefinition,
  FILENAME_HINTS,
} from './document-patterns.config';
import {
  CONFIDENCE_THRESHOLDS,
  DetectionCandidate,
  DetectionStatus,
  DOCUMENT_TYPE_LABELS,
  KycDocumentType,
  LABEL_TO_KYC_TYPE,
  NO_TEXT_FOUND,
} from './types/document-intelligence.types';

interface ScoredCandidate {
  documentType: KycDocumentType;
  rawScore: number;
  confidence: number;
  matchSignals: string[];
}

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);

  detect(
    text: string,
    filename?: string,
    expectedType?: string,
    imageProperties?: { width?: number; height?: number; aspect?: number },
    ocrConfidence = 0,
  ): DetectionCandidate {
    const hasText = Boolean(text && text !== NO_TEXT_FOUND && text.trim().length > 0);
    const lowerText = hasText ? text.toLowerCase() : '';

    const scored = DOCUMENT_PATTERN_DEFINITIONS.map(definition =>
      this.scoreDefinition(definition, lowerText, imageProperties, ocrConfidence),
    ).sort((a, b) => b.rawScore - a.rawScore || b.confidence - a.confidence);

    const best = scored[0];
    const runnerUp = scored[1];

    let result: ScoredCandidate;

    if (!hasText || !best || best.rawScore < 8) {
      const filenameResult = this.detectFromFilename(filename, expectedType);
      if (filenameResult) {
        result = filenameResult;
      } else {
        result = {
          documentType: 'UNKNOWN',
          rawScore: best?.rawScore || 0,
          confidence: 0,
          matchSignals: ['insufficient-text'],
        };
      }
    } else if (best.rawScore < this.getDefinition(best.documentType).minRawScore) {
      const filenameResult = this.detectFromFilename(filename, expectedType);
      result =
        filenameResult && filenameResult.confidence > best.confidence
          ? filenameResult
          : { ...best, documentType: 'UNKNOWN', confidence: Math.min(best.confidence, 0.45) };
    } else {
      result = this.applyAmbiguityPenalty(best, runnerUp);
    }

    if (result.documentType === 'PASSPORT_PHOTO' && hasText && result.rawScore < 8) {
      const photoScore = this.scorePassportPhoto(imageProperties, lowerText);
      if (photoScore.confidence > result.confidence) {
        result = photoScore;
      }
    }

    if (!hasText && result.documentType !== 'UNKNOWN') {
      result.confidence = Math.min(result.confidence, 0.45);
      result.matchSignals.push('filename-only');
    }

    result.confidence = this.applyOcrConfidenceModifier(result.confidence, ocrConfidence, hasText);
    result.confidence = Number(Math.min(1, Math.max(0, result.confidence)).toFixed(2));

    const status = this.resolveStatus(result.confidence, result.documentType, expectedType);

    this.logger.log(
      `Detection result: type=${result.documentType}, confidence=${result.confidence}, ` +
        `rawScore=${result.rawScore}, status=${status}, signals=[${result.matchSignals.join(', ')}]`,
    );

    return {
      documentType: result.documentType,
      confidence: result.confidence,
      score: result.rawScore,
      status,
      matchSignals: result.matchSignals,
    };
  }

  toDisplayLabel(documentType: KycDocumentType): string {
    return DOCUMENT_TYPE_LABELS[documentType];
  }

  normalizeExpectedType(expectedType?: string): KycDocumentType | undefined {
    if (!expectedType) {
      return undefined;
    }

    const normalized = expectedType.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (LABEL_TO_KYC_TYPE[normalized]) {
      return LABEL_TO_KYC_TYPE[normalized];
    }

    const match = (Object.entries(DOCUMENT_TYPE_LABELS) as Array<[KycDocumentType, string]>).find(
      ([, label]) => label.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized,
    );

    return match?.[0];
  }

  resolveStatus(
    confidence: number,
    detectedType: KycDocumentType,
    expectedType?: string,
  ): DetectionStatus {
    const normalizedExpected = this.normalizeExpectedType(expectedType);

    if (
      normalizedExpected &&
      detectedType !== 'UNKNOWN' &&
      normalizedExpected !== detectedType
    ) {
      return 'MISMATCHED';
    }

    if (confidence >= CONFIDENCE_THRESHOLDS.MATCHED && detectedType !== 'UNKNOWN') {
      return normalizedExpected ? 'MATCHED' : 'DETECTED';
    }

    if (confidence >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW && detectedType !== 'UNKNOWN') {
      return 'NEEDS_REVIEW';
    }

    return 'UNKNOWN';
  }

  private scoreDefinition(
    definition: DocumentPatternDefinition,
    lowerText: string,
    imageProperties?: { width?: number; height?: number; aspect?: number },
    ocrConfidence = 0,
  ): ScoredCandidate {
    if (definition.type === 'PASSPORT_PHOTO') {
      return this.scorePassportPhoto(imageProperties, lowerText);
    }

    const matchSignals: string[] = [];
    let rawScore = 0;

    for (const keyword of definition.keywords) {
      if (lowerText.includes(keyword.value)) {
        rawScore += keyword.weight;
        matchSignals.push(`keyword:${keyword.value}`);
      }
    }

    for (const authority of definition.authorities || []) {
      if (lowerText.includes(authority.value)) {
        rawScore += authority.weight;
        matchSignals.push(`authority:${authority.value}`);
      }
    }

    for (const phrase of definition.phrases) {
      if (lowerText.includes(phrase.value)) {
        rawScore += phrase.weight;
        matchSignals.push(`phrase:${phrase.value}`);
      }
    }

    for (const pattern of definition.patterns) {
      if (pattern.regex.test(lowerText)) {
        rawScore += pattern.weight;
        matchSignals.push(`pattern:${pattern.label || pattern.regex.source}`);
      }
    }

    if (definition.negativeKeywords) {
      for (const negative of definition.negativeKeywords) {
        if (lowerText.includes(negative.value)) {
          rawScore -= negative.weight;
          matchSignals.push(`negative:${negative.value}`);
        }
      }
    }

    rawScore = Math.max(0, rawScore);
    let confidence = this.rawScoreToConfidence(rawScore, definition.maxScore, matchSignals);

    if (ocrConfidence > 0 && ocrConfidence < 50 && matchSignals.length > 0) {
      confidence *= 0.9;
    }

    return {
      documentType: definition.type,
      rawScore,
      confidence,
      matchSignals,
    };
  }

  private scorePassportPhoto(
    imageProperties?: { width?: number; height?: number; aspect?: number },
    lowerText = '',
  ): ScoredCandidate {
    const matchSignals: string[] = [];
    let rawScore = 0;

    const isImage = Boolean(imageProperties?.width && imageProperties?.height);
    const aspect = imageProperties?.aspect;
    const hasLittleText = lowerText.trim().length < 120;

    if (isImage) {
      rawScore += 20;
      matchSignals.push('image-file');
    }
    if (hasLittleText) {
      rawScore += 18;
      matchSignals.push('minimal-text');
    }
    if (typeof aspect === 'number' && aspect >= 0.65 && aspect <= 1.45) {
      rawScore += 16;
      matchSignals.push('photo-aspect-ratio');
    }
    if (lowerText.includes('photo') || lowerText.includes('photograph')) {
      rawScore += 8;
      matchSignals.push('keyword:photo');
    }

    return {
      documentType: 'PASSPORT_PHOTO',
      rawScore,
      confidence: this.rawScoreToConfidence(rawScore, 60, matchSignals),
      matchSignals,
    };
  }

  private rawScoreToConfidence(rawScore: number, maxScore: number, matchSignals: string[]): number {
    if (rawScore <= 0) {
      return 0;
    }

    let confidence = rawScore / maxScore;

    const strongSignals = matchSignals.filter(
      signal => signal.startsWith('pattern:') || signal.startsWith('authority:'),
    ).length;

    if (strongSignals >= 2) {
      confidence += 0.08;
    }
    if (strongSignals >= 3) {
      confidence += 0.05;
    }

    const keywordSignals = matchSignals.filter(signal => signal.startsWith('keyword:')).length;
    if (keywordSignals >= 3) {
      confidence += 0.04;
    }

    return confidence;
  }

  private applyAmbiguityPenalty(best: ScoredCandidate, runnerUp?: ScoredCandidate): ScoredCandidate {
    if (!runnerUp || runnerUp.documentType === best.documentType) {
      return best;
    }

    if (runnerUp.rawScore > 0 && runnerUp.rawScore >= best.rawScore * 0.82) {
      return {
        ...best,
        confidence: Number((best.confidence * 0.72).toFixed(2)),
        matchSignals: [...best.matchSignals, `ambiguous-with:${runnerUp.documentType}`],
      };
    }

    return best;
  }

  private applyOcrConfidenceModifier(
    confidence: number,
    ocrConfidence: number,
    hasText: boolean,
  ): number {
    if (!hasText) {
      return Math.min(confidence, 0.4);
    }

    if (ocrConfidence >= 75) {
      return Math.min(1, confidence + 0.03);
    }

    if (ocrConfidence > 0 && ocrConfidence < 40) {
      return confidence * 0.88;
    }

    return confidence;
  }

  private detectFromFilename(filename?: string, expectedType?: string): ScoredCandidate | null {
    const normalizedExpected = this.normalizeExpectedType(expectedType);
    if (normalizedExpected && normalizedExpected !== 'UNKNOWN') {
      return {
        documentType: normalizedExpected,
        rawScore: 20,
        confidence: 0.38,
        matchSignals: ['expected-type-hint'],
      };
    }

    if (!filename) {
      return null;
    }

    const lowerFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    let bestMatch: { type: KycDocumentType; hits: number } | null = null;

    for (const entry of FILENAME_HINTS) {
      const hits = entry.hints.filter(hint => lowerFilename.includes(hint.replace(/[^a-z0-9]/g, ''))).length;
      if (hits > 0 && (!bestMatch || hits > bestMatch.hits)) {
        bestMatch = { type: entry.type, hits };
      }
    }

    if (!bestMatch) {
      return null;
    }

    return {
      documentType: bestMatch.type,
      rawScore: 15 + bestMatch.hits * 5,
      confidence: Math.min(0.42, 0.28 + bestMatch.hits * 0.06),
      matchSignals: ['filename-heuristic'],
    };
  }

  private getDefinition(type: KycDocumentType): DocumentPatternDefinition {
    return (
      DOCUMENT_PATTERN_DEFINITIONS.find(definition => definition.type === type) || {
        type: 'UNKNOWN',
        keywords: [],
        authorities: [],
        phrases: [],
        patterns: [],
        maxScore: 100,
        minRawScore: 30,
      }
    );
  }
}
