# CodePilot AI - Production Deployment Guide

This guide provides step-by-step instructions for deploying the full stack **CodePilot AI** application to production.

---

## 🛠️ Architecture Overview

The production deployment consists of:
1. **Frontend**: React SPA deployed on **Vercel** or **Netlify** (hosted on global CDN).
2. **Backend**: FastAPI web service running on **Render**.
3. **Database**: Managed PostgreSQL instance on **Render**.
4. **Task Queue**: Managed Redis server and an asynchronous Celery worker on **Render**.

---

## 🔑 Prerequisites & Credentials

Before deploying, ensure you have:
1. A **GitHub Account** (to register an OAuth App and connect repositories).
2. A **Google Gemini API Key** (from Google AI Studio).
3. Accounts on **Render** (render.com) and **Vercel** (vercel.com).

---

## 📦 Step 1: Create a GitHub OAuth App

To enable user authentication, you must register a GitHub OAuth application:
1. Go to your GitHub profile -> **Settings** -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
2. Set the following details:
   - **Application Name**: `CodePilot AI`
   - **Homepage URL**: Your production frontend URL (e.g., `https://codepilot-ai.vercel.app` - *you can update this later once Vercel provides a domain*).
   - **Authorization callback URL**: `https://<your-render-backend-url>.onrender.com/api/auth/callback`
3. Click **Register Application**.
4. Copy the **Client ID** and generate a new **Client Secret**. Save these for the next step.

---

## 🚀 Step 2: Deploy Backend Stack to Render

Render Blueprint allows you to deploy the entire backend stack (Database, Redis, FastAPI, and Celery Worker) using the included `render.yaml` configuration.

1. Push your code to your private/public GitHub repository.
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Name your Blueprint Group (e.g., `codepilot-stack`).
6. Under **Environment Variables**, you will see variables needing manual input:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `GITHUB_CLIENT_ID`: The GitHub Client ID from Step 1.
   - `GITHUB_CLIENT_SECRET`: The GitHub Client Secret from Step 1.
   - `BACKEND_CORS_ORIGINS`: Add your Vercel frontend domain (e.g. `https://codepilot-ai.vercel.app`) to allow frontend access.
7. Click **Apply**. Render will automatically provision:
   - PostgreSQL (`codepilot-postgres`)
   - Redis (`codepilot-redis`)
   - FastAPI Backend (`codepilot-backend`)
   - Celery Worker (`codepilot-worker`)
8. Once the build succeeds, copy the public URL of your `codepilot-backend` service (e.g., `https://codepilot-backend.onrender.com`).

---

## 🎨 Step 3: Deploy Frontend to Vercel

Vercel is optimized for React static sites built with Vite.

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** and import your GitHub repository.
3. In the project setup page, configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (Click Edit and select the `frontend` folder).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand the **Environment Variables** section and add:
   - Key: `VITE_API_URL`
   - Value: `https://<your-render-backend-url>.onrender.com` (Your Render Backend URL, *without* a trailing slash).
5. Click **Deploy**.
6. Once deployed, Vercel will provide your production URL (e.g., `https://codepilot-ai.vercel.app`).
7. **Important**: Go back to GitHub developer settings and update your OAuth App's **Homepage URL** and **Authorization callback URL** (if they changed).

---

## 📈 Verification

To verify that your production deployment is operating properly:
1. Visit your frontend URL in a browser.
2. Sign in with GitHub (which will trigger OAuth callback workflow).
3. Verify that connected repositories load, and you are able to request a PR review.
4. Monitor backend logs in the Render Dashboard under the `codepilot-backend` and `codepilot-worker` services.
