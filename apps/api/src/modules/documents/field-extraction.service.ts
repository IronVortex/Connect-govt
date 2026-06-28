import { Injectable, Logger } from '@nestjs/common';
import { ExtractedDocumentData, KycDocumentType } from './types/document-intelligence.types';

@Injectable()
export class FieldExtractionService {
  private readonly logger = new Logger(FieldExtractionService.name);

  async extract(documentType: KycDocumentType, text: string): Promise<ExtractedDocumentData> {
    const tStart = performance.now();
    this.logger.log(`[Layer 4] Extracting fields for ${documentType}`);
    
    const extractedData = this.parseFields(documentType, text);
    
    this.logger.log(`[Layer 4] Extracted ${Object.keys(extractedData).length} fields in ${Math.round(performance.now() - tStart)}ms`);
    return extractedData;
  }

  private parseFields(documentType: KycDocumentType, text: string): ExtractedDocumentData {
    switch (documentType) {
      case 'AADHAAR':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          gender: this.extractLabeledValue(text, ['gender', 'sex']),
          idNumber: this.normalizeAadhaar(this.firstMatch(text, /\b(\d{4}\s?\d{4}\s?\d{4})\b/)),
          address: this.extractAddressBlock(text),
        };

      case 'PAN':
        return {
          name: this.extractName(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{5}[0-9]{4}[A-Z])\b/i)?.toUpperCase(),
          dob: this.extractDob(text),
        };

      case 'PASSPORT':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          nationality: this.extractLabeledValue(text, ['nationality', 'country']),
          idNumber: this.firstMatch(text, /\b([A-Z][0-9]{7})\b/i)?.toUpperCase(),
          expiryDate: this.extractLabeledValue(text, ['date of expiry', 'expiry']),
        };

      case 'DRIVING_LICENSE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          expiryDate: this.extractLabeledValue(text, ['valid till', 'valid upto', 'expiry', 'expires']),
          idNumber:
            this.extractLabeledValue(text, [
              'dl no',
              'license number',
              'licence number',
              'driving license no',
            ]) || this.firstMatch(text, /\b([A-Z]{2}[0-9]{2}\s?[0-9]{11,13})\b/i),
        };

      case 'VOTER_ID':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{3}[0-9]{7})\b/i)?.toUpperCase(),
        };

      case 'MARKS_CARD':
      case 'SSLC_MARKS':
      case 'PUC_MARKS':
      case 'DEGREE_CERTIFICATE':
        return {
          studentName:
            this.extractLabeledValue(text, ['student name', 'name of student', 'candidate name']) ||
            this.extractName(text),
          registerNumber:
            this.extractLabeledValue(text, [
              'register number',
              'reg no',
              'usn',
              'roll no',
              'roll number',
            ]) || this.firstMatch(text, /\b([0-9]{1,2}[A-Z]{2}[0-9]{2}[A-Z]{0,2}[0-9]{3,4})\b/i),
          institutionName: this.extractLabeledValue(text, [
            'college',
            'institution',
            'school',
            'university',
          ]),
          semester: this.extractLabeledValue(text, ['semester', 'sem', 'class']),
          cgpa: this.firstMatch(text, /\bCGPA\s*[:.]?\s*([0-9.]+)/i),
          sgpa: this.firstMatch(text, /\bSGPA\s*[:.]?\s*([0-9.]+)/i),
          subjects: this.extractSubjects(text),
          marks: this.extractMarksMap(text),
        };

      case 'BIRTH_CERTIFICATE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          registrationNumber: this.extractLabeledValue(text, [
            'registration number',
            'certificate number',
            'reg no',
          ]),
        };

      case 'INCOME_CERTIFICATE':
        return {
          applicantName:
            this.extractLabeledValue(text, ['applicant name', 'name of applicant', 'name']) ||
            this.extractName(text),
          incomeValue:
            this.extractLabeledValue(text, ['annual income', 'income', 'total income']) ||
            this.firstMatch(text, /(?:rs\.?|inr)\s*([0-9,]+)/i),
          issuingAuthority: this.extractLabeledValue(text, [
            'issuing authority',
            'issued by',
            'authority',
          ]),
        };

      case 'UTILITY_BILL':
      case 'ADDRESS_PROOF':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL':
        return {
          name: this.extractName(text),
          address:
            this.extractLabeledValue(text, ['address', 'residential address', 'permanent address']) ||
            this.extractAddressBlock(text),
          idNumber:
            this.extractLabeledValue(text, [
              'consumer number',
              'consumer no',
              'consumer id',
              'rr no',
              'rr number',
              'bill number',
              'bill no',
              'account number',
              'account no',
            ]) || this.firstMatch(text, /\b\d{10,12}\b/),
          amount: this.firstMatch(text, /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{2})?)/i),
        };

      case 'BANK_PASSBOOK':
      case 'BANK_STATEMENT':
        return {
          accountHolderName:
            this.extractLabeledValue(text, ['account holder', 'customer name', 'name']) ||
            this.extractName(text),
          accountNumber: this.extractLabeledValue(text, ['account number', 'account no', 'a/c no']),
          ifscCode: this.firstMatch(text, /\b([A-Z]{4}0[A-Z0-9]{6})\b/i)?.toUpperCase(),
          bankName: this.extractLabeledValue(text, ['bank name', 'bank']),
          branch: this.extractLabeledValue(text, ['branch', 'branch name']),
        };

      case 'VACCINATION_RECORD':
        return {
          beneficiaryName:
            this.extractLabeledValue(text, ['beneficiary', 'name', 'patient name']) ||
            this.extractName(text),
          vaccineDetails: this.extractLabeledValue(text, ['vaccine', 'vaccination', 'dose']),
          vaccineDates: this.extractDates(text),
        };

      case 'INSURANCE_CERTIFICATE':
      case 'HEALTH_INSURANCE_CARD':
      case 'VEHICLE_INSURANCE':
        return {
          policyHolderName:
            this.extractLabeledValue(text, ['insured name', 'policy holder', 'name']) ||
            this.extractName(text),
          policyNumber: this.extractLabeledValue(text, ['policy number', 'policy no']),
          validity: this.extractLabeledValue(text, ['valid till', 'validity', 'valid upto', 'expiry']),
        };

      case 'INVOICE':
        return {
          dealerName: this.extractLabeledValue(text, ['dealer', 'seller', 'vendor', 'company']),
          invoiceNumber: this.extractLabeledValue(text, ['invoice number', 'invoice no', 'bill number']),
          invoiceDate: this.extractDob(text),
          productDetails: this.extractLabeledValue(text, ['product', 'vehicle', 'description', 'item']),
        };

      case 'TRANSFER_CERTIFICATE':
        return {
          name: this.extractName(text),
          institutionName: this.extractLabeledValue(text, ['school', 'college', 'institution']),
          registrationNumber: this.extractLabeledValue(text, ['tc no', 'certificate number', 'reg no']),
        };

      case 'RESUME':
        return {
          name: this.extractName(text),
          idNumber: this.extractLabeledValue(text, ['email', 'phone', 'contact']),
        };

      default:
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.extractLabeledValue(text, [
            'number',
            'certificate number',
            'registration number',
          ]),
        };
    }
  }

  private extractSubjects(text: string): string[] {
    const subjects: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (/^[A-Za-z][A-Za-z\s&]{3,40}$/.test(line.trim()) && !/total|grade|marks|semester/i.test(line)) {
        subjects.push(line.trim());
      }
    }
    return subjects.slice(0, 12);
  }

  private extractMarksMap(text: string): Record<string, string> {
    const marks: Record<string, string> = {};
    const regex = /([A-Za-z][A-Za-z\s&]{2,30})\s+(\d{1,3})\s*$/gm;
    let match;
    while ((match = regex.exec(text)) !== null && Object.keys(marks).length < 15) {
      marks[match[1].trim()] = match[2];
    }
    return marks;
  }

  private extractAddressBlock(text: string): string | undefined {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    const addressLines = lines.filter(
      l => /\d/.test(l) && /(road|street|nagar|colony|district|pin|pincode|state)/i.test(l),
    );
    return addressLines.slice(0, 4).join(', ') || undefined;
  }

  private extractDates(text: string): string[] {
    const dates: string[] = [];
    const regex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g;
    let match;
    while ((match = regex.exec(text)) !== null && dates.length < 5) {
      dates.push(match[1]);
    }
    return dates;
  }

  private extractName(text: string): string | undefined {
    const labeled = this.extractLabeledValue(text, [
      'name',
      'candidate name',
      'person name',
      'applicant name',
      'holder name',
    ]);
    if (labeled) return labeled;

    return text
      .split(/\r?\n/)
      .map(item => item.trim())
      .find(
        item =>
          /^[A-Z][A-Za-z .'-]{2,80}$/.test(item) &&
          !/(government|india|department|authority|income|tax|passport|license|licence|certificate of)/i.test(
            item,
          ),
      );
  }

  private extractDob(text: string): string | undefined {
    return (
      this.extractLabeledValue(text, ['date of birth', 'dob', 'birth date']) ||
      this.firstMatch(text, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/) ||
      this.firstMatch(text, /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/)
    );
  }

  private extractLabeledValue(text: string, labels: string[]): string | undefined {
    const lowerText = text.toLowerCase();
    for (const label of labels) {
      const idx = lowerText.indexOf(label);
      if (idx !== -1) {
        const snippet = text.slice(idx, idx + label.length + 50);
        const match = snippet.match(new RegExp(`${label}\\s*[:\\-]?\\s*([A-Za-z0-9\\s/\\-.,]+)`, 'i'));
        if (match && match[1]) {
          return match[1].split(/\n/)[0].trim();
        }
      }
    }
    return undefined;
  }

  private firstMatch(text: string, regex: RegExp): string | undefined {
    const match = text.match(regex);
    return match ? match[1] || match[0] : undefined;
  }

  private normalizeAadhaar(id?: string): string | undefined {
    if (!id) return undefined;
    const digits = id.replace(/\D/g, '');
    return digits.length === 12 ? digits : undefined;
  }
}
