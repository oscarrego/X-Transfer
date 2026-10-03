# X Transfer - YouTube Migrator

Transfer all your YouTube subscriptions from one Google account to another in one click.

No third-party service needed. Runs 100% on your local machine. Free to use.

---

## Why This Exists

When switching Google accounts, YouTube offers no built-in way to copy your subscriptions.
Doing it manually means visiting hundreds of channels one by one.

X Transfer solves this by connecting both your old account (source) and new account (target),
fetching all subscriptions from the source, and subscribing the target account to all of them
automatically - with live progress, pause/resume support, and a full transfer log.

---

## Features

- Dual Google OAuth - separate source (read) and target (write) authorization
- Persistent local session storage - accounts stay connected across browser reloads and restarts
- Subscription migration - searchable channel list, selection controls, and individual/bulk link copying
- Playlist transfer - migrate custom playlists with video order, descriptions, and privacy settings
- Watch Later support - fetch and transfer Watch Later video items
- Real-time streaming progress - live per-item updates without page refreshes
- Full transfer controls - pause, resume, or cancel at any moment
- Automatic quota handling - detects daily limits and cleanly alerts you without breaking state
- Result review - easily view skipped or failed items with direct links and copy buttons
- Export logs - download full transfer records as a .txt file
- One-click launcher - start both frontend and backend instantly with `start.bat`

---

## YouTube API Quota

YouTube Data API has a default free quota of **10,000 units per day**.

Each subscription insert costs **50 units**, so you can transfer around **200 channels per day** for free.

If you have more than 200 subscriptions:
- The transfer will stop automatically when quota is hit
- A popup will notify you with how many channels are remaining
- Come back the next day and run transfer again
- Already-subscribed channels are skipped automatically, so you never double-subscribe

To increase your quota, visit: https://console.cloud.google.com and request a quota increase for YouTube Data API v3.

---

## Requirements

- Node.js v18 or higher
- A Google Cloud project (free)
- YouTube Data API v3 enabled
- OAuth 2.0 credentials

---

## Google Cloud Setup

### Step 1 - Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top - New Project
3. Name it `X Transfer` - click Create

### Step 2 - Enable YouTube Data API v3

1. In the left menu - APIs and Services - Library
2. Search for **YouTube Data API v3** - click Enable

### Step 3 - Configure OAuth Consent Screen

1. APIs and Services - OAuth consent screen
2. User type: **External** - Create
3. App name: `X Transfer`
4. Fill in your email for support and developer contact
5. Scopes: skip for now - Save and Continue through all steps
6. Under **Test users** - Add Users:
   - Add your OLD Google account email
   - Add your NEW Google account email
7. Save

### Step 4 - Create OAuth Credentials

1. APIs and Services - Credentials - Create Credentials - OAuth client ID
2. Application type: **Web application**
3. Name: `X Transfer`
4. Under **Authorized redirect URIs** - add both of these exactly:
   ```
   http://localhost:3001/auth/google/source/callback
   http://localhost:3001/auth/google/target/callback
   ```
5. Click Create - copy the **Client ID** and **Client Secret**

---

## Environment Variables Setup

### Step 1 - Create the .env file

```powershell
cd "X Transfer\backend"
copy .env.example .env
```

### Step 2 - Open .env in Notepad and fill in:

```env
GOOGLE_CLIENT_ID=paste_your_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_client_secret_here
SESSION_SECRET=any_long_random_string_you_make_up
PORT=3001
FRONTEND_URL=http://localhost:5173
```

| Variable | Where to get it |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud - Credentials - your OAuth client |
| `GOOGLE_CLIENT_SECRET` | Same page as Client ID |
| `SESSION_SECRET` | Make up any random string (e.g. `mysecretkey123abc`) |
| `PORT` | Keep as `3001` |
| `FRONTEND_URL` | Keep as `http://localhost:5173` |

---

## Installation

```powershell
# Install backend dependencies
cd "X Transfer\backend"
npm install

# Install frontend dependencies
cd "X Transfer\frontend"
npm install
```

---

## Running the App

**Option 1 - One click (recommended):**

Double-click `start.bat` in the X Transfer folder. It starts both servers and opens your browser automatically.

**Option 2 - Manual (two terminals):**

Terminal 1 - Backend:
```powershell
cd "X Transfer\backend"
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd "X Transfer\frontend"
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## First Login Note

When you click Sign in with Google, you may see a warning:
**"Google hasn't verified this app"**

This is normal for personal apps in testing mode. To proceed:
1. Click **Advanced** (small link at the bottom of the warning)
2. Click **Go to X Transfer (unsafe)**
3. Review permissions and click **Continue**

---

## Tech Stack

- Frontend: React 18 + Vite + TypeScript (plain CSS, no UI framework)
- Backend: Node.js + Express + TypeScript
- Auth: Google OAuth 2.0 via googleapis library
- YouTube: YouTube Data API v3
- Sessions: express-session with local persistent storage (no external database needed)
- Streaming: NDJSON chunked response for real-time transfer progress
