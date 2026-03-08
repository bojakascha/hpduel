# Multiplayer Setup

For the second player to find and join a game, you need:

## 1. Add Firebase secrets (required for GitHub Pages)

In **GitHub → Your repo → Settings → Secrets and variables → Actions**, add these repository secrets (copy values from your local `.env`):

| Secret name | From .env |
|-------------|-----------|
| `VITE_FIREBASE_API_KEY` | VITE_FIREBASE_API_KEY |
| `VITE_FIREBASE_AUTH_DOMAIN` | VITE_FIREBASE_AUTH_DOMAIN |
| `VITE_FIREBASE_PROJECT_ID` | VITE_FIREBASE_PROJECT_ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | VITE_FIREBASE_STORAGE_BUCKET |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | VITE_FIREBASE_MESSAGING_SENDER_ID |
| `VITE_FIREBASE_APP_ID` | VITE_FIREBASE_APP_ID |

**Important:** Secret names must match exactly (including `VITE_` prefix). After adding, push to `main` to trigger a new deploy.

## 2. Deploy Firestore rules

The default Firestore rules deny all access. Deploy the included rules:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select existing project, use firestore.rules
firebase deploy --only firestore
```

Or in Firebase Console: **Firestore → Rules**, paste the contents of `firestore.rules`, and publish.

## 3. Authorized domains (for deployed app)

In **Firebase Console → Authentication → Settings → Authorized domains**, add:

- Your GitHub Pages URL, e.g. `your-username.github.io`
- Or your custom domain

## 4. Verify

After pushing, check the Actions tab. If the "Check Firebase secrets" step fails, the secrets are missing or misnamed.
