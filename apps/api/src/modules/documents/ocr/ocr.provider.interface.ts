export interface OCRResult {
  text: string;
  confidence: number;
  provider: string;
  processingTimeMs: number;
  qualityIssues: string[];
}

export interface OCRProvider {
  readonly name: string;
  recognize(buffer: Buffer, mimeType?: string): Promise<OCRResult>;
}
