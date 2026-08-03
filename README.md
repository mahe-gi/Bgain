# Secure Storage Management System

## 1. Project Overview

The **Secure Storage Management System** (BGain) is a complete, full-stack secure storage management platform that includes:

- **Web Application**: A responsive React 19 and TypeScript web client built with Vite.
- **Android Application**: A native React Native CLI 0.86 and TypeScript Android mobile client.
- **Backend REST API**: A Node.js 24 and Express 5 REST API built with TypeScript.
- **Database**: A PostgreSQL database managed via Prisma ORM v7.
- **Object Storage**: Private Cloudflare R2 object storage for secure file content hosting.
- **Role-Based Access Control**: Strict **ADMIN** and **VIEWER** roles.
- **Shared Architecture**: A unified backend, database, and storage infrastructure serving both Web and Android platforms.

### Key Capabilities
- **Admin Users**: Can manage users, create, rename, move, and delete folders, upload, preview, download, rename, move, and delete files, and view system metrics.
- **Viewer Users**: Can browse folders, search, sort, view file details, preview supported files, and securely download files, but cannot perform any create, update, or delete operations.
- **Security Enforcement**: Permissions and access boundaries are strictly enforced by the backend REST API, not solely by the client interfaces.

---

## 2. Live Demo and Submission Links

| Resource | Link |
| :--- | :--- |
| **GitHub Repository** | [https://github.com/mahe-gi/Bgain](https://github.com/mahe-gi/Bgain) |
| **Web Application** | [https://bgain.techwithmahe.com](https://bgain.techwithmahe.com/) |
| **Backend API** | [https://bgain-secure-storage-vatvv.ondigitalocean.app/api](https://bgain-secure-storage-vatvv.ondigitalocean.app/api) |
| **Backend Health** | [https://bgain-secure-storage-vatvv.ondigitalocean.app/api/health](https://bgain-secure-storage-vatvv.ondigitalocean.app/api/health) |
| **Android APK** | [https://drive.google.com/file/d/1Cy8TApJHJXh4OAiLv-h2IfYOZyXt8NPB/view?usp=sharing](https://drive.google.com/file/d/1Cy8TApJHJXh4OAiLv-h2IfYOZyXt8NPB/view?usp=sharing) |

### Android Release APK Details
- **File name**: `BGain-Secure-Storage.apk`
- **Approximate size**: 69 MB
- **SHA-256 Checksum**: `7f50829afb774d99570e9a056a952f0b467a3aa897245f387f4e88720e0d6000`

---

## 3. Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | [admin@bgain.com](mailto:admin@bgain.com) | `adminpassword` |
| **Viewer** | [viewer@bgain.com](mailto:viewer@bgain.com) | `viewerpassword` |

*Note: These demo credentials are provided solely for assignment evaluation.*

---

## 4. Main Features

### Admin Capabilities
- **Authentication**: Email/password login and persistent session restoration.
- **Dashboard**: Total metrics for folders, files, storage consumed, user count, and recent file activity.
- **Folder Management**: Browse root and nested folders, create new folders, rename, move across hierarchy, and delete folders with confirmation.
- **File Management**: Upload files using the Web file picker or Android Storage Access Framework, view details, inline preview, secure download, rename, move, and delete files.
- **Search & Sort**: Global search across folders and files with sorting by name, size, and creation date.
- **User Management**: View registered user listing and create new **ADMIN** or **VIEWER** accounts.
- **Profile & Account**: View account details, role badge, member since date, and logout.
- **User Experience**: Confirmation dialogs for destructive actions, loading skeletons, pull-to-refresh, clear error retry triggers, and success notification banners.

### Viewer Capabilities
- **Authentication**: Email/password login and persistent session restoration.
- **Dashboard**: Storage overview including folder, file, storage consumed metrics, and recent files (Admin user count omitted).
- **Folder & File Browsing**: Navigate root and nested folder structures.
- **Search & Sort**: Global folder and file search with sorting capabilities.
- **File Access**: Inspect file metadata, inline preview supported formats, and generate presigned secure downloads.
- **Profile & Account**: View account details, role badge, member since date, and logout.
- **RBAC Restrictions**: Read-only user experience. All folder creation, upload, rename, move, delete, and user management controls are hidden from the UI and forbidden by the backend API.

---

## 5. Technology Stack

### Backend
- **Runtime**: Node.js (v24.x)
- **Framework**: Express (v5.0.1)
- **Language**: TypeScript (v5.7.3)
- **ORM & Database Client**: Prisma ORM (v7.9.1) with `@prisma/adapter-pg` (v7.9.1) and `pg` (v8.22.0)
- **Validation**: Zod (v3.24.1)
- **Authentication**: JSON Web Tokens (`jsonwebtoken` v9.0.3) with 1-hour expiration
- **Security & Hashing**: `bcryptjs` (v3.0.3), Helmet (v8.0.0), CORS (v2.8.5), Express Rate Limit (v7.5.0)
- **Storage SDK**: `@aws-sdk/client-s3` (v3.1100.0) and `@aws-sdk/s3-request-presigner` (v3.1100.0)
- **File Handling & Logging**: Multer (v2.2.0), Pino (v9.6.0)
- **Testing**: Vitest (v3.0.4), Supertest (v7.0.0), ESLint (v9.18.0)

### Web
- **Core**: React (v19.2.8), React DOM (v19.2.8)
- **Build Tool**: Vite (v8.2.0)
- **Language**: TypeScript (v6.0.2)
- **Routing**: React Router DOM (v7.18.2)
- **State & Data Fetching**: TanStack React Query (v5.101.4), Axios (v1.19.0)
- **Icons & Styling**: Lucide React (v1.28.0), Vanilla CSS with design token custom properties
- **Linting & Testing**: Oxlint (v1.75.0), Vitest (v4.1.10), Testing Library React (v16.3.2)

### Mobile (Android)
- **Framework**: React Native CLI (v0.86.2), React (v19.2.3)
- **Language**: TypeScript (v5.8.3)
- **Navigation**: React Navigation (Bottom Tabs v7.18.14, Native Stack v7.18.6)
- **State & Networking**: TanStack React Query (v5.101.4), Axios (v1.19.0)
- **Secure Token Storage**: React Native Keychain (v10.0.0)
- **Icons & UI**: Lucide React Native (v1.28.0), React Native SVG (v15.15.5), Safe Area Context (v5.5.2)
- **Native Modules**:
  - `NativeSecureDocumentPickerSpec` TurboModule (Android Storage Access Framework `ACTION_OPEN_DOCUMENT`)
  - Android `DownloadManager` Native Module
- **Testing & Linting**: Jest (v29.7.0), React Native Testing Library (v12.9.0), ESLint with React Native configuration

### Infrastructure
- **Web Hosting**: Vercel (SPA routing fallback)
- **Backend Hosting**: DigitalOcean App Platform
- **Database**: Neon PostgreSQL
- **Object Storage**: Cloudflare R2 (S3-compatible API, private access)
- **APK Distribution**: Google Drive

---

## 6. Repository Structure

```text
Bgain/
├── backend/   # Node.js, Express, Prisma & TypeScript REST API
├── web/       # React 19, Vite & TypeScript web application
├── mobile/    # React Native CLI Android mobile application
├── docs/      # Product requirements & architecture documentation
└── README.md  # Project documentation
```

### Key Subdirectories
- **`backend/src/`**: Controllers, services, routes, middleware, and Prisma configuration.
- **`backend/prisma/`**: Prisma schema definition and seed scripts.
- **`web/src/`**: Pages, components, hooks, API modules, and CSS styling tokens.
- **`mobile/src/`**: Navigators, screens, components, modals, API modules, and TurboModule specs.
- **`mobile/android/`**: Native Android Gradle project, Java/Kotlin source, and C++ Codegen bindings.

---

## 7. System Architecture

```text
Web Application (React 19) ──────┐
                                 ├──► Node.js / Express REST API ──► PostgreSQL (Neon)
Android Mobile App (React Native)┘                 └──► Private Cloudflare R2 Storage
```

- Both Web and Android clients communicate with the same backend REST API over HTTPS.
- Authentication tokens (JWT) are validated by the backend on every protected route.
- PostgreSQL stores file and folder metadata, user accounts, and structural hierarchy.
- Cloudflare R2 stores private file object binaries; direct public access to R2 is disabled.

---

## 8. Database Design

The PostgreSQL schema is defined in `backend/prisma/schema.prisma`:

### Models & Schema Definition

#### `User` Model
- `id`: UUID (Primary Key)
- `name`: String
- `email`: String (Unique)
- `passwordHash`: String
- `role`: Enum (`ADMIN` | `VIEWER`)
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### `Folder` Model
- `id`: UUID (Primary Key)
- `name`: VarChar(120)
- `parentId`: UUID (Nullable foreign key referencing parent `Folder`)
- `createdById`: UUID (Foreign key referencing `User`)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- *Constraints*: Unique compound key on `[parentId, name]` to prevent sibling duplicate folder names. Cascading deletion on parent folder removal.

#### `File` Model
- `id`: UUID (Primary Key)
- `name`: VarChar(255)
- `storageKey`: String (Unique key in Cloudflare R2)
- `mimeType`: String
- `sizeBytes`: Int
- `folderId`: UUID (Nullable foreign key referencing `Folder`)
- `uploadedById`: UUID (Foreign key referencing `User`)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- *Constraints*: Unique compound key on `[folderId, name]` to prevent sibling duplicate file names. Cascading deletion when containing folder is removed.

#### Workspace Storage Architecture
All authenticated users share access to a single unified hierarchical storage workspace, rather than isolated per-user ownership buckets.

---

## 9. Private Storage Approach

- **Binary Storage**: All uploaded file contents are stored in a private Cloudflare R2 bucket accessed via AWS S3 SDK v3.
- **Access Control**: R2 bucket objects are private and not publicly accessible via static URLs.
- **Presigned URLs**: Preview and download requests generate short-lived presigned GET URLs that expire in approximately **5 minutes** (`SIGNED_URL_TTL_SECONDS=300`).
- **Validation**:
  - Maximum upload file size: **10 MB** (`MAX_FILE_SIZE_MB=10`).
  - Supported file formats: PDF (`application/pdf`), JPG (`image/jpeg`), PNG (`image/png`), TXT (`text/plain`), DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), and XLSX (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- **Security Protections**:
  - Presigned URLs are stored only in client memory and are never persisted or logged.
  - Authorization headers are stripped when client network managers fetch external presigned R2 URLs to prevent credential leakage.

---

## 10. Environment Variables

### Backend Configuration (`backend/.env`)
```bash
# Server Configuration
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/secure_storage?schema=public

# Dedicated Test Database Configuration (Required for integration tests)
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/secure_storage_test?schema=public

# Authentication Configuration
JWT_SECRET=replace-with-a-long-random-secret-min-32-characters
JWT_EXPIRES_IN=1h

# Cloudflare R2 Storage Configuration
STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=replace-with-access-key-id
STORAGE_SECRET_ACCESS_KEY=replace-with-secret-access-key
STORAGE_BUCKET=replace-with-private-bucket-name
SIGNED_URL_TTL_SECONDS=300
MAX_FILE_SIZE_MB=10

# Seed Account Credentials
SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=AdminPassword123!
SEED_VIEWER_NAME=Viewer
SEED_VIEWER_EMAIL=viewer@example.com
SEED_VIEWER_PASSWORD=ViewerPassword123!
```
*Note: `TEST_DATABASE_URL` is required for integration test execution and must point to a dedicated test database to prevent development data pollution.*

### Web Configuration (`web/.env`)
```bash
# Local Development API Endpoint
VITE_API_URL=http://localhost:4000/api

# Production Environment (Vercel)
# VITE_API_URL=https://bgain-secure-storage-vatvv.ondigitalocean.app/api
```

### Mobile Configuration (`mobile/.env`)
```bash
# Android Emulator Local API Endpoint
API_BASE_URL=http://10.0.2.2:4000/api

# Release Binary Endpoint
# API_BASE_URL=https://bgain-secure-storage-vatvv.ondigitalocean.app/api
```

---

## 11. Backend Local Setup

### Prerequisites
- Node.js >= 24.0.0
- npm >= 10.0.0
- PostgreSQL database instance

### Installation & Execution Steps
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed demo accounts (Admin & Viewer)
npm run prisma:seed

# Build TypeScript to dist/
npm run build

# Start production server
npm start
```

For development with hot-reloading:
```bash
npm run dev
```

---

## 12. Web Local Setup

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

### Installation & Execution Steps
```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Vite development server
npm run dev
```

The web application will be accessible at `http://localhost:5173`. Ensure `VITE_API_URL` points to your running backend API.

---

## 13. Android Local Setup

### Prerequisites
- Node.js >= 22.11.0
- JDK 17 (Zulu 17 recommended)
- Android Studio with Android SDK (API level 35/36, NDK 27)
- Android Emulator or USB-connected Android device with USB Debugging enabled

### Installation & Execution Steps
```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Metro bundler
npm start
```

In a separate terminal tab:
```bash
# Run Android application on connected device or emulator
cd mobile
npm run android
```

*Note: Use `API_BASE_URL=http://10.0.2.2:4000/api` for Android Emulator or your machine's local network IP for physical Android devices.*

---

## 14. Android Release APK

To generate a standalone release APK for distribution:

```bash
# Navigate to mobile android directory
cd mobile/android

# Set Java 17 Home
export JAVA_HOME="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"

# Build standalone Release APK
./gradlew clean
./gradlew assembleRelease
```

### Output Location
The compiled binary will be placed at:
```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

The release APK bundles the JavaScript application code, targets the deployed DigitalOcean production API, and operates independently without requiring Metro or `adb reverse`.

---

## 15. Testing and Verification

### Backend Verification
```bash
cd backend

# TypeScript Typecheck
npm run typecheck

# ESLint Linting
npm run lint

# Build Verification
npm run build

# Safety Guard Unit Tests (11 test blocks, 100% pass)
npm run test:unit

# Full Database Integration Tests (Requires dedicated TEST_DATABASE_URL)
npm test
```

### Web Verification
```bash
cd web

# TypeScript Typecheck
npm run typecheck

# Oxlint Linting
npm run lint

# Vitest Test Suite (65 tests across 7 suites, 100% pass)
npm test -- --run

# Vite Production Build
npm run build
```

### Mobile Verification
```bash
cd mobile

# TypeScript Typecheck
npm run typecheck

# ESLint Linting
npm run lint

# Jest Test Suite (81 tests across 8 suites, 100% pass)
npm test

# Clean Release APK Assembly
cd android && ./gradlew clean && ./gradlew assembleRelease
```

---

## 16. Security

- **Password Safety**: Passwords are hashed using `bcryptjs` with salt rounds. Plaintext passwords are never stored or logged.
- **Stateless Auth**: 1-hour JWT tokens signed with a secret key.
- **Backend Role Enforcement**: Express middleware (`requireAdmin`) enforces authorization rules on API routes regardless of client request origin.
- **Private Storage**: The Cloudflare R2 bucket is private. Temporary file access is provided only through short-lived signed URLs.
- **Presigned URLs**: Access to files is granted strictly via 5-minute presigned URLs generated on demand for authenticated users.
- **Validation**: Upload file size (10 MB) and MIME types are enforced on the backend.
- **Mobile Credentials**: Tokens are stored securely using Android Keychain (`EncryptedSharedPreferences`).

---

## 17. Deployment

- **Web Frontend**: Deployed to **Vercel** (`https://bgain.techwithmahe.com`) with SPA routing fallback enabled.
- **Backend REST API**: Deployed to **DigitalOcean App Platform** (`https://bgain-secure-storage-vatvv.ondigitalocean.app/api`) with Prisma client build step inclusion.
- **Database**: Hosted on **Neon PostgreSQL**.
- **Object Storage**: Private bucket on **Cloudflare R2**.
- **Mobile Distribution**: Android Release APK hosted on **Google Drive**.

---

## 18. Known Limitations

- **Signing Key**: The assignment APK is signed with the Android development key (`debug.keystore`) for evaluation and direct side-loading. Play Store distribution requires a private production release keystore.
- **Test Database Isolation**: Backend integration tests require setting a dedicated `TEST_DATABASE_URL` in `backend/.env.test` to prevent executing test teardowns against development data.
- **Demo Deployment**: Web and Backend services are hosted on assignment demo tiers.

---

## 19. Assignment Submission Checklist

- [x] **Complete Source Code**: Pushed to GitHub repository (`https://github.com/mahe-gi/Bgain`).
- [x] **Web Application Deployed**: Active at `https://bgain.techwithmahe.com`.
- [x] **Backend API Deployed**: Active at `https://bgain-secure-storage-vatvv.ondigitalocean.app/api`.
- [x] **Android APK Available**: Downloadable via Google Drive link.
- [x] **Admin Demo Account**: `admin@bgain.com` / `adminpassword`.
- [x] **Viewer Demo Account**: `viewer@bgain.com` / `viewerpassword`.
- [x] **Setup & Architecture Documented**: Full setup, database schema, and system flow documented.
- [x] **Private Storage Documented**: Cloudflare R2 presigned URL mechanism explained.
- [x] **Environment Variables Documented**: Templates documented without exposing real secrets.
