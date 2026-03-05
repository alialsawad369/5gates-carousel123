# 5GATES Carousel Builder
### Instagram Carousel Builder + Auto-Scheduler — 100% Free Stack

---

## 💰 Total Cost: $0/month

| Service | What it does | Free limit |
|---|---|---|
| **Vercel** | Hosts the app | 100GB bandwidth/mo |
| **Turso** | Database (scheduled posts) | 9GB, 1B reads/mo |
| **Cloudinary** | Stores slide images (public URLs for IG) | 25GB storage, 25GB bandwidth/mo |
| **cron-job.org** | Triggers publisher every 5 min | Unlimited jobs, free forever |
| **Instagram Graph API** | Publishes carousel to Instagram | Free (need Business account) |

> ⚡ **No Puppeteer** — slides are rendered by the browser's Canvas API, then uploaded as JPEG.
> This means zero server-side browser overhead — works perfectly on Vercel free tier.

---

## 🏗️ Architecture

```
Browser Canvas API  →  base64 JPEG per slide
        ↓
POST /api/schedule  →  upload to Cloudinary (gets public URLs)
        ↓
Save to Turso DB    →  status: 'scheduled'
        ↓
cron-job.org        →  GET /api/publish every 5 min
        ↓
Scheduler           →  Instagram Graph API carousel publish
        ↓
Instagram Feed ✓    →  status: 'published'
```

---

## 🚀 Deploy in 4 Steps (~45 min total)

---

### Step 1 — Turso (free database)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create 5gates-db

# Get credentials
turso db show 5gates-db        # → copy the URL (libsql://...)
turso db tokens create 5gates-db  # → copy the token
```

Save:
```
TURSO_DATABASE_URL=libsql://5gates-db-YOURNAME.turso.io
TURSO_AUTH_TOKEN=eyJh...
```

---

### Step 2 — Cloudinary (free image hosting)

1. Sign up at **cloudinary.com** (free, no credit card)
2. Go to Dashboard → copy:
   - Cloud name
   - API Key
   - API Secret

Save:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdef...
```

---

### Step 3 — Deploy to Vercel (free)

```bash
# Push to GitHub first
git init
git add .
git commit -m "5GATES Carousel Builder"
# Create repo at github.com, then:
git remote add origin https://github.com/YOU/5gates-carousel.git
git push -u origin main
```

1. Go to **vercel.com** → New Project → Import your repo
2. Framework: **Next.js** (auto-detected)
3. Add **all** these environment variables:

```env
ANTHROPIC_API_KEY        = sk-ant-...
IG_ACCESS_TOKEN          = EAA...
IG_USER_ID               = 17841400000000000
CLOUDINARY_CLOUD_NAME    = your_cloud_name
CLOUDINARY_API_KEY       = 123456789012345
CLOUDINARY_API_SECRET    = abcdef...
TURSO_DATABASE_URL       = libsql://5gates-db-you.turso.io
TURSO_AUTH_TOKEN         = eyJh...
APP_PASSWORD             = YourSecurePassword!
CRON_SECRET              = YourSecurePassword!
NEXT_PUBLIC_BASE_URL     = https://your-app.vercel.app
```

4. Click **Deploy** — done!

---

### Step 4 — cron-job.org (free scheduler, every 5 min)

1. Sign up at **cron-job.org** (100% free, no credit card)
2. Dashboard → Create cronjob:
   - **URL:** `https://your-app.vercel.app/api/publish`
   - **Schedule:** Every 5 minutes  
   - **HTTP Method:** GET
   - **Headers:** Add header:
     - Name: `Authorization`
     - Value: `Bearer YourSecurePassword!`
3. Save → Enable

That's it! The scheduler will check for due posts every 5 minutes.

---

### Step 5 — Instagram Setup

1. Go to **developers.facebook.com** → My Apps → Create App → Business
2. Add product: **Instagram Graph API**
3. Connect your Instagram Business account to a Facebook Page
4. Instagram Graph API → **Generate Token**
   - Required permissions: `instagram_basic`, `instagram_content_publish`
5. Convert to **Long-Lived token** (60 days):
   ```
   GET https://graph.instagram.com/access_token?
     grant_type=ig_exchange_token&
     client_id=APP_ID&
     client_secret=APP_SECRET&
     access_token=SHORT_TOKEN
   ```
6. Get your **User ID**:
   ```
   GET https://graph.instagram.com/me?access_token=YOUR_TOKEN
   ```
   Copy the `id` field.

7. Open your deployed app → **الإعدادات** tab → paste token + user ID → Save

---

## ⚠️ Token Refresh (every 50 days)

Instagram tokens expire after 60 days. Refresh before expiry:

```
GET https://graph.instagram.com/refresh_access_token?
  grant_type=ig_refresh_token&
  access_token=YOUR_LONG_LIVED_TOKEN
```

Set a calendar reminder every 50 days.

---

## 📁 Project Structure

```
app/
  page.tsx                  ← Full UI (Builder + Queue + Settings)
  layout.tsx
  api/
    auth/route.ts           ← Login/logout
    auth/settings/route.ts  ← Instagram credentials
    generate/route.ts       ← AI content (Anthropic)
    schedule/route.ts       ← Upload images + save post
    publish/route.ts        ← Cron endpoint
    posts/route.ts          ← Delete/retry/cancel
lib/
  db.ts          ← Turso (LibSQL) client
  cloudinary.ts  ← Image upload
  instagram.ts   ← Instagram Graph API
  scheduler.ts   ← Check + publish due posts
  auth.ts        ← Cookie auth
```

---

## 🔄 How Publishing Works

1. User builds carousel in the browser
2. Clicks **جدولة** or **نشر الآن**
3. Browser renders each slide using **Canvas API** → JPEG base64
4. Sent to `/api/schedule` → uploaded to **Cloudinary** (gets public URLs)
5. Saved to **Turso DB** with `status='scheduled'`
6. **cron-job.org** hits `/api/publish` every 5 minutes
7. Scheduler finds posts where `scheduled_at <= now`
8. For each image → creates Instagram media container (child)
9. Creates carousel container with all children
10. Publishes → post goes live on Instagram ✓
