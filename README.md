# Connect-Gov

Connect-Gov is a modern monorepo application built with **Nx**, featuring a **Next.js** frontend and a **NestJS/Express** backend.

## Project Structure

This project is organized as an **Nx Monorepo**:

### Applications (`apps/`)
- **`apps/web`**: Frontend web application built with Next.js, Tailwind CSS, and shadcn/ui.
- **`apps/api`**: Backend API built with NestJS (Express framework) and Mongoose (MongoDB).

### Shared Libraries (`libs/`)
- **`libs/types`**: Shared TypeScript definitions, interfaces, and types (mapped to `@connect/types` in tsconfig).
- **`libs/ui`**: Shared UI component library.
- **`libs/utils`**: Shared utility and helper functions.

### Other Folders
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

---

## 🚀 Production Deployment

This section covers deploying the application to production environments.

### Prerequisites for Deployment

1. **MongoDB Atlas Cluster**: Create a cluster and get your connection URI
2. **Vercel Account**: For frontend deployment
3. **Render Account**: For backend API deployment
4. **Environment Variables**: Prepare all required environment variables

### Environment Variables Reference

Before deploying, ensure you have all required environment variables configured:

#### Backend API Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/connect-govt` | MongoDB Atlas connection string |
| `MONGODB_DB` | ✅ | `connect-govt` | Database name |
| `JWT_SECRET` | ✅ | `your-long-random-secret-min-32-chars` | Secret key for JWT signing |
| `FRONTEND_URL` | ✅ | `https://app.yourdomain.com` | Comma-separated list of allowed origins |
| `PORT` | ❌ | `3001` | Server port (default: 3001) |
| `NODE_ENV` | ❌ | `production` | Environment flag |
| `LOG_LEVEL` | ❌ | `info` | Logging level |

#### Frontend Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://api.yourdomain.com` | Backend API base URL |

### 1️⃣ Deploy Backend API to Render

#### Setup Instructions

1. **Push code to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Connect Render to GitHub**:
   - Go to [render.com](https://render.com)
   - Sign in or create an account
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the Service**:
   - **Name**: `connect-govt-api`
   - **Branch**: `main`
   - **Root Directory**: `.` (leave empty)
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm nx build api`
   - **Start Command**: `node dist/apps/api/main.js`

4. **Set Environment Variables** in Render Dashboard:
   ```
   MONGODB_URI = <your-mongodb-atlas-connection-string>
   MONGODB_DB = connect-govt
   JWT_SECRET = <generate-strong-secret>
   FRONTEND_URL = https://your-vercel-app.vercel.app
   NODE_ENV = production
   LOG_LEVEL = info
   ```

5. **Deploy**: Click "Create Web Service"

6. **Note your API URL**: Render will provide a URL like `https://connect-govt-api.onrender.com`

### 2️⃣ Deploy Frontend to Vercel

#### Setup Instructions

1. **Push code to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Import Project to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Framework Preset: **Next.js**

3. **Configure Build Settings**:
   - **Build Command**: `pnpm nx build web`
   - **Output Directory**: `dist/apps/web/.next`
   - **Install Command**: `pnpm install`

4. **Set Environment Variables** in Vercel Dashboard:
   ```
   NEXT_PUBLIC_API_URL = https://connect-govt-api.onrender.com
   ```

5. **Deploy**: Click "Deploy"

6. **Note your Frontend URL**: Vercel will provide a URL like `https://your-project.vercel.app`

### 3️⃣ Post-Deployment Configuration

After both services are deployed:

1. **Update Backend CORS Settings**:
   - Update `FRONTEND_URL` environment variable in Render with your Vercel URL
   - Restart the Render service

2. **Verify API Connection**:
   - Open your Vercel frontend URL
   - Check browser console for any CORS or connection errors
   - Test API calls (login, fetch services, etc.)

3. **Monitor Logs**:
   - **Vercel**: Dashboard → Deployments → Logs
   - **Render**: Dashboard → Service → Logs

### 🔄 Continuous Deployment

Both Render and Vercel support automatic deployments:

- **Vercel**: Automatically deploys on every push to `main` branch
- **Render**: Automatically deploys on every push to configured branch

To disable auto-deploy, configure in your platform settings.

### 🛠️ Troubleshooting Deployment

#### Frontend can't reach API

**Error**: `NEXT_PUBLIC_API_URL` is not set or network request fails

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` is set in Vercel environment variables
2. Check Render backend is running: `https://your-api-url.onrender.com/health`
3. Verify CORS is correctly configured in backend
4. Check browser Network tab for actual request URL

#### MongoDB Connection Failed

**Error**: `MongooseError: Cannot connect to MongoDB`

**Solution**:
1. Verify `MONGODB_URI` is correct in Render environment variables
2. Check MongoDB Atlas network access: add Render IP to whitelist
3. Ensure database credentials are correct
4. Check MongoDB Atlas cluster is running

#### Build Fails

**Error**: `Build command exited with code 1`

**Solution**:
1. Check build logs in Vercel/Render dashboard
2. Verify `pnpm` is installed: both use Node 20.x by default
3. Run `pnpm install && pnpm nx build api` locally to reproduce
4. Fix errors and commit changes

### 📊 Performance Monitoring

- **Vercel Analytics**: Built-in Web Vitals tracking
- **Render Logs**: Monitor application logs for errors
- **MongoDB Atlas**: Monitor database performance and connection metrics

### 🔒 Security Checklist

- [ ] `JWT_SECRET` is a strong, random value (minimum 32 characters)
- [ ] Environment variables are not committed to Git
- [ ] `.env` files are in `.gitignore`
- [ ] CORS `FRONTEND_URL` is set to production domain only
- [ ] MongoDB Atlas IP whitelist includes Render's outbound IPs
- [ ] HTTPS is enforced (automatic on Vercel)
- [ ] Database backups are enabled on MongoDB Atlas

---