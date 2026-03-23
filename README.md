# NoteFlow

A minimalist, production-ready note-taking app with AI assistance, built with **React + Vite**, **Firebase**, and **Tailwind CSS**.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Google Sign-In** | Firebase Authentication via Google popup |
| **Real-time notes** | Firestore syncs notes instantly across devices |
| **Markdown editor** | Write in markdown, toggle live preview |
| **AI Assistant** | OpenAI-powered chat panel (summarise, improve, Q&A) |
| **File import** | Drag-and-drop `.txt` / `.md` files → instant notes |
| **Cookie consent** | GDPR-compliant banner with localStorage persistence |
| **Responsive** | Works on desktop, tablet, and mobile |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd noteflow
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys (see sections below).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 🔥 Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.

2. **Enable Authentication:**
   - Authentication → Sign-in method → Google → Enable

3. **Enable Firestore:**
   - Firestore Database → Create database → Start in **production mode**

4. **Get your config:**
   - Project Settings → General → Your apps → Web app → SDK setup
   - Copy the values into `.env`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:...:web:...
```

5. **Deploy Firestore security rules:**

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

The rules in `firestore.rules` ensure each user can only read/write their own notes.

---

## 🤖 OpenAI Setup

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

2. Add to `.env`:

```env
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_MODEL=gpt-4o-mini   # or gpt-4o, gpt-3.5-turbo
```

> ⚠️ **Production warning:** The API key is embedded in the browser bundle. For a real deployment, route AI requests through your own backend server to keep the key secret. The `.env` approach is fine for personal/local use.

---

## 🏗️ Project Structure

```
noteflow/
├── public/
│   └── favicon.svg
├── src/
│   ├── firebase/
│   │   ├── config.js          # Firebase init
│   │   └── firestore.js       # CRUD helpers
│   ├── hooks/
│   │   ├── useAuth.js         # Auth state + sign-in/out
│   │   └── useNotes.js        # Notes state + CRUD + import
│   ├── components/
│   │   ├── Auth/
│   │   │   └── LoginPage.jsx
│   │   ├── Notes/
│   │   │   ├── NoteList.jsx   # Sidebar list
│   │   │   ├── NoteItem.jsx   # Single note row
│   │   │   └── NoteEditor.jsx # Main editing area
│   │   ├── AI/
│   │   │   └── AIAssistant.jsx
│   │   ├── Import/
│   │   │   └── FileImport.jsx
│   │   └── CookieBanner.jsx
│   ├── App.jsx                # Root layout + state
│   ├── main.jsx
│   └── index.css
├── firestore.rules            # Firestore security rules
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 📦 Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to any static host:

- **Firebase Hosting:** `firebase deploy --only hosting`
- **Vercel:** `vercel --prod`
- **Netlify:** drag `dist/` folder to netlify.com

---

## 🔒 Security Notes

- Firestore rules (`firestore.rules`) enforce per-user isolation — users can only access their own notes.
- The OpenAI API key in `.env` is exposed in the browser. Use a backend proxy in production.
- Cookie consent choices are stored in `localStorage` under the key `noteflow_cookie_consent`.

---

## 🎨 Customisation

- **Colours:** Edit `tailwind.config.js` → `theme.extend.colors`
- **AI model:** Change `VITE_OPENAI_MODEL` in `.env`
- **Font:** Edit `index.html` Google Fonts link + `tailwind.config.js` `fontFamily`
