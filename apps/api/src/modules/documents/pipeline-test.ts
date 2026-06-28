import { ValidationService } from './validation.service';
import { VerificationService } from './verification.service';
import { VisionClassificationService } from './vision-classification.service';
import { FieldExtractionService } from './field-extraction.service';
import {
  KycDocumentType,
  OcrExtractionResult,
  NO_TEXT_FOUND,
} from './types/document-intelligence.types';

class MockConfigService {
  get(key: string) {
    return null; 
  }
}

class MockPreprocessingService {
  toClassificationImage() {
    return null;
  }
  assessImageQuality() {
    return [];
  }
}

async function runTests() {
  console.log('STARTING CONNECT-GOV PIPELINE VERIFICATION TESTS');

  const validationService = new ValidationService();
  const verificationService = new VerificationService();
  const fieldExtractionService = new FieldExtractionService();
  
  // Cast mocks to avoid complex setup dependencies
  const classificationService = new VisionClassificationService(
    new MockConfigService() as any,
    new MockPreprocessingService() as any,
  );

  
  const testCases = [
    {
      name: 'Aadhaar Card - Complete & Correct',
      expectedType: 'AADHAAR' as KycDocumentType,
      actualText: `
        GOVERNMENT OF INDIA
        Unique Identification Authority of India
        To,
        John Doe
        DOB: 15/08/1990
        Gender: MALE
        Aadhaar Number: 1234 5678 9012
        Aadhaar Card Help
      `,
      assertVerified: true,
    },
    {
      name: 'PAN Card - Complete & Correct',
      expectedType: 'PAN' as KycDocumentType,
      actualText: `
        INCOME TAX DEPARTMENT
        GOVT OF INDIA
        Permanent Account Number
        Name: John Doe
        Father's Name: Richard Doe
        PAN: ABCDE1234F
        Signature
      `,
      assertVerified: true,
    },
    {
      name: 'Passport - Complete & Correct',
      expectedType: 'PASSPORT' as KycDocumentType,
      actualText: `
        REPUBLIC OF INDIA
        PASSPORT
        Passport No: Z1234567
        Surname: Doe
        Given Names: John
        Nationality: INDIAN
        Date of Birth: 01/01/1990
        Date of Expiry: 10/10/2030
      `,
      assertVerified: true,
    },
    {
      name: 'Driving License - Complete & Correct',
      expectedType: 'DRIVING_LICENSE' as KycDocumentType,
      actualText: `
        UNION OF INDIA
        DRIVING LICENSE
        DL NO: KA0320150123456
        Name: John Doe
        DOB: 01-01-1995
        Valid Upto: 31-12-2035
      `,
      assertVerified: true,
    },
    {
      name: 'Bank Passbook - Complete & Correct',
      expectedType: 'BANK_PASSBOOK' as KycDocumentType,
      actualText: `
        STATE BANK OF INDIA
        PASSBOOK FOR SAVINGS BANK ACCOUNT
        Account Holder: John Doe
        Account Number: 12345678901
        IFSC Code: SBIN0001234
        Branch: Bangalore MG Road
      `,
      assertVerified: true,
    },
    {
      name: 'Marks Card - Complete & Correct',
      expectedType: 'MARKS_CARD' as KycDocumentType,
      actualText: `
        BOARD OF SECONDARY EDUCATION
        SSLC MARKS CARD
        Candidate Name: John Doe
        Register Number: 123456
        Subject: Mathematics - Marks: 95
        Subject: Science - Marks: 90
        Total Marks: 185
      `,
      assertVerified: true,
    },
    {
      name: 'Birth Certificate - Complete & Correct',
      expectedType: 'BIRTH_CERTIFICATE' as KycDocumentType,
      actualText: `
        DEPARTMENT OF HEALTH & FAMILY WELFARE
        BIRTH CERTIFICATE
        This is to certify that John Doe was born on 10/10/2010.
        Registration Number: BIRTH-2010-12345
        Father Name: Richard Doe
        Mother Name: Jane Doe
      `,
      assertVerified: true,
    },
    {
      name: 'Unknown Document - Weak/No Indicators',
      expectedType: 'AADHAAR' as KycDocumentType,
      actualText: `
        Hello, this is a plain text letter or document.
        It has no government keywords or identification numbers.
      `,
      assertVerified: false,
      assertStatus: 'UNKNOWN',
    },
  ];

  let passed = 0;

  for (const tc of testCases) {
    console.log(`--- Running test case: "${tc.name}" ---`);
    console.log(`Expected Document Type: ${tc.expectedType}`);

   
    const textClassification = (classificationService as any).classifyByTextContent(tc.actualText);
    
    let detectedType: KycDocumentType = 'UNKNOWN';
    let classificationConfidence = 40;
    let detectedFeatures: string[] = [];

    if (textClassification) {
      detectedType = textClassification.type;
      classificationConfidence = textClassification.confidence;
      detectedFeatures = textClassification.features;
    }

    console.log(`Detected Type (via OCR Text): ${detectedType}`);
    console.log(`Classification Confidence: ${classificationConfidence}%`);

    const classificationResult = {
      documentType: detectedType,
      confidence: classificationConfidence,
      category: 'IDENTITY' as any, // category placeholder
      reasoning: `OCR text classification matching ${detectedType}`,
      detectedFeatures,
      matchesExpectedType: detectedType === tc.expectedType,
      provider: 'OCR-Heuristics',
    };

    const extractedData = await fieldExtractionService.extract(detectedType, tc.actualText);

    const validationResult = validationService.validate(
      detectedType,
      tc.actualText,
      extractedData,
      classificationConfidence,
      tc.expectedType,
    );

    console.log(`Validation Score: ${validationResult.score}`);
    console.log(`Validation Valid: ${validationResult.valid}`);
    console.log(`Validation Issues: ${JSON.stringify(validationResult.issues)}`);

    const ocrResult: OcrExtractionResult = {
      text: tc.actualText,
      confidence: 90,
      pages: [{ pageNumber: 1, text: tc.actualText, confidence: 90, lines: [], blocks: [] }],
      blocks: [],
      lines: [],
      qualityIssues: [],
      imageProperties: {},
    };

    const verificationResult = verificationService.resolve(
      classificationResult,
      ocrResult,
      validationResult,
      extractedData,
      tc.expectedType,
    );

    console.log(`Verification Status: ${verificationResult.status}`);
    console.log(`Verification Verified: ${verificationResult.verified}`);
    console.log(`Final Verification Confidence: ${verificationResult.confidence}%`);
    console.log(`Verification Reasons: ${JSON.stringify(verificationResult.reasons)}`);

    let tcPassed = true;
    if (tc.assertVerified !== verificationResult.verified) {
      console.error(`❌ FAILED: Expected verified=${tc.assertVerified}, got=${verificationResult.verified}`);
      tcPassed = false;
    }
    if (tc.assertStatus && tc.assertStatus !== verificationResult.status) {
      console.error(`❌ FAILED: Expected status=${tc.assertStatus}, got=${verificationResult.status}`);
      tcPassed = false;
    }
    if (tc.assertVerified && verificationResult.confidence !== 100) {
      console.error(`❌ FAILED: Expected confidence=100 for verified document, got=${verificationResult.confidence}`);
      tcPassed = false;
    }

    if (tcPassed) {
      console.log('✅ PASSED\n');
      passed++;
    } else {
      console.log('\n');
    }
  }

  console.log('==================================================');
  console.log(`TEST RUN COMPLETED: ${passed}/${testCases.length} Passed`);
  console.log('==================================================');

  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Fatal testing error:', e);
  process.exit(1);
});
