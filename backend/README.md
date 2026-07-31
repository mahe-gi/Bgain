# Secure Storage Management System — Backend

Express 5 REST API built with TypeScript for Node.js 24.

## Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` (optional, as defaults exist for Phase 1):

```bash
cp .env.example .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Server

Start server with auto-reload:

```bash
npm run dev
```

The server runs on `http://localhost:4000`.

### 4. Health Check

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-07-31T14:40:00.000Z"
  }
}
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the server in development mode with `tsx watch` |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm run start` | Runs the production build from `dist/server.js` |
| `npm run typecheck` | Type-checks code without emitting outputs |
| `npm run lint` | Lints TypeScript files with ESLint |
| `npm test` | Runs test suite using Vitest |

## Phase 1 Architecture

- **`src/app.ts`**: Express application factory (Security with Helmet & CORS, Pino HTTP logger, rate limiter, standard error handling).
- **`src/config/env.ts`**: Environment configuration parsing and validation using Zod.
- **`src/middleware/error.middleware.ts`**: Standardized success and error response formatting, 404 handler, and global error handler.
- **`src/routes/health.route.ts`**: Health endpoint implementation (`GET /api/health`).
