const data = window.UPL_DATA;
const eloMatchById = new Map((data.elo?.matches || []).map((row) => [row.matchId, row]));
const matchById = new Map(data.matches.map((match) => [String(match.id), match]));
const teamRosters = buildTeamRosters();
const teamNames = teamRosters.map((row) => row.key);
const defaultTeamA = teamRosters.find((row) => row.players.length >= 5)?.key || teamNames[0] || '';
const defaultTeamB = teamRosters.find((row) => row.key !== defaultTeamA && row.players.length >= 5)?.key || teamNames.find((team) => team !== defaultTeamA) || defaultTeamA;

const state = {
  tab: 'player',
  season: 'all',
  game: 'all',
  text: '',
  player: data.playerSummary[0]?.player || data.players[0],
  playerA: data.playerSummary[0]?.player || data.players[0],
  playerB: data.playerSummary[1]?.player || data.players[1],
  eloPlayer: data.elo?.leaderboard[0]?.player || data.playerSummary[0]?.player || data.players[0],
  eloGame: data.games[0] || 'all',
  gameAnalysisSort: 'elo',
  eloLeaderboardExpanded: false,
  eloGameLeaderboardExpanded: false,
  virtualA: data.elo?.leaderboard[0]?.player || data.players[0],
  virtualB: data.elo?.leaderboard[1]?.player || data.players[1],
  virtualGame: 'all',
  teamSize: 5,
  teamGame: 'all',
  teamPresetA: defaultTeamA,
  teamPresetB: defaultTeamB,
  teamAPlayers: memberSlots(rosterForTeam(defaultTeamA), 5),
  teamBPlayers: memberSlots(rosterForTeam(defaultTeamB), 5),
};

const $ = (id) => document.getElementById(id);
const pct = (wins, games) => (games ? wins / games : 0);
const fmtPct = (value) => `${(value * 100).toFixed(1)}%`;
const fmtRating = (value) => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const fmtDelta = (value) => `${value > 0 ? '+' : ''}${fmtRating(value)}`;
const shortPhase = (match) => (match.week ? `W${match.week}` : match.phase);
const logFileTypes = [
  { ext: 'txt', type: 'text' },
  { ext: 'jpg', type: 'image' },
  { ext: 'jpeg', type: 'image' },
  { ext: 'png', type: 'image' },
  { ext: 'JPG', type: 'image' },
  { ext: 'JPEG', type: 'image' },
  { ext: 'PNG', type: 'image' },
];
const logImageFileTypes = logFileTypes.filter((file) => file.type === 'image');
const maxImageLogPages = 30;
let logRequestToken = 0;

function byKorean(a, b) {
  return String(a).localeCompare(String(b), 'ko');
}

function buildTeamRosters() {
  const alias = new Map([
    ['럽데', '러데'],
    ['럽둥이', '러데'],
    ['러브데스티니', '러데'],
    ['삼디', '쌈디'],
    ['토기', '스톡'],
    ['지니', '지니어스'],
    ['KM24', '이사'],
    ['km24', '이사'],
  ]);
  const normalizePlayer = (player) => alias.get(player) || player;
  const official = [
    { season: 'S1', team: '디스', players: ['유나', '팍지', '몽솔'] },
    { season: 'S1', team: '천하갑', players: ['갑', '천하', '하이'] },
    { season: 'S1', team: '만원 개이득', players: ['러데', '스톡', '실퍼'] },
    { season: 'S1', team: '모아이의 석상 근처 둘', players: ['성규', '노비', '모아'] },
    { season: 'S1', team: '큐알 고', players: ['레이지', '데울', '지니어스', '알큐'], inactive: ['알큐'] },
    { season: 'S2', team: '서렌더', players: ['몽솔', '운동이', '노비'] },
    { season: 'S2', team: '뚝배기', players: ['수호', '유플', '하이'] },
    { season: 'S2', team: '천사신', players: ['쌈디', '동현', '집가'] },
    { season: 'S2', team: '원투펀치', players: ['레이지', '지니어스', '성환'] },
    { season: 'S2', team: '노코멘트', players: ['팍지', '뉴히', '민우'] },
    { season: 'S3', team: '래더', players: ['몽솔', '쌈디', '집가', '스톡', '한빈'] },
    { season: 'S3', team: '아카츠키', players: ['컨택', '유플', '성규', '뉴히', '혜빈', '탐드완'], inactive: ['탐드완'] },
    { season: 'S3', team: 'SIB', players: ['피구', '민우', '하이', '노비', '겨울'] },
    { season: 'S3', team: '마스터키', players: ['동현', '팍지', '수호', '깡시', '러데'] },
    { season: 'S3', team: '원투물개펀치', players: ['지니어스', '레이지', '성환', 'KM24', '소프트콘'] },
    { season: 'S4', team: '파이브스타', players: ['운명', '팍지', '집가', '무혼', '데울'] },
    { season: 'S4', team: '탑골공원', players: ['컨택', '삼디', '숭봉', '하이', '피구'] },
    { season: 'S4', team: '뉴클리어', players: ['민우', '수호', '토기', '동현', '라블'] },
    { season: 'S4', team: '스짓오브레전드', players: ['지니어스', '아이큐', '태경', '사야', '구름뒤'] },
    { season: 'S4', team: '펜타킬', players: ['유플', '혜빈', '박도현', '뉴히', '규재'] },
    { season: 'S5', team: '알비레오', players: ['유플', '겨울', '하이', '럽데', '왜조리'] },
    { season: 'S5', team: '로얄로더', players: ['컨택', '알큐', '숭봉', '로얄', '파이브'] },
    { season: 'S5', team: '레디언트', players: ['지니어스', '운명', '레이지', '운동이', '한빈'] },
    { season: 'S5', team: '벙커링', players: ['아이큐', '윈터', '러각', '물식', '성민'] },
    { season: 'S5', team: '락다운', players: ['태경', '라블', '토기', '뉴히', '포도'] },
    { season: 'S5', team: '우승할게요', players: ['쌈디', '갑', '엘제', '집가', '구름뒤'] },
    { season: 'S6', team: '엘지유플러스', players: ['유플', '러각', '레이지', '운동이', '롤탈'] },
    { season: 'S6', team: '운삼기칠', players: ['쌈디', '운명', '애용', '허강민', '테리'] },
    { season: 'S6', team: '시리우스', players: ['라블', '민우', '구름뒤', '왜조리', '포도'] },
    { season: 'S6', team: '대추야자', players: ['지니', '집가', '엘제', '롱스', '로얄'] },
    { season: 'S6', team: '크립티드', players: ['아이큐', '동현', '태경', '성민', '성동구'] },
  ];

  return official.map((row) => {
    const allPlayers = [...new Set(row.players.map(normalizePlayer))];
    const inactive = new Set((row.inactive || []).map(normalizePlayer));
    return {
      key: `${row.season} ${row.team}`,
      season: row.season,
      team: row.team,
      allPlayers,
      players: allPlayers.filter((player) => !inactive.has(player)),
      inactive: [...inactive],
    };
  });
}

function rosterForTeam(team) {
  return teamRosters.find((row) => row.key === team)?.players || [];
}

function memberSlots(players, size) {
  const slots = [...new Set(players.filter(Boolean))];
  while (slots.length < size) slots.push('');
  return slots.slice(0, size);
}

function optionList(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function padMatchId(id) {
  return String(id).padStart(4, '0');
}

function matchLogStem(match) {
  return `match_logs/${match.seasonShort}/${padMatchId(match.id)}`;
}

function matchSingleLogCandidates(match) {
  const stem = matchLogStem(match);
  return logFileTypes.map((file) => ({
    ...file,
    url: `${stem}.${file.ext}`,
  }));
}

function matchImageSequenceCandidates(match) {
  const stem = matchLogStem(match);
  return Array.from({ length: maxImageLogPages }, (_, index) => {
    const page = index + 1;
    const pageNo = String(page).padStart(2, '0');
    return logImageFileTypes.map((file) => ({
      ...file,
      page,
      url: `${stem}-${pageNo}.${file.ext}`,
    }));
  });
}

function renderMatchLogButton(match) {
  return `<button class="mini-button log-button" type="button" data-match-log="${match.id}">#${padMatchId(match.id)}</button>`;
}

function matchLogMeta(match) {
  return [
    `${match.seasonShort} ${shortPhase(match)}`,
    match.game,
    `${match.player1} vs ${match.player2}`,
    `${match.winner} 승`,
  ].filter(Boolean).join(' · ');
}

function setLogModalVisible(visible) {
  $('matchLogBackdrop').hidden = !visible;
  $('matchLogModal').hidden = !visible;
  if (document.body) document.body.classList.toggle('modal-open', visible);
}

async function fetchTextLog(candidate) {
  const response = await fetch(candidate.url, { cache: 'no-store' });
  if (!response.ok) return null;
  return {
    ...candidate,
    text: await response.text(),
  };
}

async function fetchImageLog(candidate) {
  const response = await fetch(candidate.url, { method: 'HEAD', cache: 'no-store' });
  return response.ok ? candidate : null;
}

async function findMatchLog(match) {
  const singleCandidates = matchSingleLogCandidates(match);
  const textCandidate = singleCandidates.find((candidate) => candidate.type === 'text');
  try {
    const textLog = textCandidate ? await fetchTextLog(textCandidate) : null;
    if (textLog) return textLog;
  } catch {
    // Missing log files are expected while the archive is being filled.
  }

  const imageLogs = [];
  for (const pageCandidates of matchImageSequenceCandidates(match)) {
    for (const candidate of pageCandidates) {
      try {
        const found = await fetchImageLog(candidate);
        if (found) {
          imageLogs.push(found);
          break;
        }
      } catch {
        // Missing log files are expected while the archive is being filled.
      }
    }
  }
  if (imageLogs.length) return { type: 'images', images: imageLogs };

  for (const candidate of singleCandidates.filter((item) => item.type === 'image')) {
    try {
      const found = await fetchImageLog(candidate);
      if (found) return { type: 'images', images: [found] };
    } catch {
      // Missing log files are expected while the archive is being filled.
    }
  }

  return null;
}

async function openMatchLog(match) {
  const token = ++logRequestToken;
  $('matchLogTitle').textContent = `경기 로그 #${padMatchId(match.id)}`;
  $('matchLogMeta').textContent = matchLogMeta(match);
  $('matchLogBody').innerHTML = '<div class="log-status">로그를 확인하고 있습니다.</div>';
  setLogModalVisible(true);

  const log = await findMatchLog(match);
  if (token !== logRequestToken) return;

  if (!log) {
    $('matchLogBody').innerHTML = '<div class="log-status">등록된 로그가 없습니다.</div>';
    return;
  }

  if (log.type === 'text') {
    const sourceLink = `<a class="mini-button log-source-link" href="${escapeHtml(log.url)}" target="_blank" rel="noopener">원본 열기</a>`;
    $('matchLogBody').innerHTML = `
      <div class="log-actions">${sourceLink}</div>
      <pre class="text-log">${escapeHtml(log.text)}</pre>
    `;
    return;
  }

  $('matchLogBody').innerHTML = `
    <div class="log-actions">
      ${log.images.map((image, index) => `<a class="mini-button log-source-link" href="${escapeHtml(image.url)}" target="_blank" rel="noopener">원본 ${index + 1}</a>`).join('')}
    </div>
    <div class="image-log-list">
      ${log.images.map((image, index) => `
        <figure class="image-log-card">
          <img class="image-log" src="${escapeHtml(image.url)}" alt="${escapeHtml(`경기 로그 #${padMatchId(match.id)} ${index + 1}`)}">
          <figcaption class="image-log-caption">${index + 1} / ${log.images.length}</figcaption>
        </figure>
      `).join('')}
    </div>
  `;
}

function closeMatchLog() {
  logRequestToken += 1;
  setLogModalVisible(false);
}

function adjustmentSeasonShort(adjustment) {
  return adjustment.season.replace('Season', 'S');
}

function matchesSeason(match, season = state.season) {
  return season === 'all' || match.seasonShort === season;
}

function seasonPlayers(season = state.season) {
  if (season === 'all') return data.players;
  const players = new Set();
  for (const match of data.matches) {
    if (match.seasonShort !== season) continue;
    players.add(match.player1);
    players.add(match.player2);
  }
  for (const adjustment of data.adjustments) {
    if (adjustmentSeasonShort(adjustment) === season) players.add(adjustment.player);
  }
  return data.players.filter((player) => players.has(player));
}

function seasonGames(season = state.season) {
  if (season === 'all') return data.games;
  const games = new Set(data.matches.filter((match) => match.seasonShort === season).map((match) => match.game));
  return data.games.filter((game) => games.has(game));
}

function seasonTeamNames(season = state.season) {
  const teams = season === 'all' ? teamRosters : teamRosters.filter((row) => row.season === season);
  return teams.map((row) => row.key);
}

function pickAvailable(values, current, fallback = '') {
  return values.includes(current) ? current : values[0] || fallback;
}

function pickDifferent(values, current, other) {
  if (values.includes(current) && current !== other) return current;
  return values.find((value) => value !== other) || values[0] || current || '';
}

function filterMemberSlotsForSeason(players, allowedPlayers) {
  return memberSlots(players.map((player) => (allowedPlayers.includes(player) ? player : '')), 5);
}

function ensureSeasonSelections() {
  const players = seasonPlayers();
  const games = seasonGames();
  const teams = seasonTeamNames();

  if (state.game !== 'all' && !games.includes(state.game)) state.game = 'all';
  state.eloGame = pickAvailable(games, state.eloGame, 'all');
  if (state.virtualGame !== 'all' && !games.includes(state.virtualGame)) state.virtualGame = 'all';
  if (state.teamGame !== 'all' && !games.includes(state.teamGame)) state.teamGame = 'all';

  state.player = pickAvailable(players, state.player);
  state.playerA = pickAvailable(players, state.playerA);
  state.playerB = pickDifferent(players, state.playerB, state.playerA);
  state.eloPlayer = pickAvailable(players, state.eloPlayer);
  state.virtualA = pickAvailable(players, state.virtualA);
  state.virtualB = pickDifferent(players, state.virtualB, state.virtualA);

  const previousTeamA = state.teamPresetA;
  const previousTeamB = state.teamPresetB;
  state.teamPresetA = pickAvailable(teams, state.teamPresetA);
  state.teamPresetB = pickDifferent(teams, state.teamPresetB, state.teamPresetA);
  if (state.teamPresetA !== previousTeamA) state.teamAPlayers = memberSlots(rosterForTeam(state.teamPresetA), 5);
  if (state.teamPresetB !== previousTeamB) state.teamBPlayers = memberSlots(rosterForTeam(state.teamPresetB), 5);
  state.teamAPlayers = filterMemberSlotsForSeason(state.teamAPlayers, players);
  state.teamBPlayers = filterMemberSlotsForSeason(state.teamBPlayers, players);
}

function matchesText(match) {
  if (!state.text) return true;
  const text = state.text.toLowerCase();
  return [
    match.rawLine,
    match.team1,
    match.team2,
    match.teamWinner,
    match.source,
    match.phase,
  ].some((value) => String(value || '').toLowerCase().includes(text));
}

function filteredMatches() {
  return data.matches.filter((match) => {
    if (state.season !== 'all' && match.seasonShort !== state.season) return false;
    if (state.game !== 'all' && match.game !== state.game) return false;
    return matchesText(match);
  });
}

function filteredAdjustments(player) {
  if (state.game !== 'all') return [];
  return data.adjustments.filter((adjustment) => {
    if (adjustment.player !== player) return false;
    if (state.season !== 'all' && adjustment.season.replace('Season', 'S') !== state.season) return false;
    if (state.text && !adjustment.rawLine.toLowerCase().includes(state.text.toLowerCase())) return false;
    return true;
  });
}

function playerRecord(player, matches, adjustments = []) {
  const played = matches.filter((match) => match.player1 === player || match.player2 === player);
  const detailedWins = played.filter((match) => match.winner === player).length;
  const adjustedWins = adjustments.reduce((sum, item) => sum + item.wins, 0);
  const adjustedLosses = adjustments.reduce((sum, item) => sum + item.losses, 0);
  const wins = detailedWins + adjustedWins;
  const losses = played.length - detailedWins + adjustedLosses;
  return {
    games: wins + losses,
    wins,
    losses,
    winRate: pct(wins, wins + losses),
    detailedGames: played.length,
    adjustedGames: adjustedWins + adjustedLosses,
  };
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function renderMetrics(target, metrics) {
  target.innerHTML = metrics.map((metric) => `
    <div class="metric ${metric.tone || ''}">
      <strong>${escapeHtml(metric.label)}</strong>
      <span>${escapeHtml(metric.value)}</span>
    </div>
  `).join('');
}

function renderTable(target, columns, rows, emptyText = '표시할 기록이 없습니다.') {
  if (!rows.length) {
    target.innerHTML = `<tbody><tr><td class="empty">${escapeHtml(emptyText)}</td></tr></tbody>`;
    return;
  }
  target.innerHTML = `
    <thead>
      <tr>${columns.map((column) => `<th style="width:${column.width || 'auto'}">${escapeHtml(column.label)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          ${columns.map((column) => {
            const value = column.render ? column.render(row) : escapeHtml(row[column.key]);
            const cls = column.className ? ` class="${column.className}"` : '';
            return `<td${cls}>${value}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;
}

function visibleRows(rows, expanded) {
  return expanded ? rows : rows.slice(0, 10);
}

function updateToggleButton(id, expanded, total) {
  const button = $(id);
  button.hidden = total <= 10;
  button.textContent = expanded ? '접기' : '전체 보기';
}

function opponentOf(match, player) {
  return match.player1 === player ? match.player2 : match.player1;
}

function resultClass(match, player) {
  return match.winner === player ? 'winner' : 'loss';
}

function resultText(match, player) {
  return match.winner === player ? '승' : '패';
}

function deltaClass(value) {
  if (value > 0) return 'delta-pos';
  if (value < 0) return 'delta-neg';
  return 'muted';
}

function eloRow(player) {
  return data.elo?.leaderboard.find((row) => row.player === player);
}

function currentRating(player) {
  return eloRow(player)?.rating ?? data.elo?.config?.center ?? 1000;
}

function expectedWinRate(rating, opponentRating) {
  const divisor = data.elo?.config?.divisor || 1000;
  return 1 / (1 + (10 ** ((opponentRating - rating) / divisor)));
}

function recordFromMatches(player, matches) {
  const wins = matches.filter((match) => match.winner === player).length;
  const losses = matches.length - wins;
  const margin = wins - losses;
  const marginBonus = margin * 50;
  const experienceBonus = matches.length * 5;
  return {
    games: matches.length,
    wins,
    losses,
    winRate: pct(wins, matches.length),
    margin,
    marginBonus,
    experienceBonus,
    bonus: marginBonus + experienceBonus,
  };
}

function gameRecord(player, game, season = 'all') {
  if (game === 'all') {
    return { games: 0, wins: 0, losses: 0, winRate: 0, margin: 0, marginBonus: 0, experienceBonus: 0, bonus: 0 };
  }
  const matches = data.matches.filter((match) => (
    matchesSeason(match, season)
    && match.game === game
    && (match.player1 === player || match.player2 === player)
  ));
  return recordFromMatches(player, matches);
}

function playerEloForMatch(match, player) {
  const rating = eloMatchById.get(match.id);
  if (!rating) return null;
  if (match.winner === player) {
    return {
      before: rating.winnerBefore,
      delta: rating.winnerDelta,
      expected: rating.winnerExpected,
    };
  }
  if (match.loser === player) {
    return {
      before: rating.loserBefore,
      delta: rating.loserDelta,
      expected: rating.loserExpected,
    };
  }
  return null;
}

function renderEloStamp(match, player) {
  const rating = playerEloForMatch(match, player);
  if (!rating) return '<span class="muted">-</span>';
  return `
    <span class="elo-stamp">
      <strong>${fmtRating(rating.before)}</strong>
      <span class="${deltaClass(rating.delta)}">${fmtDelta(rating.delta)}</span>
    </span>
  `;
}

function renderEloChart(target, rows) {
  if (!rows.length) {
    target.innerHTML = '<div class="chart-empty">표시할 레이팅 흐름이 없습니다.</div>';
    return;
  }

  const width = 940;
  const height = 300;
  const margin = { top: 24, right: 24, bottom: 42, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const ratings = rows.map((row) => row.ratingAfter);
  let minRating = Math.min(...ratings);
  let maxRating = Math.max(...ratings);
  if (minRating === maxRating) {
    minRating -= 50;
    maxRating += 50;
  }
  const pad = Math.max(30, (maxRating - minRating) * 0.12);
  const yMin = Math.floor((minRating - pad) / 50) * 50;
  const yMax = Math.ceil((maxRating + pad) / 50) * 50;
  const yRange = yMax - yMin || 1;
  const xFor = (index) => margin.left + (rows.length === 1 ? plotWidth / 2 : (plotWidth * index) / (rows.length - 1));
  const yFor = (rating) => margin.top + plotHeight - ((rating - yMin) / yRange) * plotHeight;
  const points = rows.map((row, index) => ({
    x: xFor(index),
    y: yFor(row.ratingAfter),
    row,
  }));
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = rows.length > 1
    ? `${linePath} L ${points.at(-1).x.toFixed(1)} ${margin.top + plotHeight} L ${points[0].x.toFixed(1)} ${margin.top + plotHeight} Z`
    : '';
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
  const xStep = Math.max(1, Math.ceil(rows.length / 6));

  target.innerHTML = `
    <svg class="rating-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(state.eloPlayer)} 레이팅 흐름">
      ${yTicks.map((tick) => {
        const y = yFor(tick);
        return `
          <line class="chart-grid" x1="${margin.left}" y1="${y.toFixed(1)}" x2="${width - margin.right}" y2="${y.toFixed(1)}"></line>
          <text class="chart-label" x="${margin.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmtRating(tick)}</text>
        `;
      }).join('')}
      <line class="chart-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}"></line>
      <line class="chart-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"></line>
      ${areaPath ? `<path class="chart-fill" d="${areaPath}"></path>` : ''}
      <path class="chart-line" d="${linePath}"></path>
      ${points.map((point) => `
        <circle class="chart-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4">
          <title>${escapeHtml(`${point.row.label} ${fmtRating(point.row.ratingAfter)} (${fmtDelta(point.row.delta)})`)}</title>
        </circle>
      `).join('')}
      ${points.filter((_, index) => index % xStep === 0 || index === points.length - 1).map((point) => `
        <text class="chart-label" x="${point.x.toFixed(1)}" y="${height - 16}" text-anchor="middle">${escapeHtml(point.row.label.replace(' ', '\u00a0'))}</text>
      `).join('')}
      <text class="chart-value" x="${points.at(-1).x.toFixed(1)}" y="${Math.max(margin.top + 14, points.at(-1).y - 10).toFixed(1)}" text-anchor="end">${fmtRating(points.at(-1).row.ratingAfter)}</text>
    </svg>
  `;
}

function renderPlayerView() {
  const player = state.player;
  const matches = filteredMatches().filter((match) => match.player1 === player || match.player2 === player);
  const adjustments = filteredAdjustments(player);
  const record = playerRecord(player, filteredMatches(), adjustments);
  const playerRating = currentRating(player);
  const seasons = [...new Set(matches.map((match) => match.seasonShort).concat(adjustments.map((item) => item.season.replace('Season', 'S'))))].sort();
  renderMetrics($('playerSummary'), [
    { label: '경기', value: record.games, tone: 'blue' },
    { label: '승', value: record.wins, tone: 'green' },
    { label: '패', value: record.losses, tone: 'amber' },
    { label: '승률', value: fmtPct(record.winRate), tone: 'green' },
    { label: 'ELO', value: fmtRating(playerRating), tone: 'blue' },
    { label: '시즌', value: seasons.join(', ') || '-' },
  ]);

  const gameRows = [...groupBy(matches, (match) => match.game).entries()].map(([game, rows]) => {
    const wins = rows.filter((match) => match.winner === player).length;
    const losses = rows.length - wins;
    const marginBonus = (wins - losses) * 50;
    const experienceBonus = rows.length * 5;
    const bonus = marginBonus + experienceBonus;
    return {
      game,
      games: rows.length,
      wins,
      losses,
      winRate: pct(wins, rows.length),
      bonus,
      adjustedRating: playerRating + bonus,
    };
  }).sort((a, b) => b.games - a.games || byKorean(a.game, b.game));

  $('playerGameCount').textContent = `${gameRows.length}종`;
  renderTable($('playerGameTable'), [
    { label: '종목', key: 'game', width: '25%' },
    { label: '경기', key: 'games', className: 'num', width: '10%' },
    { label: '승', key: 'wins', className: 'num', width: '10%' },
    { label: '패', key: 'losses', className: 'num', width: '10%' },
    { label: '승률', render: (row) => fmtPct(row.winRate), className: 'num', width: '12%' },
    { label: '보정', render: (row) => `<span class="${deltaClass(row.bonus)}">${fmtDelta(row.bonus)}</span>`, className: 'num', width: '13%' },
    { label: '보정 ELO', render: (row) => fmtRating(row.adjustedRating), className: 'num', width: '20%' },
  ], gameRows);

  const opponentRows = [...groupBy(matches, (match) => opponentOf(match, player)).entries()].map(([opponent, rows]) => {
    const wins = rows.filter((match) => match.winner === player).length;
    return {
      opponent,
      games: rows.length,
      wins,
      losses: rows.length - wins,
      winRate: pct(wins, rows.length),
      gamesPlayed: [...new Set(rows.map((match) => match.game))].length,
    };
  }).sort((a, b) => b.games - a.games || byKorean(a.opponent, b.opponent));

  $('playerOpponentCount').textContent = `${opponentRows.length}명`;
  renderTable($('playerOpponentTable'), [
    { label: '상대', key: 'opponent', width: '30%' },
    { label: '경기', key: 'games', className: 'num', width: '14%' },
    { label: '승', key: 'wins', className: 'num', width: '14%' },
    { label: '패', key: 'losses', className: 'num', width: '14%' },
    { label: '승률', render: (row) => fmtPct(row.winRate), className: 'num', width: '14%' },
    { label: '종목', key: 'gamesPlayed', className: 'num', width: '14%' },
  ], opponentRows);

  const logRows = matches.slice().sort((a, b) => a.id - b.id);
  $('playerLogCount').textContent = `${logRows.length}경기`;
  renderTable($('playerLogTable'), [
    { label: '로그', render: (row) => renderMatchLogButton(row), width: '76px' },
    { label: '시즌', render: (row) => `${row.seasonShort} ${shortPhase(row)}`, width: '84px' },
    { label: '종목', key: 'game', width: '130px' },
    { label: '상대', render: (row) => escapeHtml(opponentOf(row, player)), width: '82px' },
    { label: '결과', render: (row) => `<span class="${resultClass(row, player)}">${resultText(row, player)}</span>`, width: '62px' },
    { label: '내 ELO', render: (row) => renderEloStamp(row, player), className: 'num', width: '96px' },
    { label: '상대 ELO', render: (row) => renderEloStamp(row, opponentOf(row, player)), className: 'num', width: '96px' },
    { label: '승자', key: 'winner', width: '82px' },
    { label: '팀 매치', render: (row) => escapeHtml([row.team1, row.team2].filter(Boolean).join(' vs ')), width: '190px' },
    { label: '원문', key: 'rawLine', width: '380px' },
  ], logRows);
}

function renderHeadToHeadView() {
  const a = state.playerA;
  const b = state.playerB;
  const matches = filteredMatches().filter((match) => (
    (match.player1 === a && match.player2 === b) || (match.player1 === b && match.player2 === a)
  ));
  const aWins = matches.filter((match) => match.winner === a).length;
  const bWins = matches.filter((match) => match.winner === b).length;
  const games = [...new Set(matches.map((match) => match.game))].sort(byKorean);
  const seasons = [...new Set(matches.map((match) => match.seasonShort))].sort();

  renderMetrics($('h2hSummary'), [
    { label: '경기', value: matches.length, tone: 'blue' },
    { label: `${a} 승`, value: aWins, tone: 'green' },
    { label: `${b} 승`, value: bWins, tone: 'amber' },
    { label: `${a} 승률`, value: fmtPct(pct(aWins, matches.length)), tone: 'green' },
    { label: '종목', value: games.length, tone: 'blue' },
    { label: '시즌', value: seasons.join(', ') || '-' },
  ]);

  const gameRows = [...groupBy(matches, (match) => match.game).entries()].map(([game, rows]) => {
    const winsA = rows.filter((match) => match.winner === a).length;
    const winsB = rows.length - winsA;
    return {
      game,
      games: rows.length,
      winsA,
      winsB,
      winRateA: pct(winsA, rows.length),
    };
  }).sort((x, y) => y.games - x.games || byKorean(x.game, y.game));

  $('h2hGameCount').textContent = `${gameRows.length}종`;
  renderTable($('h2hGameTable'), [
    { label: '종목', key: 'game', width: '34%' },
    { label: '경기', key: 'games', className: 'num', width: '14%' },
    { label: `${a} 승`, key: 'winsA', className: 'num', width: '18%' },
    { label: `${b} 승`, key: 'winsB', className: 'num', width: '18%' },
    { label: `${a} 승률`, render: (row) => fmtPct(row.winRateA), className: 'num', width: '16%' },
  ], gameRows);

  const logRows = matches.slice().sort((x, y) => x.id - y.id);
  $('h2hLogCount').textContent = `${logRows.length}경기`;
  renderTable($('h2hLogTable'), [
    { label: '로그', render: (row) => renderMatchLogButton(row), width: '76px' },
    { label: '시즌', render: (row) => `${row.seasonShort} ${shortPhase(row)}`, width: '84px' },
    { label: '종목', key: 'game', width: '130px' },
    { label: '대진', render: (row) => escapeHtml(`${row.player1} vs ${row.player2}`), width: '150px' },
    { label: '승자', render: (row) => `<span class="${row.winner === a ? 'winner' : 'loss'}">${escapeHtml(row.winner)}</span>`, width: '82px' },
    { label: `${a} ELO`, render: (row) => renderEloStamp(row, a), className: 'num', width: '96px' },
    { label: `${b} ELO`, render: (row) => renderEloStamp(row, b), className: 'num', width: '96px' },
    { label: '팀 매치', render: (row) => escapeHtml([row.team1, row.team2].filter(Boolean).join(' vs ')), width: '190px' },
    { label: '원문', key: 'rawLine', width: '380px' },
  ], logRows);
}

function renderEloView() {
  if (!data.elo) return;

  const selected = eloRow(state.eloPlayer) || data.elo.leaderboard[0];
  if (!selected) return;
  state.eloPlayer = selected.player;
  const text = state.text.toLowerCase();
  const seasonPlayerSet = new Set(seasonPlayers());
  const timelineRows = (data.elo.timeline[selected.player] || []).filter((row) => {
    if (state.season !== 'all' && row.seasonShort !== state.season) return false;
    return true;
  });

  renderMetrics($('eloSummary'), [
    { label: '순위', value: `#${selected.rank}`, tone: 'blue' },
    { label: '현재', value: fmtRating(selected.rating), tone: 'green' },
    { label: '변동', value: fmtDelta(selected.change), tone: selected.change >= 0 ? 'green' : 'amber' },
    { label: '최고', value: fmtRating(selected.peakRating), tone: 'green' },
    { label: '최저', value: fmtRating(selected.lowRating), tone: 'amber' },
    { label: '승률', value: fmtPct(selected.winRate), tone: 'blue' },
  ]);

  $('eloChartCount').textContent = `${timelineRows.length}개 구간`;
  renderEloChart($('eloChart'), timelineRows);

  const leaderboardRows = data.elo.leaderboard.filter((row) => (
    seasonPlayerSet.has(row.player)
    && (!text || row.player.toLowerCase().includes(text))
  ));
  const leaderboardDisplayRows = visibleRows(leaderboardRows, state.eloLeaderboardExpanded);

  updateToggleButton('eloLeaderboardToggle', state.eloLeaderboardExpanded, leaderboardRows.length);
  $('eloLeaderboardCount').textContent = state.eloLeaderboardExpanded
    ? `${leaderboardRows.length}명`
    : `${Math.min(10, leaderboardRows.length)}/${leaderboardRows.length}명`;
  renderTable($('eloLeaderboardTable'), [
    { label: '순위', render: (row) => `<span class="rank">#${row.rank}</span>`, width: '70px' },
    { label: '플레이어', key: 'player', width: '110px' },
    { label: '레이팅', render: (row) => fmtRating(row.rating), className: 'num', width: '100px' },
    { label: '전적', render: (row) => `${row.wins}-${row.losses}`, className: 'num', width: '90px' },
    { label: '승률', render: (row) => fmtPct(row.winRate), className: 'num', width: '90px' },
    { label: '최고', render: (row) => fmtRating(row.peakRating), className: 'num', width: '90px' },
  ], leaderboardDisplayRows);

  $('eloTimelineCount').textContent = `${timelineRows.length}개 구간`;
  renderTable($('eloTimelineTable'), [
    { label: '주차', key: 'label', width: '100px' },
    { label: '시작', render: (row) => fmtRating(row.ratingBefore), className: 'num', width: '100px' },
    {
      label: '변동',
      render: (row) => `<span class="${deltaClass(row.delta)}">${fmtDelta(row.delta)}</span>`,
      className: 'num',
      width: '100px',
    },
    { label: '종료', render: (row) => fmtRating(row.ratingAfter), className: 'num', width: '100px' },
    { label: '경기', key: 'matches', className: 'num', width: '80px' },
    { label: '승', key: 'wins', className: 'num', width: '80px' },
    { label: '패', key: 'losses', className: 'num', width: '80px' },
  ], timelineRows);

  const matchRows = filteredMatches()
    .filter((match) => match.player1 === selected.player || match.player2 === selected.player)
    .map((match) => {
      const rating = eloMatchById.get(match.id);
      const won = match.winner === selected.player;
      return {
        ...match,
        opponent: opponentOf(match, selected.player),
        result: won ? '승' : '패',
        ratingBefore: rating ? (won ? rating.winnerBefore : rating.loserBefore) : null,
        delta: rating ? (won ? rating.winnerDelta : rating.loserDelta) : null,
        expected: rating ? (won ? rating.winnerExpected : rating.loserExpected) : null,
      };
    })
    .sort((a, b) => a.id - b.id);

  $('eloMatchCount').textContent = `${matchRows.length}경기`;
  renderTable($('eloMatchTable'), [
    { label: '로그', render: (row) => renderMatchLogButton(row), width: '76px' },
    { label: '시즌', render: (row) => `${row.seasonShort} ${shortPhase(row)}`, width: '90px' },
    { label: '종목', key: 'game', width: '140px' },
    { label: '상대', key: 'opponent', width: '90px' },
    { label: '결과', render: (row) => `<span class="${row.result === '승' ? 'winner' : 'loss'}">${row.result}</span>`, width: '70px' },
    { label: '당시', render: (row) => fmtRating(row.ratingBefore), className: 'num', width: '90px' },
    {
      label: '변동',
      render: (row) => `<span class="${deltaClass(row.delta)}">${fmtDelta(row.delta)}</span>`,
      className: 'num',
      width: '90px',
    },
    { label: '기대', render: (row) => fmtPct(row.expected), className: 'num', width: '80px' },
    { label: '원문', key: 'rawLine', width: '390px' },
  ], matchRows);
}

function renderGameEloView() {
  if (!data.elo) return;

  const text = state.text.toLowerCase();
  const seasonLabel = state.season === 'all' ? '전체 시즌' : state.season;
  const sortLabels = {
    elo: 'ELO순',
    wins: '승리 순',
    winRate: '승률 순',
  };
  const gameMatches = data.matches
    .filter((match) => (
      matchesSeason(match)
      && match.game === state.eloGame
      && matchesText(match)
    ))
    .sort((a, b) => a.id - b.id);
  const seasonPlayerSet = new Set(seasonPlayers());
  const gameLeaderboardRows = data.elo.leaderboard.map((row) => {
    const record = recordFromMatches(row.player, gameMatches.filter((match) => match.player1 === row.player || match.player2 === row.player));
    return {
      ...row,
      gameRecord: record,
      gameAdjustedRating: row.rating + record.bonus,
    };
  }).filter((row) => (
    seasonPlayerSet.has(row.player)
    && row.gameRecord.games > 0
    && (!text || row.player.toLowerCase().includes(text) || gameMatches.some((match) => match.player1 === row.player || match.player2 === row.player))
  ))
    .sort((a, b) => {
      if (state.gameAnalysisSort === 'wins') {
        return b.gameRecord.wins - a.gameRecord.wins
          || b.gameRecord.games - a.gameRecord.games
          || b.gameAdjustedRating - a.gameAdjustedRating
          || a.player.localeCompare(b.player, 'ko');
      }
      if (state.gameAnalysisSort === 'winRate') {
        return b.gameRecord.winRate - a.gameRecord.winRate
          || b.gameRecord.wins - a.gameRecord.wins
          || b.gameAdjustedRating - a.gameAdjustedRating
          || a.player.localeCompare(b.player, 'ko');
      }
      return b.gameAdjustedRating - a.gameAdjustedRating || b.rating - a.rating || a.player.localeCompare(b.player, 'ko');
    })
    .map((row, index) => ({ ...row, gameRank: index + 1 }));
  const gameLeaderboardDisplayRows = visibleRows(gameLeaderboardRows, state.eloGameLeaderboardExpanded);
  const bestBonus = gameLeaderboardRows.length
    ? Math.max(...gameLeaderboardRows.map((row) => row.gameRecord.bonus))
    : 0;

  renderMetrics($('gameAnalysisSummary'), [
    { label: '종목', value: state.eloGame || '-', tone: 'blue' },
    { label: '시즌', value: seasonLabel },
    { label: '경기', value: gameMatches.length, tone: 'green' },
    { label: '참가자', value: gameLeaderboardRows.length, tone: 'blue' },
    { label: '최고 보정', value: fmtDelta(bestBonus), tone: bestBonus >= 0 ? 'green' : 'amber' },
    { label: '정렬', value: sortLabels[state.gameAnalysisSort] || sortLabels.elo },
  ]);

  updateToggleButton('eloGameLeaderboardToggle', state.eloGameLeaderboardExpanded, gameLeaderboardRows.length);
  $('eloGameLeaderboardCount').textContent = state.eloGameLeaderboardExpanded
    ? `${state.eloGame} · ${gameLeaderboardRows.length}명`
    : `${state.eloGame} · ${Math.min(10, gameLeaderboardRows.length)}/${gameLeaderboardRows.length}명`;
  renderTable($('eloGameLeaderboardTable'), [
    { label: '순위', render: (row) => `<span class="rank">#${row.gameRank}</span>`, width: '70px' },
    { label: '플레이어', key: 'player', width: '110px' },
    { label: '현재 ELO', render: (row) => fmtRating(row.rating), className: 'num', width: '100px' },
    { label: '종목 전적', render: (row) => `${row.gameRecord.wins}-${row.gameRecord.losses}`, className: 'num', width: '90px' },
    { label: '승률', render: (row) => fmtPct(row.gameRecord.winRate), className: 'num', width: '90px' },
    { label: '득실', render: (row) => `<span class="${deltaClass(row.gameRecord.marginBonus)}">${fmtDelta(row.gameRecord.marginBonus)}</span>`, className: 'num', width: '90px' },
    { label: '경험', render: (row) => `<span class="${deltaClass(row.gameRecord.experienceBonus)}">${fmtDelta(row.gameRecord.experienceBonus)}</span>`, className: 'num', width: '90px' },
    { label: '종목 보정치', render: (row) => `<span class="${deltaClass(row.gameRecord.bonus)}">${fmtDelta(row.gameRecord.bonus)}</span>`, className: 'num', width: '110px' },
    { label: '종목 ELO', render: (row) => fmtRating(row.gameAdjustedRating), className: 'num', width: '110px' },
  ], gameLeaderboardDisplayRows);

  $('gameAnalysisLogCount').textContent = `${gameMatches.length}경기`;
  renderTable($('gameAnalysisLogTable'), [
    { label: '로그', render: (row) => renderMatchLogButton(row), width: '76px' },
    { label: '시즌', render: (row) => `${row.seasonShort} ${shortPhase(row)}`, width: '90px' },
    { label: '대진', render: (row) => escapeHtml(`${row.player1} vs ${row.player2}`), width: '150px' },
    { label: '승자', render: (row) => `<span class="winner">${escapeHtml(row.winner)}</span>`, width: '86px' },
    { label: '패자', render: (row) => `<span class="loss">${escapeHtml(row.loser)}</span>`, width: '86px' },
    { label: '팀 매치', render: (row) => escapeHtml([row.team1, row.team2].filter(Boolean).join(' vs ')), width: '210px' },
    { label: '원문', key: 'rawLine', width: '420px' },
  ], gameMatches);
}

function renderVirtualView() {
  if (!data.elo) return;

  const a = state.virtualA;
  const b = state.virtualB;
  const game = state.virtualGame;
  const ratingA = currentRating(a);
  const ratingB = currentRating(b);
  const gameA = gameRecord(a, game, state.season);
  const gameB = gameRecord(b, game, state.season);
  const adjustedRatingA = ratingA + gameA.bonus;
  const adjustedRatingB = ratingB + gameB.bonus;
  const expectedA = expectedWinRate(adjustedRatingA, adjustedRatingB);
  const expectedB = 1 - expectedA;
  const diff = adjustedRatingA - adjustedRatingB;
  const rowA = eloRow(a);
  const rowB = eloRow(b);
  const gameLabel = game === 'all' ? '종목 미반영' : game;

  renderMetrics($('virtualSummary'), [
    { label: `${a} 승률`, value: fmtPct(expectedA), tone: expectedA >= expectedB ? 'green' : 'amber' },
    { label: `${b} 승률`, value: fmtPct(expectedB), tone: expectedB > expectedA ? 'green' : 'amber' },
    { label: '적용 차', value: fmtDelta(diff), tone: diff >= 0 ? 'green' : 'amber' },
    { label: `${a} 총보정`, value: fmtDelta(gameA.bonus), tone: gameA.bonus >= 0 ? 'green' : 'amber' },
    { label: `${b} 총보정`, value: fmtDelta(gameB.bonus), tone: gameB.bonus >= 0 ? 'green' : 'amber' },
    { label: '지수 종목', value: gameLabel, tone: 'blue' },
  ]);

  $('virtualMatchupLabel').textContent = `${a} vs ${b} · ${gameLabel}`;
  renderTable($('virtualTable'), [
    { label: '플레이어', key: 'player', width: '13%' },
    { label: '현재 ELO', render: (row) => fmtRating(row.rating), className: 'num', width: '12%' },
    { label: '종목 전적', render: (row) => row.gameRecord, className: 'num', width: '12%' },
    { label: '득실', render: (row) => `<span class="${deltaClass(row.marginBonus)}">${fmtDelta(row.marginBonus)}</span>`, className: 'num', width: '11%' },
    { label: '경험', render: (row) => `<span class="${deltaClass(row.experienceBonus)}">${fmtDelta(row.experienceBonus)}</span>`, className: 'num', width: '11%' },
    { label: '보정 합계', render: (row) => `<span class="${deltaClass(row.gameBonus)}">${fmtDelta(row.gameBonus)}</span>`, className: 'num', width: '12%' },
    { label: '적용 ELO', render: (row) => fmtRating(row.adjustedRating), className: 'num', width: '14%' },
    { label: '예상 승률', render: (row) => fmtPct(row.expected), className: 'num', width: '15%' },
  ], [
    {
      player: a,
      rank: rowA?.rank || '-',
      rating: ratingA,
      adjustedRating: adjustedRatingA,
      expected: expectedA,
      wins: rowA?.wins || 0,
      losses: rowA?.losses || 0,
      winRate: rowA?.winRate || 0,
      gameRecord: game === 'all' ? '-' : `${gameA.wins}-${gameA.losses}`,
      marginBonus: gameA.marginBonus,
      experienceBonus: gameA.experienceBonus,
      gameBonus: gameA.bonus,
    },
    {
      player: b,
      rank: rowB?.rank || '-',
      rating: ratingB,
      adjustedRating: adjustedRatingB,
      expected: expectedB,
      wins: rowB?.wins || 0,
      losses: rowB?.losses || 0,
      winRate: rowB?.winRate || 0,
      gameRecord: game === 'all' ? '-' : `${gameB.wins}-${gameB.losses}`,
      marginBonus: gameB.marginBonus,
      experienceBonus: gameB.experienceBonus,
      gameBonus: gameB.bonus,
    },
  ]);
}

function appliedRating(player, game) {
  return currentRating(player) + gameRecord(player, game, state.season).bonus;
}

function renderTeamMembers(target, side, players, size) {
  const playerOptions = seasonPlayers();
  target.innerHTML = players.slice(0, size).map((player, index) => `
    <label>
      ${index + 1}
      <select data-team-member="${side}" data-index="${index}">
        <option value=""${player ? '' : ' selected'}>선택</option>${optionList(playerOptions, player)}
      </select>
    </label>
  `).join('');
}

function selectedTeamPlayers(players, size) {
  return [...new Set(players.slice(0, size).filter(Boolean))];
}

function shuffle(items) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function duelWinner(playerA, playerB, game) {
  return Math.random() < expectedWinRate(appliedRating(playerA, game), appliedRating(playerB, game)) ? 'A' : 'B';
}

function simulateTeamBattle(teamA, teamB, game, iterations = 1000) {
  const outcomes = new Map();
  let winsA = 0;
  let winsB = 0;

  for (let iteration = 0; iteration < iterations; iteration++) {
    let aliveA = shuffle(teamA);
    let aliveB = shuffle(teamB);
    let scoreA = 0;
    let scoreB = 0;
    const firstRound = Math.min(aliveA.length, aliveB.length);
    const nextA = [];
    const nextB = [];

    for (let index = 0; index < firstRound; index++) {
      if (duelWinner(aliveA[index], aliveB[index], game) === 'A') {
        scoreA += 1;
        nextA.push(aliveA[index]);
      } else {
        scoreB += 1;
        nextB.push(aliveB[index]);
      }
    }

    aliveA = nextA;
    aliveB = nextB;

    while (aliveA.length && aliveB.length) {
      const indexA = Math.floor(Math.random() * aliveA.length);
      const indexB = Math.floor(Math.random() * aliveB.length);
      if (duelWinner(aliveA[indexA], aliveB[indexB], game) === 'A') {
        scoreA += 1;
        aliveB.splice(indexB, 1);
      } else {
        scoreB += 1;
        aliveA.splice(indexA, 1);
      }
    }

    const winner = aliveA.length ? 'A' : 'B';
    if (winner === 'A') winsA += 1;
    else winsB += 1;

    const key = `${winner}|${scoreA}:${scoreB}`;
    outcomes.set(key, (outcomes.get(key) || 0) + 1);
  }

  const rows = [...outcomes.entries()].map(([key, count]) => {
    const [winner, score] = key.split('|');
    return {
      winner,
      score,
      count,
      rate: count / iterations,
    };
  }).sort((a, b) => b.count - a.count || a.score.localeCompare(b.score, 'ko'));

  return { iterations, winsA, winsB, rows };
}

function renderTeamVirtualView() {
  const size = Number(state.teamSize);
  state.teamAPlayers = memberSlots(state.teamAPlayers, 5);
  state.teamBPlayers = memberSlots(state.teamBPlayers, 5);

  renderTeamMembers($('teamAMembers'), 'A', state.teamAPlayers, size);
  renderTeamMembers($('teamBMembers'), 'B', state.teamBPlayers, size);

  const teamA = selectedTeamPlayers(state.teamAPlayers, size);
  const teamB = selectedTeamPlayers(state.teamBPlayers, size);
  const teamALabel = state.teamPresetA || '팀 A';
  const teamBLabel = state.teamPresetB || '팀 B';
  const gameLabel = state.teamGame === 'all' ? '종목 미반영' : state.teamGame;
  $('teamALabel').textContent = `${teamA.length}/${size}명`;
  $('teamBLabel').textContent = `${teamB.length}/${size}명`;

  if (teamA.length < size || teamB.length < size) {
    renderMetrics($('teamVirtualSummary'), [
      { label: '상태', value: '구성 필요', tone: 'amber' },
      { label: '방식', value: `${size}vs${size}`, tone: 'blue' },
      { label: '종목', value: gameLabel, tone: 'blue' },
    ]);
    renderTable($('teamVirtualResultTable'), [], [], '각 팀의 중복 없는 멤버를 모두 채워주세요.');
    renderTable($('teamVirtualRosterTable'), [], [], '출전 명단이 부족합니다.');
    return;
  }

  const result = simulateTeamBattle(teamA, teamB, state.teamGame, 1000);
  const topOutcome = result.rows[0];
  const topLabel = topOutcome ? `${topOutcome.winner === 'A' ? teamALabel : teamBLabel} ${topOutcome.score}` : '-';
  renderMetrics($('teamVirtualSummary'), [
    { label: `${teamALabel} 승률`, value: fmtPct(result.winsA / result.iterations), tone: result.winsA >= result.winsB ? 'green' : 'amber' },
    { label: `${teamBLabel} 승률`, value: fmtPct(result.winsB / result.iterations), tone: result.winsB > result.winsA ? 'green' : 'amber' },
    { label: '최다 결과', value: topLabel, tone: 'blue' },
    { label: '방식', value: `${size}vs${size}`, tone: 'blue' },
    { label: '종목', value: gameLabel, tone: 'blue' },
    { label: '반복', value: result.iterations, tone: 'green' },
  ]);

  $('teamVirtualResultCount').textContent = `${result.rows.length}개 경우`;
  renderTable($('teamVirtualResultTable'), [
    { label: '결과', render: (row) => `${row.winner === 'A' ? teamALabel : teamBLabel} ${row.score} 승`, width: '44%' },
    { label: '횟수', key: 'count', className: 'num', width: '24%' },
    { label: '비율', render: (row) => fmtPct(row.rate), className: 'num', width: '32%' },
  ], result.rows);

  const rosterRows = [
    ...teamA.map((player) => ({ side: teamALabel, player })),
    ...teamB.map((player) => ({ side: teamBLabel, player })),
  ].map((row) => {
    const record = gameRecord(row.player, state.teamGame, state.season);
    return {
      ...row,
      rating: currentRating(row.player),
      bonus: record.bonus,
      applied: currentRating(row.player) + record.bonus,
    };
  });

  $('teamVirtualRosterCount').textContent = `${rosterRows.length}명`;
  renderTable($('teamVirtualRosterTable'), [
    { label: '팀', key: 'side', width: '25%' },
    { label: '플레이어', key: 'player', width: '25%' },
    { label: '현재 ELO', render: (row) => fmtRating(row.rating), className: 'num', width: '18%' },
    { label: '보정', render: (row) => `<span class="${deltaClass(row.bonus)}">${fmtDelta(row.bonus)}</span>`, className: 'num', width: '14%' },
    { label: '적용 ELO', render: (row) => fmtRating(row.applied), className: 'num', width: '18%' },
  ], rosterRows);
}

function render() {
  renderPlayerView();
  renderHeadToHeadView();
  renderEloView();
  renderGameEloView();
  renderVirtualView();
  renderTeamVirtualView();
}

function syncControls() {
  ensureSeasonSelections();
  const players = seasonPlayers();
  const games = seasonGames();
  const teams = seasonTeamNames();

  $('seasonFilter').innerHTML = `<option value="all">전체</option>${optionList(data.meta.seasons, state.season)}`;
  $('gameFilter').innerHTML = `<option value="all">전체</option>${optionList(games, state.game)}`;

  const playerOptions = optionList(players, state.player);
  $('playerSelect').innerHTML = playerOptions;
  $('playerASelect').innerHTML = optionList(players, state.playerA);
  $('playerBSelect').innerHTML = optionList(players, state.playerB);
  $('eloPlayerSelect').innerHTML = optionList(players, state.eloPlayer);
  $('eloGameSelect').innerHTML = optionList(games, state.eloGame);
  $('gameAnalysisSortSelect').value = state.gameAnalysisSort;
  $('virtualASelect').innerHTML = optionList(players, state.virtualA);
  $('virtualBSelect').innerHTML = optionList(players, state.virtualB);
  $('virtualGameSelect').innerHTML = `<option value="all"${state.virtualGame === 'all' ? ' selected' : ''}>종목 미반영</option>${optionList(games, state.virtualGame)}`;
  $('teamSizeSelect').value = String(state.teamSize);
  $('teamGameSelect').innerHTML = `<option value="all"${state.teamGame === 'all' ? ' selected' : ''}>종목 미반영</option>${optionList(games, state.teamGame)}`;
  $('teamPresetASelect').innerHTML = optionList(teams, state.teamPresetA);
  $('teamPresetBSelect').innerHTML = optionList(teams, state.teamPresetB);
  $('textFilter').value = state.text;
}

function bindEvents() {
  $('matchLogClose').addEventListener('click', closeMatchLog);
  $('matchLogBackdrop').addEventListener('click', closeMatchLog);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('matchLogModal').hidden) closeMatchLog();
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-match-log]');
    if (!button) return;
    const match = matchById.get(button.dataset.matchLog);
    if (match) openMatchLog(match);
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item === tab));
      $('playerView').classList.toggle('is-active', state.tab === 'player');
      $('headToHeadView').classList.toggle('is-active', state.tab === 'headToHead');
      $('eloView').classList.toggle('is-active', state.tab === 'elo');
      $('gameEloView').classList.toggle('is-active', state.tab === 'gameElo');
      $('virtualView').classList.toggle('is-active', state.tab === 'virtual');
      $('teamVirtualView').classList.toggle('is-active', state.tab === 'teamVirtual');
    });
  });

  $('seasonFilter').addEventListener('change', (event) => {
    state.season = event.target.value;
    state.eloGameLeaderboardExpanded = false;
    syncControls();
    render();
  });
  $('gameFilter').addEventListener('change', (event) => {
    state.game = event.target.value;
    render();
  });
  $('textFilter').addEventListener('input', (event) => {
    state.text = event.target.value.trim();
    render();
  });
  $('playerSelect').addEventListener('change', (event) => {
    state.player = event.target.value;
    render();
  });
  $('playerASelect').addEventListener('change', (event) => {
    state.playerA = event.target.value;
    if (state.playerA === state.playerB) {
      state.playerB = seasonPlayers().find((player) => player !== state.playerA) || state.playerB;
      syncControls();
    }
    render();
  });
  $('playerBSelect').addEventListener('change', (event) => {
    state.playerB = event.target.value;
    if (state.playerA === state.playerB) {
      state.playerA = seasonPlayers().find((player) => player !== state.playerB) || state.playerA;
      syncControls();
    }
    render();
  });
  $('eloPlayerSelect').addEventListener('change', (event) => {
    state.eloPlayer = event.target.value;
    render();
  });
  $('eloGameSelect').addEventListener('change', (event) => {
    state.eloGame = event.target.value;
    state.eloGameLeaderboardExpanded = false;
    render();
  });
  $('gameAnalysisSortSelect').addEventListener('change', (event) => {
    state.gameAnalysisSort = event.target.value;
    render();
  });
  $('eloLeaderboardToggle').addEventListener('click', () => {
    state.eloLeaderboardExpanded = !state.eloLeaderboardExpanded;
    render();
  });
  $('eloGameLeaderboardToggle').addEventListener('click', () => {
    state.eloGameLeaderboardExpanded = !state.eloGameLeaderboardExpanded;
    render();
  });
  $('virtualASelect').addEventListener('change', (event) => {
    state.virtualA = event.target.value;
    if (state.virtualA === state.virtualB) {
      state.virtualB = seasonPlayers().find((player) => player !== state.virtualA) || state.virtualB;
      syncControls();
    }
    render();
  });
  $('virtualBSelect').addEventListener('change', (event) => {
    state.virtualB = event.target.value;
    if (state.virtualA === state.virtualB) {
      state.virtualA = seasonPlayers().find((player) => player !== state.virtualB) || state.virtualA;
      syncControls();
    }
    render();
  });
  $('virtualGameSelect').addEventListener('change', (event) => {
    state.virtualGame = event.target.value;
    render();
  });
  $('teamSizeSelect').addEventListener('change', (event) => {
    state.teamSize = Number(event.target.value);
    render();
  });
  $('teamGameSelect').addEventListener('change', (event) => {
    state.teamGame = event.target.value;
    render();
  });
  $('teamPresetASelect').addEventListener('change', (event) => {
    state.teamPresetA = event.target.value;
    state.teamAPlayers = memberSlots(rosterForTeam(state.teamPresetA), 5);
    render();
  });
  $('teamPresetBSelect').addEventListener('change', (event) => {
    state.teamPresetB = event.target.value;
    state.teamBPlayers = memberSlots(rosterForTeam(state.teamPresetB), 5);
    render();
  });
  $('teamAMembers').addEventListener('change', (event) => {
    const select = event.target.closest('select[data-team-member]');
    if (!select) return;
    state.teamAPlayers[Number(select.dataset.index)] = select.value;
    render();
  });
  $('teamBMembers').addEventListener('change', (event) => {
    const select = event.target.closest('select[data-team-member]');
    if (!select) return;
    state.teamBPlayers[Number(select.dataset.index)] = select.value;
    render();
  });
}

function init() {
  $('dataMeta').textContent = `상세 ${data.meta.matches.toLocaleString('ko-KR')}경기 · 보정 ${data.meta.adjustedMatches.toLocaleString('ko-KR')}경기 · 참가자 ${data.meta.players}명 · 종목 ${data.meta.games}종 · ELO K=${data.meta.elo.k}`;
  syncControls();
  bindEvents();
  render();
}

init();
