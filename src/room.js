import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { app, isConfigured } from './firebase.js';

const db = isConfigured ? getFirestore(app) : null;

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(len = 5) {
  let code = '';
  for (let i = 0; i < len; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export async function createRoom(uid, name, gameSettings) {
  if (!db) throw new Error('Firebase är inte konfigurerat.');

  const code = generateCode();
  const roomRef = doc(collection(db, 'rooms'));

  await setDoc(roomRef, {
    code,
    hostUid: uid,
    status: 'waiting',
    settings: {
      difficulty: gameSettings.difficulty || 'all',
      questionCount: gameSettings.questionCount || 20,
      timeLimit: gameSettings.timeLimit || 0,
      timePerWord: gameSettings.timePerWord || 0,
    },
    questions: [],
    createdAt: serverTimestamp(),
    players: {
      [uid]: { name: name || 'Spelare', score: 0, current: 0, finished: false, finishedAt: null },
    },
  });

  return { id: roomRef.id, code };
}

export async function joinRoom(code, uid, name) {
  if (!db) throw new Error('Firebase är inte konfigurerat.');

  const searchCode = code.toUpperCase().trim();
  console.log('[joinRoom] searching for code:', JSON.stringify(searchCode));
  const q = query(
    collection(db, 'rooms'),
    where('code', '==', searchCode),
  );
  let snap;
  try {
    snap = await getDocs(q);
    console.log('[joinRoom] query returned', snap.size, 'docs');
  } catch (err) {
    console.error('[joinRoom] query error:', err);
    throw new Error('Kunde inte söka efter spel: ' + err.message);
  }

  if (snap.empty) throw new Error('Inget spel hittades med den koden.');

  const roomDoc = snap.docs[0];
  const roomData = roomDoc.data();

  if (roomData.status !== 'waiting') throw new Error('Spelet har redan startat.');

  if (roomData.players[uid]) throw new Error('Du är redan med i spelet.');
  const playerCount = Object.keys(roomData.players || {}).length;
  if (playerCount >= 2) throw new Error('Spelet är redan fullt.');

  await updateDoc(doc(db, 'rooms', roomDoc.id), {
    [`players.${uid}`]: { name: name || 'Spelare', score: 0, current: 0, finished: false, finishedAt: null },
  });

  return { id: roomDoc.id, code: roomData.code };
}

export function listenRoom(roomId, callback) {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
}

export async function updateRoomSettings(roomId, newSettings) {
  if (!db) return;
  await updateDoc(doc(db, 'rooms', roomId), {
    'settings.difficulty': newSettings.difficulty || 'all',
    'settings.questionCount': newSettings.questionCount || 20,
    'settings.timeLimit': newSettings.timeLimit || 0,
    'settings.timePerWord': newSettings.timePerWord || 0,
  });
}

export async function startRoom(roomId, questions) {
  if (!db) return;
  const roomQuestions = questions.map((q, i) => ({
    id: q.id ?? i,
    word: q.word ?? '',
    correct: q.correct ?? '',
    distractors: q.distractors || [],
    explanation: q.explanation || '',
    example: q.example || '',
    difficulty: q.difficulty ?? 0,
  }));
  await updateDoc(doc(db, 'rooms', roomId), { status: 'playing', questions: roomQuestions });
}

export async function updatePlayerProgress(roomId, uid, current, score) {
  if (!db) return;
  await updateDoc(doc(db, 'rooms', roomId), {
    [`players.${uid}.current`]: current,
    [`players.${uid}.score`]: score,
  });
}

export async function markPlayerFinished(roomId, uid, score) {
  if (!db) return;
  await updateDoc(doc(db, 'rooms', roomId), {
    [`players.${uid}.finished`]: true,
    [`players.${uid}.finishedAt`]: Date.now(),
    [`players.${uid}.score`]: score,
  });

  const snap = await getDoc(doc(db, 'rooms', roomId));
  const data = snap.data();
  const allFinished = Object.values(data.players).every(p => p.finished);
  if (allFinished) {
    await updateDoc(doc(db, 'rooms', roomId), { status: 'finished' });
  }
}
