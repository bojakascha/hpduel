import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { app, isConfigured } from './firebase.js';

const auth = isConfigured ? getAuth(app) : null;
const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

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
  return cred.user;
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
