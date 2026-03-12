import { state, settings } from './game.js';

function capitalizeFirst(str) {
  if (str == null || str === '') return str ?? '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const exitIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function gameHeaderHtml() {
  return `
    <div class="screen-header">
      <button class="game-exit-btn" id="gameExitBtn" type="button" aria-label="Avsluta">${exitIcon}</button>
    </div>
  `;
}

const personIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;

const gearIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

export function renderStart() {
  return `
    <div class="screen start-screen">
      <div class="start-header">
        <button class="start-icon-btn" id="profileBtn" type="button" aria-label="Profil">${personIcon}</button>
        <button class="start-icon-btn" id="startSettingsBtn" type="button" aria-label="Inställningar">${gearIcon}</button>
      </div>
      <div class="start-content">
        <div class="word-block">
          <div class="word-text">HP-Duel</div>
          <div class="word-underline"></div>
        </div>
        <div class="start-buttons">
          <button class="start-btn" id="startBtn">Starta</button>
          <button class="start-btn-secondary" id="multiplayerBtn">Mot vän</button>
          <button class="start-btn-secondary" id="matchmakingBtn">Online</button>
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

  return `
    <div class="screen quiz-screen">
      ${gameHeaderHtml()}
      <div class="quiz-content${!isSelected ? ' entering' : ''}" id="quizContent">
        <div class="word-block">
          <div class="word-text">${capitalizeFirst(q.word)}</div>
          ${settings.timePerWord === 0 ? '<div class="word-underline"></div>' : ''}
        </div>
        ${settings.timePerWord > 0 ? '<div class="word-timer-bar"><div class="word-timer-fill" id="wordTimerFill"></div></div>' : ''}
        <div class="options-list">${optionsHtml}</div>
        <div class="quiz-spacer"></div>
      </div>
      <div class="quiz-progress progress-wrap" id="quizProgress">
        ${settings.timeLimit > 0 ? '<div class="total-timer" id="totalTimer"></div>' : ''}
        <div class="progress-label">Fråga ${state.current + 1} av ${state.questions.length}</div>
        <div class="progress-track">
          <div class="progress-fill" id="progressFill" style="width:${progress}%"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderQuizContent() {
  const q = state.questions[state.current];
  const options = state.currentOptions;
  const progress = (state.current / state.questions.length) * 100;

  const optionsHtml = options.map(opt => {
    const escaped = opt.replace(/"/g, '&quot;');
    return `<button class="option-btn" data-value="${escaped}">${capitalizeFirst(opt)}</button>`;
  }).join('');

  return {
    content: `
      <div class="word-block">
        <div class="word-text">${capitalizeFirst(q.word)}</div>
        ${settings.timePerWord === 0 ? '<div class="word-underline"></div>' : ''}
      </div>
      ${settings.timePerWord > 0 ? '<div class="word-timer-bar"><div class="word-timer-fill" id="wordTimerFill"></div></div>' : ''}
      <div class="options-list">${optionsHtml}</div>
      <div class="quiz-spacer"></div>
    `,
    progressLabel: `Fråga ${state.current + 1} av ${state.questions.length}`,
    progressWidth: progress,
  };
}

export function renderResult() {
  const total = state.results.length;
  const score = state.score;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isMultiplayer = Boolean(state.room && state.user);

  const summaryHtml = state.results
    .map(r => `<span class="result-summary-dot ${r.isCorrect ? 'correct' : 'wrong'}">${r.isCorrect ? '●' : '○'}</span>`)
    .join('');

  const itemsHtml = state.results.map((r, i) => {
    const info = r.isCorrect
      ? `<div class="result-your-answer correct">Ditt svar: ${capitalizeFirst(r.chosen)}</div>`
      : `<div class="result-your-answer">Ditt svar: ${capitalizeFirst(r.chosen)}</div>
         <div class="result-correct-answer">Rätt: ${capitalizeFirst(r.correct)}</div>`;
    return `
      <div class="result-item ${r.isCorrect ? 'item-correct' : 'item-wrong'}" id="item-${i}" data-index="${i}">
        <div class="result-item-header">
          <div class="result-status">${r.isCorrect ? '&#10003;' : '&#10007;'}</div>
          <div class="result-word-info">
            <div class="result-word">${capitalizeFirst(r.word)}</div>
            ${info}
          </div>
          <span class="result-chevron">&#8250;</span>
        </div>
        <div class="result-detail" id="detail-${i}">
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

  let headerInner;

  if (isMultiplayer) {
    const myUid = state.user.uid;
    const allPlayers = Object.entries(state.room.players)
      .map(([uid, p]) => ({
        ...p,
        uid,
        isMe: uid === myUid,
        score: uid === myUid ? score : p.score,  // local state is ground truth for current player
        finished: uid === myUid ? true : p.finished,
      }))
      .sort((a, b) => b.score - a.score);
    const myRank = allPlayers.filter(p => !p.isMe && p.score > score).length + 1;
    const placementLabel = myRank === 1 ? '1:a plats' : myRank === 2 ? '2:a plats' : `${myRank}:e plats`;
    const placementClass = myRank === 1 ? 'plats-1' : myRank === 2 ? 'plats-2' : 'plats-other';

    const lbHtml = allPlayers.map((p, i) => `
      <div class="mp-lb-row${p.isMe ? ' mp-lb-me' : ''}">
        <span class="mp-lb-rank">${i + 1}.</span>
        <span class="mp-lb-name">${p.isMe ? 'Du' : p.name}</span>
        <span class="mp-lb-score">${p.finished ? p.score : '…'}</span>
      </div>`).join('');

    headerInner = `
      <span class="result-chip ${placementClass}">${placementLabel}</span>
      <div class="mp-leaderboard">${lbHtml}</div>`;
  } else {
    let chipLabel, chipClass;
    if (pct === 100)    { chipLabel = 'Perfekt';  chipClass = 'perfekt'; }
    else if (pct >= 85) { chipLabel = 'Utmärkt';  chipClass = 'utmarkt'; }
    else if (pct >= 70) { chipLabel = 'Bra';       chipClass = 'bra'; }
    else if (pct >= 50) { chipLabel = 'Okej';      chipClass = 'okej'; }
    else                { chipLabel = 'Svagt';     chipClass = 'svagt'; }

    const elapsed = state.quizEndTime && state.quizStartTime ? Math.round((state.quizEndTime - state.quizStartTime) / 1000) : 0;
    const timeStr = settings.timeLimit > 0 && elapsed > 0 ? ` · ${elapsed}s` : '';

    headerInner = `
      <span class="result-chip ${chipClass}">${chipLabel}</span>
      <div class="result-score">${score}<span>/${total}${timeStr}</span></div>`;
  }

  return `
    <div class="screen result-screen">
      ${gameHeaderHtml()}
      <div class="result-header">
        ${headerInner}
        <div class="result-underline"></div>
      </div>
      <div class="result-list">
        <div class="result-summary" aria-hidden="true">${summaryHtml}</div>
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

const shareIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;

const qrIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>`;

export function renderSettings() {
  return `
    <div class="settings-screen">
      <div class="settings-header">
        <button class="settings-back" id="settingsBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">Inställningar</span>
      </div>
      <div class="settings-body">
        <div class="setting-group">
          <div class="setting-label">Nivå</div>
          ${segmented('difficulty', [['all', 'Blandad'], ['easy', 'Lätt'], ['medium', 'Medel'], ['hard', 'Svår']], settings.difficulty)}
        </div>
        <div class="setting-group">
          <div class="setting-label">Antal frågor</div>
          ${segmented('questionCount', [['5', '5'], ['10', '10'], ['20', '20'], ['30', '30']], settings.questionCount)}
        </div>
        <div class="setting-group">
          <div class="setting-label">Tidsbegränsning</div>
          ${segmented('timeLimit', [['0', 'Av'], ['30', '30s'], ['60', '1min'], ['120', '2min']], settings.timeLimit)}
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

export function renderMultiplayerMenu(joinOnly = false) {
  return `
    <div class="settings-screen">
      <div class="settings-header">
        <button class="settings-back" id="mpMenuBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">${joinOnly ? 'Gå med i spel' : 'Duel'}</span>
      </div>
      <div class="mp-menu-body">
        <div class="mp-name-field" id="mpNameField">
          <div class="setting-label">Ditt namn</div>
          <input class="login-input" type="text" id="mpNameInput" placeholder="Ange ditt namn" maxlength="20" autocomplete="off" required value="${state.user?.displayName || ''}" />
        </div>
        ${joinOnly ? '' : `
        <button class="mp-menu-option" id="mpCreateBtn">
          <div class="mp-menu-option-title">Skapa spel</div>
          <div class="mp-menu-option-desc">Bjud in en vän med en spelkod</div>
        </button>
        <button class="mp-menu-option" id="mpJoinBtn">
          <div class="mp-menu-option-title">Gå med i spel</div>
          <div class="mp-menu-option-desc">Ange en spelkod från en vän</div>
        </button>`}
        <div class="mp-join-form" id="mpJoinForm" style="${joinOnly ? '' : 'display:none'}">
          ${joinOnly ? '' : `<input class="login-input" type="text" id="mpCodeInput" placeholder="Ange spelkod" maxlength="5" autocomplete="off" autocapitalize="characters" />`}
          <div class="login-error" id="mpJoinError"></div>
          <button class="btn-primary" id="mpJoinSubmitBtn" type="button">Gå med</button>
        </div>
      </div>
    </div>
  `;
}

function lobbySegmented(name, options, activeValue, editable) {
  const btns = options.map(([value, label]) =>
    `<button class="setting-option${String(activeValue) === String(value) ? ' active' : ''}" data-setting="${name}" data-value="${value}" ${editable ? '' : 'disabled'}>${label}</button>`
  ).join('');
  return `<div class="setting-options${editable ? '' : ' disabled'}">${btns}</div>`;
}

export function renderLobby() {
  const room = state.room;
  if (!room) return '<div class="screen"></div>';

  const isHost = room.hostUid === state.user?.uid;
  const players = Object.entries(room.players || {});
  const playerCount = players.length;
  const rs = room.settings || {};

  const MAX_VISIBLE = 4;
  const visiblePlayers = players.slice(0, MAX_VISIBLE);
  const overflowPlayers = players.slice(MAX_VISIBLE);

  const playerCard = ([, p]) =>
    `<div class="lobby-player">
      <div class="lobby-player-avatar">${(p.name || 'S')[0].toUpperCase()}</div>
      <div class="lobby-player-name">${p.name || 'Spelare'}</div>
    </div>`;

  const visibleHtml = visiblePlayers.map(playerCard).join('');
  const overflowHtml = overflowPlayers.length > 0
    ? `<details class="lobby-players-overflow">
        <summary class="lobby-players-more">+${overflowPlayers.length} till</summary>
        <div class="lobby-players lobby-players-extra">${overflowPlayers.map(playerCard).join('')}</div>
      </details>`
    : '';

  const chevron = `<svg class="lobby-settings-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const difficultyLabel = { all: 'Blandad', easy: 'Lätt', medium: 'Medel', hard: 'Svår' }[rs.difficulty] ?? 'Blandad';
  const timeLimitLabel = rs.timeLimit > 0 ? (rs.timeLimit >= 60 ? `${rs.timeLimit / 60}min` : `${rs.timeLimit}s`) : null;
  const timePerWordLabel = rs.timePerWord > 0 ? `${rs.timePerWord}s/ord` : null;
  const settingsSummary = [
    difficultyLabel,
    `${rs.questionCount ?? 10} frågor`,
    timeLimitLabel,
    timePerWordLabel,
    rs.showInstantFeedback ? 'Visa svar' : null,
  ].filter(Boolean).join(' · ');

  const isMatchmaking = room.mode === 'matchmaking';

  if (isMatchmaking) {
    return `
      <div class="screen lobby-screen">
        ${gameHeaderHtml()}
        <div class="lobby-content">
          <div class="lobby-players-section">
            <div class="lobby-players">${visibleHtml}</div>
          </div>
          <div class="lobby-actions">
            ${playerCount >= 2
              ? '<div class="lobby-waiting">Startar...</div>'
              : '<div class="lobby-waiting">Söker motståndare...</div>'
            }
            <button class="lobby-leave-btn" id="lobbyLeaveBtn">Avbryt</button>
          </div>
          <div class="lobby-settings-summary">${settingsSummary}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="screen lobby-screen">
      ${gameHeaderHtml()}
      <div class="lobby-content">
        <div class="lobby-code-section">
          <div class="lobby-label">Spelkod</div>
          <div class="lobby-code" id="lobbyCode">${room.code}</div>
          <div class="lobby-code-actions">
            <button type="button" class="lobby-share-btn" id="lobbyShareBtn" aria-label="Dela spelkod">
              <span class="lobby-share-icon">${shareIcon}</span>
              Dela
            </button>
            <button type="button" class="lobby-qr-btn" id="lobbyQrBtn" aria-label="Visa QR-kod">
              <span class="lobby-qr-icon">${qrIcon}</span>
            </button>
          </div>
        </div>
        <div class="lobby-players-section">
          <div class="lobby-label">Spelare <span class="lobby-player-count">${playerCount}</span></div>
          <div class="lobby-players">${visibleHtml}</div>
          ${overflowHtml}
        </div>
        <div class="lobby-actions">
          ${isHost && playerCount >= 2
            ? '<button class="btn-primary lobby-start-btn" id="lobbyStartBtn">Starta</button>'
            : `<div class="lobby-waiting">${isHost ? 'Väntar på spelare...' : 'Väntar på att värden startar...'}</div>`
          }
          <button class="lobby-leave-btn" id="lobbyLeaveBtn">Lämna</button>
        </div>
        ${isHost ? `
        <details class="lobby-settings-wrap">
          <summary class="lobby-settings-toggle">
            <div class="lobby-settings-toggle-text">
              <span class="lobby-settings-toggle-title">Inställningar</span>
              <span class="lobby-settings-toggle-sub">${settingsSummary}</span>
            </div>
            ${chevron}
          </summary>
          <div class="lobby-settings" id="lobbySettings">
            <div class="setting-group">
              <div class="setting-label">Nivå</div>
              ${lobbySegmented('difficulty', [['all', 'Blandad'], ['easy', 'Lätt'], ['medium', 'Medel'], ['hard', 'Svår']], rs.difficulty, true)}
            </div>
            <div class="setting-group">
              <div class="setting-label">Antal frågor</div>
              ${lobbySegmented('questionCount', [['5', '5'], ['10', '10'], ['20', '20'], ['30', '30']], rs.questionCount, true)}
            </div>
            <div class="setting-group">
              <div class="setting-label">Tidsbegränsning</div>
              ${lobbySegmented('timeLimit', [['0', 'Av'], ['30', '30s'], ['60', '1min'], ['120', '2min']], rs.timeLimit, true)}
            </div>
            <div class="setting-group">
              <div class="setting-label">Tid per ord</div>
              ${lobbySegmented('timePerWord', [['0', 'Av'], ['5', '5s'], ['10', '10s'], ['15', '15s']], rs.timePerWord, true)}
            </div>
            <div class="setting-group">
              <label class="setting-toggle">
                <span class="setting-toggle-label">Visa rätt svar direkt</span>
                <input type="checkbox" id="lobbyInstantFeedbackToggle" ${rs.showInstantFeedback ? 'checked' : ''} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>
          </div>
        </details>` : `
        <div class="lobby-settings-summary">${settingsSummary}</div>`}
      </div>
    </div>
  `;
}

export function renderProfile() {
  const user = state.user;
  const name = user?.displayName || '';
  const isManaged = user && !user.isAnonymous;
  const email = user?.email || '';

  const accountSection = isManaged
    ? `<div class="profile-section">
        <div class="setting-label">Konto</div>
        <div class="profile-account-info">Inloggad som <strong>${email}</strong></div>
        <button class="profile-link-btn" id="profileLogoutBtn" type="button">Logga ut</button>
      </div>`
    : `<div class="profile-section">
        <div class="setting-label">Konto</div>
        <p class="profile-account-hint">Logga in för att synka mellan enheter</p>
        <button class="login-google" id="profileGoogleBtn" type="button">
          ${googleIcon}
          <span>Koppla Google-konto</span>
        </button>
        <details class="profile-email-details">
          <summary class="profile-email-toggle">Eller koppla med e-post</summary>
          <form class="login-form profile-email-form" id="profileEmailForm" novalidate>
            <div class="login-field">
              <input class="login-input" type="email" id="profileEmailInput" autocomplete="email" placeholder="din@epost.se" required />
            </div>
            <div class="login-field">
              <input class="login-input" type="password" id="profilePasswordInput" autocomplete="new-password" placeholder="Lösenord (minst 6 tecken)" required />
            </div>
            <div class="login-error" id="profileLinkError"></div>
            <button class="btn-primary login-submit" id="profileEmailSubmitBtn" type="submit">Koppla konto</button>
          </form>
        </details>
      </div>`;

  return `
    <div class="settings-screen">
      <div class="settings-header">
        <button class="settings-back" id="profileBackBtn" type="button" aria-label="Tillbaka">${backArrow}</button>
        <span class="settings-title">Profil</span>
      </div>
      <div class="settings-body">
        <div class="profile-section">
          <div class="setting-label">Namn</div>
          <div class="profile-name-row">
            <input class="login-input" type="text" id="profileNameInput" value="${name}" maxlength="20" autocomplete="off" placeholder="Ditt namn" />
            <button class="profile-save-btn" id="profileSaveNameBtn" type="button" style="display:none">Spara</button>
          </div>
        </div>

        ${accountSection}

        <details class="profile-collapsible" id="profileFriendsSection">
          <summary class="profile-collapsible-title">Vänner</summary>
          <div class="profile-friends-content" id="profileFriendsContent">
            <div class="profile-loading">Laddar...</div>
          </div>
        </details>

        <details class="profile-collapsible" id="profileHistorySection">
          <summary class="profile-collapsible-title">Historik</summary>
          <div class="profile-history-content" id="profileHistoryContent">
            <div class="profile-loading">Laddar...</div>
          </div>
        </details>

        <details class="profile-collapsible" id="profileWorstSection">
          <summary class="profile-collapsible-title">Missade ord</summary>
          <div id="profileWorstContent">${renderWorstWords()}</div>
        </details>

        <div class="profile-section profile-danger">
          <button class="profile-danger-btn" id="profileDeleteBtn" type="button">Radera mitt konto och data</button>
        </div>
      </div>
    </div>
  `;
}

export function renderFriendsSection(friends, pendingInvites) {
  let html = '';

  // Search / add friend
  html += `
    <div class="friends-search">
      <div class="friends-search-row">
        <input class="login-input friends-search-input" type="text" id="friendSearchInput" placeholder="Sök spelare..." maxlength="20" autocomplete="off" />
        <button class="profile-save-btn" id="friendSearchBtn" type="button">Sök</button>
      </div>
      <div class="friends-search-results" id="friendSearchResults"></div>
    </div>`;

  // Pending invites
  if (pendingInvites.length > 0) {
    html += `<div class="friends-group-label">Förfrågningar</div>`;
    for (const inv of pendingInvites) {
      html += `
        <div class="friend-row friend-invite">
          <div class="friend-avatar">${(inv.fromName || 'S')[0].toUpperCase()}</div>
          <div class="friend-name">${inv.fromName || 'Spelare'}</div>
          <button class="friend-action-btn friend-accept" data-id="${inv.id}" type="button">Acceptera</button>
          <button class="friend-action-btn friend-ignore" data-id="${inv.id}" type="button">Ignorera</button>
        </div>`;
    }
  }

  // Friends list
  if (friends.length > 0) {
    html += `<div class="friends-group-label">Vänner</div>`;
    for (const f of friends) {
      html += `
        <div class="friend-row">
          <div class="friend-avatar">${(f.name || 'S')[0].toUpperCase()}</div>
          <div class="friend-name">${f.name || 'Spelare'}</div>
          <button class="friend-action-btn friend-remove" data-id="${f.id}" type="button">Ta bort</button>
        </div>`;
    }
  } else if (pendingInvites.length === 0) {
    html += '<div class="profile-empty">Inga vänner än. Sök efter spelare ovan!</div>';
  }

  return html;
}

export function renderSearchResults(results) {
  if (results.length === 0) return '<div class="profile-empty">Inga spelare hittades.</div>';
  return results.map(r => `
    <div class="friend-row">
      <div class="friend-avatar">${(r.name || 'S')[0].toUpperCase()}</div>
      <div class="friend-name">${r.name || 'Spelare'}</div>
      <button class="friend-action-btn friend-add" data-uid="${r.uid}" data-name="${(r.name || '').replace(/"/g, '&quot;')}" type="button">Lägg till</button>
    </div>`).join('');
}

export function renderHistoryItems(sessions) {
  if (sessions.length === 0) {
    return '<div class="profile-empty">Ingen historik än. Spela ett spel!</div>';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  let currentGroup = '';
  let html = '';

  for (const s of sessions) {
    const ts = s.timestamp?.toDate ? s.timestamp.toDate() : (s.timestamp ? new Date(s.timestamp) : new Date());
    const day = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());

    let groupLabel;
    if (day.getTime() === today.getTime()) groupLabel = 'Idag';
    else if (day.getTime() === yesterday.getTime()) groupLabel = 'Igår';
    else groupLabel = ts.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });

    if (groupLabel !== currentGroup) {
      currentGroup = groupLabel;
      html += `<div class="history-date-label">${groupLabel}</div>`;
    }

    const time = ts.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
    const dots = (s.answers || []).map(a =>
      `<span class="result-summary-dot ${a.isCorrect ? 'correct' : 'wrong'}">${a.isCorrect ? '●' : '○'}</span>`
    ).join('');

    const diffLabel = { all: 'Blandad', easy: 'Lätt', medium: 'Medel', hard: 'Svår' }[s.difficulty] || '';

    let cls = 'history-pct-ok';
    if (pct === 100) cls = 'history-pct-perfect';
    else if (pct >= 80) cls = 'history-pct-good';
    else if (pct < 50) cls = 'history-pct-bad';

    html += `
      <div class="history-card">
        <div class="history-card-top">
          <span class="history-score ${cls}">${s.score}/${s.total}${s.elapsedSeconds > 0 ? `<span class="history-elapsed"> · ${s.elapsedSeconds}s</span>` : ''}</span>
          <span class="history-meta">${diffLabel}${diffLabel ? ' · ' : ''}${time}</span>
        </div>
        <div class="history-dots">${dots}</div>
      </div>`;
  }
  return html;
}

function renderWorstWords() {
  const stats = state.wordStats;
  const words = Object.entries(stats)
    .map(([word, s]) => ({ word, missed: s.seen - s.correct }))
    .filter(w => w.missed > 0)
    .sort((a, b) => b.missed - a.missed);

  if (words.length === 0) return '<div class="profile-empty">Inga missade ord än.</div>';

  return `<div class="worst-words-list">${words.map(w => `
    <div class="worst-word-card">
      <span class="worst-word-name">${capitalizeFirst(w.word)}</span>
      <span class="worst-word-count">${w.missed}×</span>
    </div>`).join('')}</div>`;
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
