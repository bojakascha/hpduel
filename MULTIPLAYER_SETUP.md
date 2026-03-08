# Multiplayer Setup

For the second player to find and join a game, you need:

## 1. Deploy Firestore rules

The default Firestore rules deny all access. Deploy the included rules:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select existing project, use firestore.rules
firebase deploy --only firestore
```

Or in Firebase Console: **Firestore → Rules**, paste the contents of `firestore.rules`, and publish.

## 2. Authorized domains (for deployed app)

In **Firebase Console → Authentication → Settings → Authorized domains**, add:

- Your GitHub Pages URL, e.g. `your-username.github.io`
- Or your custom domain

## 3. GitHub Pages (if deployed)

Ensure the Firebase config secrets are set in **GitHub → Settings → Secrets** (see main README).
