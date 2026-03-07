import './style.css';
import { state, settings, loadWords, initQuiz, selectQuestions, initQuizWithQuestions, updateSetting, recordAnswer, recordTimeout, advanceQuestion, toggleDetail } from './game.js';
import { renderStart, renderQuiz, renderResult, renderSettings, renderLogin, renderMultiplayerMenu, renderLobby } from './render.js';
import { loginWithEmail, registerWithEmail, loginWithGoogle, logout, onAuthChange } from './auth.js';
import { ensureUser, saveSession, loadWordStats, saveUserSettings, loadUserSettings } from './db.js';
import { createRoom, joinRoom, listenRoom, startRoom, updatePlayerProgress, markPlayerFinished } from './room.js';

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

function openMultiplayerMenu() {
  if (!state.user) {
    openLogin();
    return;
  }

  const overlay = openOverlay('mpMenuOverlay', renderMultiplayerMenu());
  overlay.querySelector('#mpMenuBackBtn').addEventListener('click', () => closeOverlay('mpMenuOverlay'));

  overlay.querySelector('#mpCreateBtn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#mpCreateBtn');
    btn.disabled = true;
    try {
      const questions = selectQuestions();
      const { id, code } = await createRoom(state.user.uid, getUserName(), settings, questions);
      state.roomId = id;
      closeOverlay('mpMenuOverlay');
      startRoomListener(id);
      state.phase = 'mp-lobby';
      render();
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
    const input = overlay.querySelector('#mpCodeInput');
    const errorEl = overlay.querySelector('#mpJoinError');
    const code = input.value.trim();
    if (!code) { errorEl.textContent = 'Ange en spelkod.'; return; }

    const btn = overlay.querySelector('#mpJoinSubmitBtn');
    btn.disabled = true;
    errorEl.textContent = '';
    try {
      const { id } = await joinRoom(code, state.user.uid, getUserName());
      state.roomId = id;
      closeOverlay('mpMenuOverlay');
      startRoomListener(id);
      state.phase = 'mp-lobby';
      render();
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

    // Room started — transition to quiz
    if (prevStatus === 'waiting' && room.status === 'playing') {
      // Apply room timer settings for this game
      settings.timeLimit = room.settings.timeLimit ?? 0;
      settings.timePerWord = room.settings.timePerWord ?? 0;
      initQuizWithQuestions(room.questions);
      render();
      startTimers();
      return;
    }

    // Update opponent progress on result screen or during quiz
    if (room.status === 'playing' || room.status === 'finished') {
      // Re-render opponent bar / result comparison
      const opBar = document.querySelector('.opponent-bar');
      if (opBar && state.user) {
        const opUid = Object.keys(room.players).find(id => id !== state.user.uid);
        if (opUid) {
          const op = room.players[opUid];
          const total = state.questions.length;
          opBar.querySelector('.opponent-progress').textContent = `${op.current}/${total} \u00b7 ${op.score} rätt`;
        }
      }
      // Update comparison on result screen
      const comparison = document.querySelector('.mp-comparison');
      if (comparison && state.phase === 'result') {
        render();
      }
      return;
    }

    // Lobby updates (new player joined)
    if (room.status === 'waiting' && state.phase === 'mp-lobby') {
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
        await startRoom(state.roomId);
      } catch {
        startBtn.disabled = false;
      }
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
