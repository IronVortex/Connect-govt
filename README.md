# Connect-Gov

Connect-Gov is a modern monorepo application built with **Nx**, featuring a **Next.js** frontend and a **NestJS/Express** backend.

## Project Structure

- **`apps/web`**: Frontend application built with Next.js, Tailwind CSS, and shadcn/ui.
- **`apps/api`**: Backend API built with NestJS/Express and Mongoose (MongoDB).
- **`docs`**: Project documentation and setup guides.

## Prerequisites

- **Node.js**: v20+
- **npm**: v10+
- **MongoDB**: A running instance (local or Atlas)

## Getting Started

### 1. Install Dependencies

From the root directory, run:
```bash
npm install
```

### 2. Environment Configuration

Copy the example environment files and update them with your local settings.

**Backend API:**
```bash
cp apps/api/.env.example apps/api/.env
```
Default values in `.env`:
- `PORT=3333`
- `MONGODB_URI=mongodb://localhost:27017/connect`
- `JWT_SECRET=your_jwt_secret_here`

**Frontend Web:**
```bash
cp apps/web/.env.example apps/web/.env.local
```
Default values in `.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:3333`

### 3. Run the Application

You need to start both the API and the Web processes in separate terminals.

**Start the API:**
```bash
npm run serve:api
```

**Start the Web UI:**
```bash
npm run serve:web
```

The Web UI will be available at [http://localhost:3000](http://localhost:3000) and the API at [http://localhost:3333](http://localhost:3333).

## Other Commands

- **Build API**: `npm run build:api`
- **Build Web**: `npm run build:web`
- **Lint**: `npx nx run-many -t lint`
- **Test**: `npm test`

## Documentation

For more detailed information on the project architecture and setup, refer to [Setup-nx-repo (3).md](./Setup-nx-repo%20(3).md).

## 🤖 Document Verification & OCR Engine

The backend API features a stabilized, robust document classification engine that uses scoring-based heuristics, digital PDF text extraction, and Tesseract OCR to automatically verify citizen documents:

- **Pipeline**:
  - **Images** &rarr; Direct Tesseract OCR + Aspect Ratio / Dimension analysis using `@napi-rs/canvas`.
  - **PDFs** &rarr; Digital text layer extraction. If the PDF is scanned (contains no text), it is rendered to an in-memory PNG canvas and analyzed via Tesseract OCR.
- **Fallback / Confidence System**:
  - Heuristics map filename keywords, OCR text matches (with regex formatting checks for Aadhaar/PAN), and dimensions.
  - Scores $\ge 45$ flag a high-confidence match.
  - Scores between $15$ and $44$ leverage expected type fallbacks to prevent aggressive `UNKNOWN` flags.
- **Technologies**:
  - `tesseract.js` for on-device/in-process OCR.
  - `pdfjs-dist` (v5) dynamically imported ESM for PDF parsing.
  - `@napi-rs/canvas` for high-performance server-side canvas operations without external native dependencies.