# 📄 PRODUCT REQUIREMENT DOCUMENT (PRD)

## 🧾 Product Name
**Connect — Document Guidance & Verification Platform**

---

## 🎯 Objective
Help users:
* Understand required documents for a service
* Upload documents
* Get **basic automated classification** of uploaded files

---

## 👤 Target Users
* General public applying for govt services
* First-time users who don’t know document requirements

---

## 🧩 Core Modules

### 1. Dashboard
#### Purpose:
Entry point + navigation hub
#### Features:
* Sidebar navigation: Dashboard, Services, Document Wallet (optional future)
* Welcome section
* Quick access cards (optional)

### 2. Services Module
#### Flow:
`Services → Departments → Services List`
#### Features:
* List of departments: RTO, Passport, Municipality
* On click → show services: New Car Registration, Driving License, etc.

### 3. Service Detail Page
#### Purpose:
Show required documents
#### UI Sections:
* Service title
* Description
* Document list

### 4. Document Upload Module
#### Features:
Each document item should have:
* Upload button
* Accepted formats (PDF, JPG, PNG)
* File preview (after upload)

---

## 🤖 5. Basic Verification Engine (CORE LOGIC)
### 🎯 Goal:
Detect **what type of document** the user uploaded. NOT whether it's valid or government-approved.

### ✅ Verification Levels
#### Level 1 — File Validation
* Check file type (pdf, jpg, png)
* Check size limit
#### Level 2 — Filename Heuristics
* "aadhaar_front.jpg" → Aadhaar
* "pan_card.pdf" → PAN
#### Level 3 — Content Detection (Optional MVP+)
* Use OCR (Tesseract) to look for keywords:
    * Aadhaar → "UIDAI", "Government of India"
    * PAN → "Income Tax Department", "Permanent Account Number"

### 🏷️ Output Classification
| Status   | Meaning                        |
| -------- | ------------------------------ |
| DETECTED | Matches expected document type |
| MISMATCH | Different document detected    |
| UNKNOWN  | Cannot identify                |
