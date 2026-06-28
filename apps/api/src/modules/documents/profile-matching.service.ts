import { Injectable, Logger } from '@nestjs/common';
import { ExtractedDocumentData } from './types/document-intelligence.types';
import { User } from '../../models/User';

export interface ProfileMatchResult {
  score: number;
  warnings: string[];
}

@Injectable()
export class ProfileMatchingService {
  private readonly logger = new Logger(ProfileMatchingService.name);

  match(extractedData: ExtractedDocumentData, user?: User): ProfileMatchResult {
    this.logger.log(`[Layer 6] Starting Profile Matching`);
    const warnings: string[] = [];
    let score = 100;

    if (!user) {
      this.logger.warn(`[Layer 6] No user profile provided for matching`);
      return { score: 100, warnings: ['No user profile provided for matching'] };
    }

    // Name Match
    const docName = extractedData.name || extractedData.studentName || extractedData.accountHolderName || extractedData.applicantName;
    if (docName && user.name) {
      const docNameLower = docName.toLowerCase().replace(/\s+/g, '');
      const userNameLower = user.name.toLowerCase().replace(/\s+/g, '');
      
      // Simple exact or substring match
      if (!docNameLower.includes(userNameLower) && !userNameLower.includes(docNameLower)) {
        score -= 40;
        warnings.push(`Name mismatch: Document (${docName}) vs Profile (${user.name})`);
      }
    }

    // DOB Match
    if (extractedData.dob && user.dob) {
      // In a real system, you'd normalize dates before comparing
      const docDob = new Date(extractedData.dob);
      const userDob = new Date(user.dob);
      
      if (!isNaN(docDob.getTime()) && !isNaN(userDob.getTime())) {
        if (docDob.toISOString().split('T')[0] !== userDob.toISOString().split('T')[0]) {
          score -= 30;
          warnings.push(`DOB mismatch: Document (${extractedData.dob}) vs Profile (${userDob.toISOString().split('T')[0]})`);
        }
      }
    }

    this.logger.log(`[Layer 6] Profile Match Score: ${score}`);
    return {
      score: Math.max(0, score),
      warnings,
    };
  }
}
