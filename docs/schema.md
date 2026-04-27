# 🗄️ Database Schema - CONNECT

This document defines the Prisma schema for the CONNECT platform, based on the requirements for document guidance and verification.

## 🏛️ Core Entities

### User & Authentication
- **User**: Represents a citizen or staff member. Primary auth is via Phone + OTP.
- **Role**: Enum defining access levels (USER, STAFF, ADMIN).

### Service Catalog
- **Department**: Higher-level groupings (e.g., RTO, Passport).
- **Service**: Specific government services (e.g., New Car Registration).
- **Requirement**: Definitions of what documents are needed for each service.

### Submissions & Verification
- **Application**: Tracks a user's interaction with a specific service.
- **Upload**: Individual file uploads associated with an application and a requirement.
- **VerificationStatus**: Enum (DETECTED, MISMATCH, UNKNOWN).

---

## 📄 Prisma Schema Definition

```prisma
// datasource and generator remain at the top of apps/api/prisma/schema.prisma

enum Role {
  USER
  STAFF
  ADMIN
}

enum VerificationStatus {
  DETECTED
  MISMATCH
  UNKNOWN
}

model User {
  id            String        @id @default(cuid())
  phone         String        @unique
  name          String?
  email         String?       @unique
  role          Role          @default(USER)
  applications  Application[]
  uploads       Upload[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Department {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  services    Service[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Service {
  id            String        @id @default(cuid())
  name          String
  description   String?
  fee           Float         @default(0)
  estimatedDays Int?          // e.g., 7-10 days
  department    Department    @relation(fields: [departmentId], references: [id])
  departmentId  String
  requirements  Requirement[]
  applications  Application[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Requirement {
  id           String    @id @default(cuid())
  name         String    // e.g., "Aadhaar Card"
  description  String?   // e.g., "Upload front side"
  expectedType String    // e.g., "aadhaar", "pan" (used for verification logic)
  isRequired   Boolean   @default(true)
  service      Service   @relation(fields: [serviceId], references: [id])
  serviceId    String
  uploads      Upload[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Application {
  id           String    @id @default(cuid())
  displayId    String    @unique // e.g., CNCT/RTO/2024/000123
  user         User      @relation(fields: [userId], references: [id])
  userId       String
  service      Service   @relation(fields: [serviceId], references: [id])
  serviceId    String
  uploads      Upload[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Upload {
  id            String             @id @default(cuid())
  fileUrl       String
  fileName      String
  fileType      String             // mime type
  detectedType  String?            // result from OCR/logic
  status        VerificationStatus @default(UNKNOWN)
  user          User               @relation(fields: [userId], references: [id])
  userId        String
  application   Application        @relation(fields: [applicationId], references: [id])
  applicationId String
  requirement   Requirement        @relation(fields: [requirementId], references: [id])
  requirementId String
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}
```
