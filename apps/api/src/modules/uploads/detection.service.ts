import { Injectable } from '@nestjs/common';

export type DetectionStatus = 'DETECTED' | 'MISMATCH' | 'UNKNOWN';

@Injectable()
export class DetectionService {
  // Simple keyword mapping for document types
  private readonly keywordMap: Record<string, string> = {
    aadhaar: 'Aadhaar',
    aadhar: 'Aadhaar',
    pan: 'PAN',
    insurance: 'Insurance',
    invoice: 'Invoice',
  };

  /**
   * Detect document type based on filename, optional text content and MIME type.
   * Returns the detected type (or 'Unknown') and a status.
   */
  detect(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
  ): { documentType: string; status: DetectionStatus } {
    const lowerName = filename.toLowerCase();
    let detected = this.getFromKeywords(lowerName);
    if (!detected && content) {
      detected = this.getFromKeywords(content.toLowerCase());
    }
    // Fallback to MIME type based simple mapping
    if (!detected && mimeType) {
      if (mimeType === 'application/pdf') detected = 'PDF';
      else if (mimeType.startsWith('image/')) detected = 'Image';
    }
    const documentType = detected || 'Unknown';
    const status = this.computeStatus(documentType, expectedType);
    return { documentType, status };
  }

  private getFromKeywords(text: string): string | null {
    for (const [key, type] of Object.entries(this.keywordMap)) {
      if (text.includes(key)) return type;
    }
    return null;
  }

  private computeStatus(detected: string, expected?: string): DetectionStatus {
    if (detected === 'Unknown') return 'UNKNOWN';
    if (!expected) return 'DETECTED';
    return detected.toLowerCase() === expected.toLowerCase() ? 'DETECTED' : 'MISMATCH';
  }
}
