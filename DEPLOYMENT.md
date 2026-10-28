# 🚀 Sehat Setu — Production Launch & Deployment Guide

This guide provides instructions for deploying **Sehat Setu** to production on free cloud hosting services (Render, Railway, or VPS).

---

## 📋 Pre-Launch Verification Checklist

Before pushing to production, ensure the automated test suite passes:
```bash
npm test
```
All 33+ end-to-end tests should report `[PASS]` with 0 failures.

---

## 🌟 Option 1: Deploy on Render (Recommended — Free & Easiest)

Render offers free web service hosting for Node.js applications with automated SSL/TLS certificates.

### Method A: Blueprint 1-Click Deploy (Using `render.yaml`)
1. Push your code to your GitHub / GitLab repository:
   ```bash
   git add .
   git commit -m "Sehat Setu production release"
   git push origin main
   ```
2. Log into [Render.com](https://render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](render.yaml) and configure the service.
6. Under Environment Variables, fill in your production values (Supabase / Google OAuth if using).
7. Click **Apply**. Your app will be live at `https://sehat-setu-xxxx.onrender.com`.

### Method B: Manual Web Service Setup
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

---

## 🚂 Option 2: Deploy on Railway

1. Install Railway CLI or go to [railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Railway automatically detects `package.json` and runs `npm start`.
4. Add environment variables in the **Variables** tab (`NODE_ENV=production`, `PORT=8080`, etc.).
5. Generate a public domain under **Settings -> Networking**.

---

## 🐳 Option 3: Deploy with Docker

You can run the container anywhere Docker is installed:

```bash
# Build the production image
docker build -t sehat-setu:latest .

# Run the container mapping host port 3000
docker run -d -p 3000:3000 --name sehat-setu-app sehat-setu:latest
```

Verify container health:
```bash
curl http://localhost:3000/health
```

---

## 🔑 Environment Variables Reference

| Variable Name | Purpose | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the web server | `3000` (Render/Railway set dynamically) |
| `NODE_ENV` | Environment mode | `production` |
| `ADMIN_INVITE_CODE` | Code required to register Admin accounts | `ADMIN2026` |
| `SUPABASE_URL` | Supabase Cloud Database URL | `https://xyz.supabase.co` (Optional) |
| `SUPABASE_ANON_KEY` | Supabase Public Anonymous Key | `ey...` (Optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin Service Key | `ey...` (Optional) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | (Optional for Google Sign-In) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | (Optional for Google Sign-In) |

> **Note:** If Supabase environment variables are omitted, Sehat Setu automatically falls back to local high-speed persistent storage without crashing.

---

## 🛡️ Built-in Security Features Active in Production
- **Path Traversal & Sensitive File Defense**: Direct downloads of `.env`, `*.json`, `*.sql`, `*.exe` return `403 Forbidden`.
- **Cryptographic OTP Authentication**: 6-digit dynamic codes with 5-minute expiry & brute-force lockdown (max 4 attempts).
- **IDOR Protection**: Tamper-proof session validation ensures users can only modify their own profile data.
- **Client-Side Image Compression**: Automatic canvas resize ensures photos stay well below 5MB before upload.
- **Security Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
- **Rate Limiting**: Protects login, registration, and upload routes against DDoS and brute-force attacks.
