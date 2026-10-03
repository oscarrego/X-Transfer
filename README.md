# X Transfer — YouTube Subscription Migrator

Transfer all your YouTube subscriptions from one Google account to another.

## Setup

### 1. Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (name it anything, e.g. "X Transfer")
3. Go to **APIs & Services → Library**
4. Search for **YouTube Data API v3** and click **Enable**
5. Search for **Google People API** and click **Enable**

### 2. OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `X Transfer`
5. Under **Authorized redirect URIs**, add both:
   - `http://localhost:3001/auth/google/source/callback`
   - `http://localhost:3001/auth/google/target/callback`
6. Click **Create** — save your **Client ID** and **Client Secret**

### 3. OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External** → Create
3. Fill in App name, user support email, developer email
4. Add scopes:
   - `./auth/youtube.readonly`
   - `./auth/youtube`
   - `email`, `profile`, `openid`
5. Under **Test users**, add BOTH your Google accounts (old and new)
6. Save

### 4. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
GOOGLE_CLIENT_ID=your_client_id_from_step_2
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_2
SESSION_SECRET=any_long_random_string_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 5. Install & Run

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Usage

1. **Accounts tab** — Click "Sign in with Google" under Source Account, choose your OLD account
2. Click "Sign in with Google" under Target Account, choose your NEW account
3. **Subscriptions tab** — Click "Fetch subscriptions" to load all your channels
   - Search, filter, select/deselect channels
   - Copy individual or all links to clipboard
4. Click **Transfer → channels** in the action bar
5. **Transfer tab** — Click "Start Transfer" and watch the live progress
6. When done, export the log as `.txt` for your records

---

## YouTube API Quota

- Each subscription insert costs **50 quota units**
- Default daily limit is **10,000 units** = **200 channels/day**
- If you have more than 200 subscriptions, run the transfer over multiple days
- To increase quota: [Google Cloud Console → IAM & Quota](https://console.cloud.google.com/iam-admin/quotas)

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript (plain CSS, no framework)
- **Backend**: Node.js + Express + TypeScript
- **Auth**: Google OAuth 2.0 (googleapis)
- **API**: YouTube Data API v3
