# System Design - CONNECT

## 🏗️ Architecture Overview
- **Monorepo**: Nx
- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui
- **Backend**: NestJS (Modular structure)
- **Database**: PostgreSQL with Prisma ORM

## 🎨 UI Component Architecture
Based on the project mockup, the application is divided into several high-level areas:

### 1. Main Layout Shell
- **Sidebar**: Persistent navigation with links for Dashboard, Departments, My Applications, Document Wallet, Notifications, Help & Support, and Profile Settings.
- **Top Bar**: Global search for services/departments, notifications icon, and user profile dropdown.
- **Content Area**: Dynamic area for page-specific content with breadcrumb navigation.

### 2. Service Selection & Detail Flow
- **Service Dashboard**: List of departments with service counts.
- **Stepper Component**: Visual progress indicator for the application flow (Select Service → Documents → Upload Documents → Review & Confirm → Application Submitted).
- **Service Header**: Displays service name, department name, and an "About this service" link.

### 3. Document Management UI
- **Required Documents List**: List of cards for each document type (e.g., Aadhaar Card, Address Proof, PAN Card).
  - Each card includes: Icon, Document Name, "Required" badge, Description, and an Action Button (Upload/View).
  - **Status Indicators**: "Verified" with a checkmark or an "Upload" button for pending items.
- **Basic Verification Panel**: Informational box explaining the automated verification process.
- **Application Summary Panel**: Sticky sidebar on the right showing Department, Service, Application ID, Estimated Time, and Fee details.

### 4. Interactive Components
- **Floating Action Button (FAB)**: Primary "Apply for Service" button.
- **Save & Continue**: Primary action buttons for navigation between steps.
- **Chat with Support**: Floating or footer-based support interaction.

## ⚙️ Core Logic Flow
1. **Service Discovery**: User searches or browses by department.
2. **Requirements Check**: System fetches required document list for the selected service.
3. **Upload & Verify**:
   - User uploads a file.
   - API performs basic verification (File type, Filename, OCR).
   - Real-time status update in the UI (DETECTED / MISMATCH / UNKNOWN).
4. **Summary & Completion**: Final review before "submission" (simulated in MVP).
