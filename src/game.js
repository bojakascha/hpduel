const SETTINGS_KEY = 'hpduel-settings';

function defaultSettings() {
  return { difficulty: 'all', questionCount: 10, showInstantFeedback: false, timeLimit: 0, timePerWord: 0 };
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings(), ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultSettings();
}

export const settings = loadSettings();

export function updateSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export const state = {
  words: [],
  questions: [],
  current: 0,
  score: 0,
  results: [],
  phase: 'loading', // loading | start | quiz | selected | result | mp-lobby
  currentOptions: [],
  chosenOption: null,
  user: null,
  wordStats: {},
  room: null,
  roomId: null,
  roomUnsub: null,
};

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function loadWords() {
  const manifestRes = await fetch('wordfiles/manifest.json');
  const files = await manifestRes.json();

  let details = {};
  const allWords = [];

  for (const file of files) {
    const res = await fetch(`wordfiles/${file}`);
    const data = await res.json();

    if (file === 'word-details.json') {
      details = data;
      continue;
    }

    if (Array.isArray(data)) {
      allWords.push(...data);
    }
  }

  const merged = allWords.map((w) => ({
    ...w,
    explanation: w.explanation ?? details[w.word]?.explanation ?? '',
    example: w.example ?? details[w.word]?.example ?? '',
  }));

  state.words = deduplicateWords(merged);
}

function deduplicateWords(words) {
  const seen = new Set();
  return words.filter((w) => {
    const key = (w.word || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DIFFICULTY_RANGES = { easy: [1, 2], medium: [2, 3], hard: [3, 4] };
const RESURFACE_RATIO = 0.3;

export function selectQuestions() {
  let pool = state.words;

  if (settings.difficulty !== 'all') {
    const [min, max] = DIFFICULTY_RANGES[settings.difficulty];
    const filtered = pool.filter(w => w.difficulty >= min && w.difficulty <= max);
    if (filtered.length > 0) pool = filtered;
  }

  const count = settings.questionCount > 0
    ? Math.min(settings.questionCount, pool.length)
    : pool.length;

  const stats = state.wordStats;
  const hasStats = Object.keys(stats).length > 0;

  let selected;

  if (hasStats) {
    const failed = [];
    const unseen = [];
    const passed = [];

    for (const w of pool) {
      const key = w.word.toLowerCase().trim();
      const s = stats[key];
      if (!s) {
        unseen.push(w);
      } else if (s.seen > 0 && s.correct / s.seen < 0.5) {
        failed.push(w);
      } else {
        passed.push(w);
      }
    }

    const failCount = Math.min(Math.ceil(count * RESURFACE_RATIO), failed.length);
    selected = shuffle(failed).slice(0, failCount);
    const filler = [...shuffle(unseen), ...shuffle(passed)];
    selected.push(...filler.slice(0, count - selected.length));
    selected = shuffle(selected);
  } else {
    selected = shuffle(pool);
  }

  return selected.slice(0, count);
}

export function initQuiz() {
  state.questions = selectQuestions();
  state.current = 0;
  state.score = 0;
  state.results = [];
  state.chosenOption = null;
  state.currentOptions = shuffleOptions(state.questions[0]);
  state.phase = 'quiz';
}

export function initQuizWithQuestions(questions) {
  state.questions = questions;
  state.current = 0;
  state.score = 0;
  state.results = [];
  state.chosenOption = null;
  state.currentOptions = shuffleOptions(questions[0]);
  state.phase = 'quiz';
}

export function recordAnswer(chosen) {
  const q = state.questions[state.current];
  const isCorrect = chosen === q.correct;

  state.chosenOption = chosen;
  state.phase = 'selected';
  state.results.push({ ...q, chosen, isCorrect });
  if (isCorrect) state.score++;
}

export function recordTimeout() {
  const q = state.questions[state.current];
  state.chosenOption = null;
  state.phase = 'selected';
  state.results.push({ ...q, chosen: '(tid slut)', isCorrect: false });
}

export function advanceQuestion() {
  state.current++;
  state.chosenOption = null;

  if (state.current >= state.questions.length) {
    state.phase = 'result';
  } else {
    state.phase = 'quiz';
    state.currentOptions = shuffleOptions(state.questions[state.current]);
  }
}

export function toggleDetail(id) {
  const detail = document.getElementById(`detail-${id}`);
  const item = document.getElementById(`item-${id}`);
  if (!detail || !item) return;

  const isOpen = detail.classList.contains('open');

  document.querySelectorAll('.result-detail').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.result-item').forEach(d => d.classList.remove('expanded'));

  if (!isOpen) {
    detail.classList.add('open');
    item.classList.add('expanded');
  }
}

function shuffleOptions(question) {
  const allDistractors = question.distractors || [];
  const distractors = shuffle([...allDistractors]).slice(0, 3);
  const all = [question.correct, ...distractors].filter(Boolean);
  const unique = [...new Set(all)];
  return shuffle(unique);
}
