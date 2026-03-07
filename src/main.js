import './style.css';
import { state, settings, loadWords, initQuiz, selectQuestions, initQuizWithQuestions, updateSetting, recordAnswer, recordTimeout, advanceQuestion, toggleDetail } from './game.js';
import { renderStart, renderQuiz, renderResult, renderSettings, renderLogin, renderMultiplayerMenu, renderLobby } from './render.js';
import { loginWithEmail, registerWithEmail, loginWithGoogle, ensureAnonymousAuth, logout, onAuthChange } from './auth.js';
import { ensureUser, saveSession, loadWordStats, saveUserSettings, loadUserSettings } from './db.js';
import { createRoom, joinRoom, listenRoom, startRoom, updateRoomSettings, updatePlayerProgress, markPlayerFinished } from './room.js';

const SELECTED_PAUSE = 400;
const EXIT_DURATION = 220;
const ADVANCE_DELAY = SELECTED_PAUSE + EXIT_DURATION;

// ── Timers ────────────────────────────────────────────────────────────────────

let totalTimerEnd = 0;
let wordTimerEnd = 0;
let timerRaf = null;

function startTimers() {
  stopTimers();
  const now = Date.now();
  if (settings.timeLimit > 0) totalTimerEnd = now + settings.timeLimit * 1000;
  startWordTimer();
  tickTimers();
}

function startWordTimer() {
  if (settings.timePerWord > 0) wordTimerEnd = Date.now() + settings.timePerWord * 1000;
}

function pauseWordTimer() {
  wordTimerEnd = 0;
}

function stopTimers() {
  if (timerRaf) cancelAnimationFrame(timerRaf);
  timerRaf = null;
  totalTimerEnd = 0;
  wordTimerEnd = 0;
}

function tickTimers() {
  timerRaf = requestAnimationFrame(() => {
    if (state.phase !== 'quiz' && state.phase !== 'selected') {
      stopTimers();
      return;
    }

    const now = Date.now();

    // Total timer display
    if (totalTimerEnd > 0) {
      const el = document.getElementById('totalTimer');
      const remaining = Math.max(0, totalTimerEnd - now);
      if (el) {
        const secs = Math.ceil(remaining / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        el.textContent = `${m}:${String(s).padStart(2, '0')}`;
        el.classList.toggle('urgent', secs <= 10);
      }
      if (remaining <= 0 && state.phase === 'quiz') {
        handleTotalTimeout();
        return;
      }
    }

    // Word timer bar
    if (wordTimerEnd > 0 && state.phase === 'quiz') {
      const fill = document.getElementById('wordTimerFill');
      const remaining = Math.max(0, wordTimerEnd - now);
      const ratio = remaining / (settings.timePerWord * 1000);
      if (fill) {
        fill.style.transform = `scaleX(${ratio})`;
        fill.classList.toggle('urgent', ratio < 0.25);
      }
      if (remaining <= 0) {
        handleWordTimeout();
        return;
      }
    }

    tickTimers();
  });
}

function handleWordTimeout() {
  if (state.phase !== 'quiz') return;
  recordTimeout();
  render();
  pauseWordTimer();

  setTimeout(() => {
    const content = document.querySelector('.quiz-content');
    if (content) content.classList.add('exiting');
  }, SELECTED_PAUSE);

  setTimeout(() => {
    advanceQuestion();
    render();
    if (state.phase === 'result') {
      stopTimers();
      onQuizComplete();
      if (state.roomId && state.user) {
        markPlayerFinished(state.roomId, state.user.uid, state.score).catch(() => {});
      }
    } else {
      startWordTimer();
      tickTimers();
      if (state.roomId && state.user) {
        updatePlayerProgress(state.roomId, state.user.uid, state.current, state.score).catch(() => {});
      }
    }
  }, ADVANCE_DELAY);
}

function handleTotalTimeout() {
  if (state.phase === 'quiz') {
    recordTimeout();
  }
  advanceToEnd();
  stopTimers();
  render();
  onQuizComplete();
  if (state.roomId && state.user) {
    markPlayerFinished(state.roomId, state.user.uid, state.score).catch(() => {});
  }
}

function advanceToEnd() {
  state.phase = 'result';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function transitionOut(callback) {
  const screen = document.querySelector('.screen');
  if (screen) {
    screen.classList.add('screen-exit');
    setTimeout(callback, 200);
  } else {
    callback();
  }
}

function openOverlay(id, html) {
  const app = document.getElementById('app');
  if (document.getElementById(id)) return document.getElementById(id);

  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'slide-overlay';
  overlay.innerHTML = html;
  app.appendChild(overlay);

  overlay.offsetHeight;
  overlay.classList.add('open');
  return overlay;
}

function closeOverlay(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

// ── Overflow Menu ─────────────────────────────────────────────────────────────

function attachOverflowMenu() {
  const btn = document.getElementById('overflowMenuBtn');
  const menu = document.getElementById('overflowMenu');
  if (!btn || !menu) return;

  const closeMenu = () => menu.classList.remove('open');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.toggle('open');
    if (wasOpen) {
      setTimeout(() => {
        document.addEventListener('click', closeMenu, { once: true });
      }, 0);
    }
  });

  menu.querySelectorAll('.overflow-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      const action = item.dataset.action;
      if (action === 'restart') {
        stopTimers();
        cleanupRoom();
        transitionOut(() => { state.phase = 'start'; render(); });
      } else if (action === 'settings') {
        openSettings();
      } else if (action === 'login') {
        openLogin();
      } else if (action === 'logout') {
        logout().then(() => render());
      }
    });
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

function openSettings() {
  const overlay = openOverlay('settingsOverlay', renderSettings());

  overlay.querySelector('#settingsBackBtn').addEventListener('click', () => closeOverlay('settingsOverlay'));

  overlay.querySelectorAll('.setting-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.setting;
      const raw = btn.dataset.value;
      const value = (key === 'questionCount' || key === 'timeLimit' || key === 'timePerWord') ? Number(raw) : raw;
      updateSetting(key, value);
      btn.closest('.setting-options').querySelectorAll('.setting-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      syncSettings();
    });
  });

  const toggle = overlay.querySelector('#instantFeedbackToggle');
  if (toggle) {
    toggle.addEventListener('change', () => {
      updateSetting('showInstantFeedback', toggle.checked);
      syncSettings();
    });
  }
}

function syncSettings() {
  if (state.user) saveUserSettings(state.user.uid, settings).catch(() => {});
}

// ── Login ─────────────────────────────────────────────────────────────────────

let loginMode = 'login';

function openLogin(mode) {
  loginMode = mode || 'login';
  closeOverlay('loginOverlay');

  // Small delay if switching modes so the old overlay clears
  const show = () => {
    const overlay = openOverlay('loginOverlay', renderLogin(loginMode));
    attachLoginListeners(overlay);
  };

  if (document.getElementById('loginOverlay')) {
    setTimeout(show, 50);
  } else {
    show();
  }
}

function attachLoginListeners(overlay) {
  overlay.querySelector('#loginBackBtn').addEventListener('click', () => closeOverlay('loginOverlay'));

  overlay.querySelector('#loginToggleBtn').addEventListener('click', () => {
    openLogin(loginMode === 'login' ? 'register' : 'login');
  });

  overlay.querySelector('#googleLoginBtn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#googleLoginBtn');
    const errorEl = overlay.querySelector('#loginError');
    btn.disabled = true;
    errorEl.textContent = '';
    try {
      const result = await loginWithGoogle();
      if (result) {
        closeOverlay('loginOverlay');
        render();
      }
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = overlay.querySelector('#emailInput').value.trim();
    const password = overlay.querySelector('#passwordInput').value;
    const nameInput = overlay.querySelector('#nameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    const submitBtn = overlay.querySelector('#loginSubmitBtn');
    const errorEl = overlay.querySelector('#loginError');

    if (!email || !password) {
      errorEl.textContent = 'Fyll i alla fält.';
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    try {
      if (loginMode === 'register') {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      closeOverlay('loginOverlay');
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ── Multiplayer ──────────────────────────────────────────────────────────────

function cleanupRoom() {
  if (state.roomUnsub) {
    state.roomUnsub();
    state.roomUnsub = null;
  }
  state.room = null;
  state.roomId = null;
}

function getUserName() {
  if (!state.user) return 'Spelare';
  return state.user.displayName || state.user.email?.split('@')[0] || 'Spelare';
}

async function ensureAuthForMultiplayer() {
  if (state.user) return state.user;
  const user = await ensureAnonymousAuth();
  state.user = user;
  return user;
}

function getPlayerName() {
  const input = document.getElementById('mpNameInput');
  if (input) return input.value.trim();
  return getUserName();
}

function openMultiplayerMenu() {
  const overlay = openOverlay('mpMenuOverlay', renderMultiplayerMenu());
  overlay.querySelector('#mpMenuBackBtn').addEventListener('click', () => closeOverlay('mpMenuOverlay'));

  // Show name input only if user has no display name
  const nameField = overlay.querySelector('#mpNameField');
  const nameInput = overlay.querySelector('#mpNameInput');
  if (state.user?.displayName) {
    nameField.style.display = 'none';
  }
  nameInput.addEventListener('input', () => nameInput.classList.remove('input-error'));

  overlay.querySelector('#mpCreateBtn').addEventListener('click', async () => {
    const name = getPlayerName();
    const nameInput = overlay.querySelector('#mpNameInput');
    if (!name) {
      nameInput.classList.add('input-error');
      nameInput.focus();
      return;
    }
    const btn = overlay.querySelector('#mpCreateBtn');
    btn.disabled = true;
    try {
      await ensureAuthForMultiplayer();
      const { id } = await createRoom(state.user.uid, name, settings);
      state.roomId = id;
      state.phase = 'mp-lobby';
      closeOverlay('mpMenuOverlay');
      startRoomListener(id);
    } catch (err) {
      btn.disabled = false;
      alert(err.message);
    }
  });

  const joinForm = overlay.querySelector('#mpJoinForm');
  overlay.querySelector('#mpJoinBtn').addEventListener('click', () => {
    joinForm.style.display = joinForm.style.display === 'none' ? 'flex' : 'none';
    const input = overlay.querySelector('#mpCodeInput');
    if (joinForm.style.display !== 'none') input.focus();
  });

  overlay.querySelector('#mpJoinSubmitBtn').addEventListener('click', async () => {
    const name = getPlayerName();
    const nameInput = overlay.querySelector('#mpNameInput');
    if (!name) {
      nameInput.classList.add('input-error');
      nameInput.focus();
      return;
    }
    const input = overlay.querySelector('#mpCodeInput');
    const errorEl = overlay.querySelector('#mpJoinError');
    const code = input.value.trim();
    if (!code) { errorEl.textContent = 'Ange en spelkod.'; return; }

    const btn = overlay.querySelector('#mpJoinSubmitBtn');
    btn.disabled = true;
    errorEl.textContent = '';
    try {
      await ensureAuthForMultiplayer();
      const { id } = await joinRoom(code, state.user.uid, name);
      state.roomId = id;
      state.phase = 'mp-lobby';
      closeOverlay('mpMenuOverlay');
      startRoomListener(id);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
}

function startRoomListener(roomId) {
  if (state.roomUnsub) state.roomUnsub();
  state.roomUnsub = listenRoom(roomId, (room) => {
    const prevStatus = state.room?.status;
    state.room = room;

    // Lobby — render on any update (initial load, player joined, etc.)
    if (room.status === 'waiting' && state.phase === 'mp-lobby') {
      render();
      return;
    }

    // Room started — transition to quiz
    if (room.status === 'playing' && state.phase === 'mp-lobby') {
      settings.timeLimit = room.settings.timeLimit ?? 0;
      settings.timePerWord = room.settings.timePerWord ?? 0;
      initQuizWithQuestions(room.questions);
      render();
      startTimers();
      return;
    }

    // Update opponent progress during quiz
    if ((room.status === 'playing' || room.status === 'finished') && (state.phase === 'quiz' || state.phase === 'selected')) {
      const opBar = document.querySelector('.opponent-bar');
      if (opBar && state.user) {
        const opUid = Object.keys(room.players).find(id => id !== state.user.uid);
        if (opUid) {
          const op = room.players[opUid];
          const total = state.questions.length;
          const progressEl = opBar.querySelector('.opponent-progress');
          const fillEl = opBar.querySelector('.opponent-fill');
          if (progressEl) progressEl.textContent = `${op.current}/${total} \u00b7 ${op.score} rätt`;
          if (fillEl) {
            fillEl.style.width = `${total > 0 ? (op.current / total) * 100 : 0}%`;
            fillEl.style.setProperty('--accuracy', op.current > 0 ? op.score / op.current : 1);
          }
        }
      }
      return;
    }

    // Update comparison on result screen
    if (state.phase === 'result' && document.querySelector('.mp-comparison')) {
      render();
    }
  });
}

function attachLobbyListeners() {
  const startBtn = document.getElementById('lobbyStartBtn');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      try {
        // Apply room settings for question selection
        const rs = state.room.settings;
        settings.difficulty = rs.difficulty || 'all';
        settings.questionCount = rs.questionCount || 20;
        settings.timeLimit = rs.timeLimit || 0;
        settings.timePerWord = rs.timePerWord || 0;
        const questions = selectQuestions();
        await startRoom(state.roomId, questions);
      } catch {
        startBtn.disabled = false;
      }
    });
  }

  // Host can change settings
  const lobbySettings = document.getElementById('lobbySettings');
  if (lobbySettings) {
    lobbySettings.querySelectorAll('.setting-option:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.setting;
        const raw = btn.dataset.value;
        const value = (key === 'questionCount' || key === 'timeLimit' || key === 'timePerWord') ? Number(raw) : raw;
        const newSettings = { ...state.room.settings, [key]: value };
        btn.closest('.setting-options').querySelectorAll('.setting-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateRoomSettings(state.roomId, newSettings).catch(() => {});
      });
    });
  }

  const leaveBtn = document.getElementById('lobbyLeaveBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      cleanupRoom();
      state.phase = 'start';
      render();
    });
  }

  const codeEl = document.getElementById('lobbyCode');
  if (codeEl) {
    codeEl.addEventListener('click', () => {
      navigator.clipboard?.writeText(codeEl.textContent).then(() => {
        codeEl.classList.add('copied');
        setTimeout(() => codeEl.classList.remove('copied'), 1200);
      });
    });
  }
}

// ── Session persistence ──────────────────────────────────────────────────────

async function onQuizComplete() {
  if (!state.user) return;
  try {
    const updatedStats = await saveSession(
      state.user.uid,
      state.results,
      state.score,
      settings.difficulty,
    );
    if (updatedStats) state.wordStats = updatedStats;
  } catch {
    // Silently fail — game still works offline
  }
}

async function onUserLogin(user) {
  try {
    await ensureUser(user.uid);
    const [stats, remoteSettings] = await Promise.all([
      loadWordStats(user.uid),
      loadUserSettings(user.uid),
    ]);
    state.wordStats = stats;
    if (remoteSettings) {
      Object.assign(settings, remoteSettings);
      updateSetting('difficulty', settings.difficulty);
      updateSetting('questionCount', settings.questionCount);
    }
  } catch {
    // Continue with local data
  }
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function handleAnswer(chosen) {
  if (state.phase !== 'quiz') return;

  recordAnswer(chosen);
  pauseWordTimer();
  render();

  setTimeout(() => {
    const content = document.querySelector('.quiz-content');
    if (content) content.classList.add('exiting');
  }, SELECTED_PAUSE);

  setTimeout(() => {
    advanceQuestion();
    render();
    if (state.phase === 'result') {
      stopTimers();
      onQuizComplete();
      if (state.roomId && state.user) {
        markPlayerFinished(state.roomId, state.user.uid, state.score).catch(() => {});
      }
    } else {
      startWordTimer();
      if (state.roomId && state.user) {
        updatePlayerProgress(state.roomId, state.user.uid, state.current, state.score).catch(() => {});
      }
    }
  }, ADVANCE_DELAY);
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');

  switch (state.phase) {
    case 'loading':
      app.innerHTML = '';
      break;

    case 'start':
      app.innerHTML = renderStart();
      document.getElementById('startBtn').addEventListener('click', () => {
        transitionOut(() => { cleanupRoom(); initQuiz(); render(); startTimers(); });
      });
      document.getElementById('multiplayerBtn').addEventListener('click', () => {
        openMultiplayerMenu();
      });
      attachOverflowMenu();
      break;

    case 'mp-lobby':
      app.innerHTML = renderLobby();
      attachLobbyListeners();
      attachOverflowMenu();
      break;

    case 'quiz':
    case 'selected':
      app.innerHTML = renderQuiz();
      if (state.phase === 'quiz') {
        document.querySelectorAll('.option-btn').forEach(btn => {
          btn.addEventListener('click', () => handleAnswer(btn.dataset.value));
        });
      }
      attachOverflowMenu();
      break;

    case 'result':
      app.innerHTML = renderResult();
      document.getElementById('retryBtn').addEventListener('click', () => {
        transitionOut(() => { state.phase = 'start'; render(); });
      });
      document.querySelector('.result-list').addEventListener('click', e => {
        const item = e.target.closest('.result-item');
        if (item) toggleDetail(item.id.replace('item-', ''));
      });
      attachOverflowMenu();
      break;

    case 'error':
      app.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center">
          <p style="color:var(--text-muted);font-size:15px;line-height:1.5">
            Kunde inte ladda ord.<br/>Kontrollera din anslutning.
          </p>
        </div>`;
      break;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  render();

  onAuthChange(async user => {
    state.user = user;
    if (user) {
      await onUserLogin(user);
    } else {
      state.wordStats = {};
    }
    // Re-render to update menu (login/logout) only if no overlay is open
    if (!document.getElementById('loginOverlay') && !document.getElementById('settingsOverlay')) {
      render();
    }
  });

  try {
    await loadWords();
    state.phase = 'start';
  } catch {
    state.phase = 'error';
  }
  render();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

init();
