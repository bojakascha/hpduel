import { state, settings } from './game.js';

function capitalizeFirst(str) {
  if (str == null || str === '') return str ?? '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function menuHtml() {
  const loggedIn = Boolean(state.user);
  return `
    <div class="screen-header">
      <button class="overflow-menu-btn" id="overflowMenuBtn" type="button" aria-label="Mer">&#8230;</button>
      <div class="overflow-menu" id="overflowMenu">
        <button class="overflow-menu-item" data-action="restart">Starta om</button>
        <button class="overflow-menu-item" data-action="settings">Inställningar</button>
        <button class="overflow-menu-item" data-action="${loggedIn ? 'logout' : 'login'}">${loggedIn ? 'Logga ut' : 'Logga in'}</button>
      </div>
    </div>
  `;
}

export function renderStart() {
  return `
    <div class="screen start-screen">
      ${menuHtml()}
      <div class="start-content">
        <div class="start-buttons">
          <button class="start-btn" id="startBtn">Starta</button>
          <button class="start-btn-secondary" id="multiplayerBtn">Multiplayer</button>
        </div>
      </div>
    </div>
  `;
}

export function renderQuiz() {
  const q = state.questions[state.current];
  const options = state.currentOptions;
  const isSelected = state.phase === 'selected';
  const progress = ((state.current + (isSelected ? 1 : 0)) / state.questions.length) * 100;

  const showFeedback = isSelected && settings.showInstantFeedback;
  const lastResult = showFeedback ? state.results[state.results.length - 1] : null;

  const optionsHtml = options.map(opt => {
    let cls = 'option-btn';
    if (showFeedback) {
      if (opt === q.correct)               cls += ' correct';
      else if (opt === state.chosenOption)  cls += ' wrong';
      else                                  cls += ' dimmed';
    } else if (isSelected && opt === state.chosenOption) {
      cls += ' selected';
    }
    const escaped = opt.replace(/"/g, '&quot;');
    return `<button class="${cls}" data-value="${escaped}" ${isSelected ? 'disabled' : ''}>${capitalizeFirst(opt)}</button>`;
  }).join('');

  const opponentHtml = (() => {
    if (!state.room || !state.user) return '';
    const opUid = Object.keys(state.room.players).find(id => id !== state.user.uid);
    if (!opUid) return '';
    const op = state.room.players[opUid];
    const total = state.questions.length;
    return `<div class="opponent-bar">
      <span class="opponent-name">${op.name}</span>
      <span class="opponent-progress">${op.current}/${total} &middot; ${op.score} rätt</span>
    </div>`;
  })();

  return `
    <div class="screen quiz-screen">
      ${menuHtml()}
      ${opponentHtml}
      <div class="quiz-content${!isSelected ? ' entering' : ''}${state.room ? ' has-opponent' : ''}">
        <div class="word-block">
          <div class="word-text">${capitalizeFirst(q.word)}</div>
          <div class="word-underline"></div>
        </div>
        ${settings.timePerWord > 0 ? '<div class="word-timer-bar"><div class="word-timer-fill" id="wordTimerFill"></div></div>' : ''}
        <div class="options-list">${optionsHtml}</div>
        <div class="quiz-spacer"></div>
        <div class="quiz-progress">
          ${settings.timeLimit > 0 ? '<div class="total-timer" id="totalTimer"></div>' : ''}
          <span class="progress-label">Fråga ${state.current + 1} av ${state.questions.length}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderResult() {
  const total = state.results.length;
  const score = state.score;
  const pct = Math.round((score / total) * 100);

  let message;
  if (pct >= 90)      message = 'Fantastiskt!';
  else if (pct >= 70) message = 'Bra jobbat!';
  else if (pct >= 50) message = 'Helt okej – fortsätt träna!';
  else                message = 'Fortsätt öva – du når dit!';

  const itemsHtml = state.results.map(r => {
    const info = r.isCorrect
      ? ''
      : `<div class="result-your-answer">Ditt svar: ${capitalizeFirst(r.chosen)}</div>
         <div class="result-correct-answer">Rätt: ${capitalizeFirst(r.correct)}</div>`;
    return `
      <div class="result-item ${r.isCorrect ? 'item-correct' : 'item-wrong'}" id="item-${r.id}">
        <div class="result-item-header">
          <div class="result-status">${r.isCorrect ? '&#10003;' : '&#10007;'}</div>
          <div class="result-word-info">
            <div class="result-word">${capitalizeFirst(r.word)}</div>
            ${info}
          </div>
          <span class="result-chevron">&#8250;</span>
        </div>
        <div class="result-detail" id="detail-${r.id}">
          <div class="result-detail-inner">
            <div class="detail-content">
              <div class="detail-label">Förklaring</div>
              <div class="detail-explanation">${r.explanation}</div>
              <div class="detail-label">Exempel</div>
              <div class="detail-example">${r.example}</div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  const mpComparisonHtml = (() => {
    if (!state.room || !state.user) return '';
    const myUid = state.user.uid;
    const opUid = Object.keys(state.room.players).find(id => id !== myUid);
    if (!opUid) return '';
    const me = state.room.players[myUid];
    const op = state.room.players[opUid];
    const myWin = me.score > op.score;
    const tie = me.score === op.score;
    const opFinished = op.finished;
    return `<div class="mp-comparison">
      <div class="mp-player ${myWin ? 'mp-winner' : ''}">
        <div class="mp-player-name">Du</div>
        <div class="mp-player-score">${me.score}</div>
      </div>
      <div class="mp-vs">${tie && opFinished ? 'Lika!' : 'vs'}</div>
      <div class="mp-player ${!myWin && !tie && opFinished ? 'mp-winner' : ''}">
        <div class="mp-player-name">${op.name}</div>
        <div class="mp-player-score">${opFinished ? op.score : '...'}</div>
      </div>
    </div>`;
  })();

  return `
    <div class="screen result-screen">
      ${menuHtml()}
      <div class="result-header">
        ${mpComparisonHtml}
        <div class="result-score">${score}<span>/${total}</span></div>
        <div class="result-message">${message}</div>
        <div class="result-underline"></div>
      </div>
      <div class="result-list">
        <div class="result-list-title">Dina svar</div>
        ${itemsHtml}
      </div>
      <div class="result-footer">
        <button class="btn-primary" id="retryBtn">Spela igen</button>
      </div>
    </div>
  `;
}

function segmented(name, options, activeValue) {
  const btns = options.map(([value, label]) =>
    `<button class="setting-option${String(activeValue) === String(value) ? ' active' : ''}" data-setting="${name}" data-value="${value}">${label}</button>`
  ).join('');
  return `<div class="setting-options">${btns}</div>`;
}

const backArrow = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const googleIcon = `<svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>`;

export function renderSettings() {
  return `
    <div class="settings-screen">
      <div class="settings-header">
        <button class="settings-back" id="settingsBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">Inställningar</span>
      </div>
      <div class="settings-body">
        <div class="setting-group">
          <div class="setting-label">Svårighetsgrad</div>
          ${segmented('difficulty', [['all', 'Alla'], ['easy', 'Lätt'], ['medium', 'Medel'], ['hard', 'Svår']], settings.difficulty)}
        </div>
        <div class="setting-group">
          <div class="setting-label">Antal frågor</div>
          ${segmented('questionCount', [['10', '10'], ['20', '20'], ['30', '30'], ['0', 'Alla']], settings.questionCount)}
        </div>
        <div class="setting-group">
          <div class="setting-label">Tidsbegränsning</div>
          ${segmented('timeLimit', [['0', 'Av'], ['30', '30s'], ['60', '1min'], ['120', '2min'], ['180', '3min']], settings.timeLimit)}
        </div>
        <div class="setting-group">
          <div class="setting-label">Tid per ord</div>
          ${segmented('timePerWord', [['0', 'Av'], ['5', '5s'], ['10', '10s'], ['15', '15s']], settings.timePerWord)}
        </div>
        <div class="setting-group">
          <label class="setting-toggle">
            <span class="setting-toggle-label">Visa rätt svar direkt</span>
            <input type="checkbox" id="instantFeedbackToggle" ${settings.showInstantFeedback ? 'checked' : ''} />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>
      </div>
    </div>
  `;
}

export function renderMultiplayerMenu() {
  return `
    <div class="settings-screen">
      <div class="settings-header">
        <button class="settings-back" id="mpMenuBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">Multiplayer</span>
      </div>
      <div class="mp-menu-body">
        <button class="mp-menu-option" id="mpCreateBtn">
          <div class="mp-menu-option-title">Skapa spel</div>
          <div class="mp-menu-option-desc">Bjud in en vän med en spelkod</div>
        </button>
        <button class="mp-menu-option" id="mpJoinBtn">
          <div class="mp-menu-option-title">Gå med i spel</div>
          <div class="mp-menu-option-desc">Ange en spelkod från en vän</div>
        </button>
        <div class="mp-join-form" id="mpJoinForm" style="display:none">
          <input class="login-input" type="text" id="mpCodeInput" placeholder="Ange spelkod" maxlength="5" autocomplete="off" autocapitalize="characters" />
          <div class="login-error" id="mpJoinError"></div>
          <button class="btn-primary" id="mpJoinSubmitBtn" type="button">Gå med</button>
        </div>
      </div>
    </div>
  `;
}

export function renderLobby() {
  const room = state.room;
  if (!room) return '<div class="screen"></div>';

  const isHost = room.hostUid === state.user?.uid;
  const players = Object.entries(room.players || {});
  const playerCount = players.length;

  const playersHtml = players.map(([, p]) =>
    `<div class="lobby-player">
      <div class="lobby-player-avatar">${(p.name || 'S')[0].toUpperCase()}</div>
      <div class="lobby-player-name">${p.name || 'Spelare'}</div>
    </div>`
  ).join('');

  return `
    <div class="screen lobby-screen">
      ${menuHtml()}
      <div class="lobby-content">
        <div class="lobby-code-section">
          <div class="lobby-label">Spelkod</div>
          <div class="lobby-code" id="lobbyCode">${room.code}</div>
          <div class="lobby-hint">Dela koden med din vän</div>
        </div>
        <div class="lobby-players-section">
          <div class="lobby-label">Spelare (${playerCount}/2)</div>
          <div class="lobby-players">${playersHtml}</div>
        </div>
        ${isHost && playerCount >= 2
          ? '<button class="btn-primary lobby-start-btn" id="lobbyStartBtn">Starta spel</button>'
          : `<div class="lobby-waiting">${isHost ? 'Väntar på motståndare...' : 'Väntar på att värden startar...'}</div>`
        }
        <button class="lobby-leave-btn" id="lobbyLeaveBtn">Lämna</button>
      </div>
    </div>
  `;
}

export function renderLogin(mode = 'login') {
  const isRegister = mode === 'register';
  return `
    <div class="login-screen">
      <div class="settings-header">
        <button class="settings-back" id="loginBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">${isRegister ? 'Skapa konto' : 'Logga in'}</span>
      </div>
      <div class="login-body">
        <form class="login-form" id="loginForm" novalidate>
          ${isRegister ? `
          <div class="login-field">
            <label class="login-label" for="nameInput">Namn</label>
            <input class="login-input" type="text" id="nameInput" autocomplete="name" placeholder="Ditt namn" />
          </div>` : ''}
          <div class="login-field">
            <label class="login-label" for="emailInput">E-post</label>
            <input class="login-input" type="email" id="emailInput" autocomplete="email" placeholder="din@epost.se" required />
          </div>
          <div class="login-field">
            <label class="login-label" for="passwordInput">Lösenord</label>
            <input class="login-input" type="password" id="passwordInput" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="${isRegister ? 'Minst 6 tecken' : 'Lösenord'}" required />
          </div>
          <div class="login-error" id="loginError"></div>
          <button class="btn-primary login-submit" id="loginSubmitBtn" type="submit">
            ${isRegister ? 'Skapa konto' : 'Logga in'}
          </button>
        </form>
        <div class="login-divider"><span>eller</span></div>
        <button class="login-google" id="googleLoginBtn" type="button">
          ${googleIcon}
          <span>Logga in med Google</span>
        </button>
        <div class="login-toggle">
          <button class="login-toggle-btn" id="loginToggleBtn" type="button">
            ${isRegister
              ? 'Har du redan ett konto? <strong>Logga in</strong>'
              : 'Inget konto? <strong>Skapa konto</strong>'}
          </button>
        </div>
      </div>
    </div>
  `;
}
