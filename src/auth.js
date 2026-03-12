import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithPopup,
  linkWithCredential,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { app, isConfigured } from './firebase.js';

const auth = isConfigured ? getAuth(app) : null;
const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

const NAME_KEY = 'hpduel-playerName';

function generatePlayerName() {
  const num = Math.floor(100 + Math.random() * 900);
  return `Spelare_${num}`;
}

export function getSavedName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function saveNameLocally(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
}

const ERROR_MESSAGES = {
  'auth/user-not-found': 'Inget konto hittat med den e-postadressen.',
  'auth/wrong-password': 'Fel lösenord.',
  'auth/invalid-credential': 'Fel e-post eller lösenord.',
  'auth/email-already-in-use': 'E-postadressen används redan.',
  'auth/weak-password': 'Lösenordet måste vara minst 6 tecken.',
  'auth/invalid-email': 'Ogiltig e-postadress.',
  'auth/too-many-requests': 'För många försök. Försök igen senare.',
};

function mapError(err) {
  return ERROR_MESSAGES[err.code] || 'Något gick fel. Försök igen.';
}

export async function loginWithEmail(email, password) {
  if (!auth) throw new Error('Firebase är inte konfigurerat.');
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw new Error(mapError(err));
  }
}

export async function registerWithEmail(email, password, name) {
  if (!auth) throw new Error('Firebase är inte konfigurerat.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    return cred;
  } catch (err) {
    throw new Error(mapError(err));
  }
}

export async function loginWithGoogle() {
  if (!auth || !googleProvider) throw new Error('Firebase är inte konfigurerat.');
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return null;
    throw new Error(mapError(err));
  }
}

export async function ensureAnonymousAuth() {
  if (!auth) throw new Error('Firebase är inte konfigurerat.');
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  const user = cred.user;
  if (!user.displayName) {
    const name = getSavedName() || generatePlayerName();
    await updateProfile(user, { displayName: name });
    saveNameLocally(name);
  }
  return user;
}

export async function updateDisplayName(name) {
  if (!auth?.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: name });
  saveNameLocally(name);
}

export async function linkGoogle() {
  if (!auth?.currentUser || !googleProvider) throw new Error('Firebase är inte konfigurerat.');
  try {
    return await linkWithPopup(auth.currentUser, googleProvider);
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
      throw new Error('Det kontot är redan kopplat till en annan användare. Logga in direkt istället.');
    }
    if (err.code === 'auth/popup-closed-by-user') return null;
    throw new Error(mapError(err));
  }
}

export async function linkEmail(email, password) {
  if (!auth?.currentUser) throw new Error('Firebase är inte konfigurerat.');
  try {
    const credential = EmailAuthProvider.credential(email, password);
    return await linkWithCredential(auth.currentUser, credential);
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
      throw new Error('Den e-postadressen är redan kopplad till ett annat konto.');
    }
    throw new Error(mapError(err));
  }
}

export async function deleteAccount() {
  if (!auth?.currentUser) return;
  await auth.currentUser.delete();
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth?.currentUser ?? null;
}
