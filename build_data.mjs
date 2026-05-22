import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'C:/Users/이찬영/OneDrive/Desktop/UPL_History';
const outDir = `${root}/outputs/upl_record_search`;

const clean = (s = '') =>
  s.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\t ]+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const playerAlias = new Map(Object.entries({
  '러브데스티니': '러데',
  '럽둥이': '러데',
  '스토커': '스톡',
  '토기': '스톡',
  '운돼': '운동이',
  '지녀스': '지니어스',
  '지니': '지니어스',
  '박동현': '동현',
  '도현': '박도현',
  '삼디': '쌈디',
  '팀드완': '탐드완',
  '구름': '구름뒤',
  'km24': '이사',
}));

function normPlayer(player) {
  const value = clean(player).replace(/[()[\]{}]/g, '').trim();
  return playerAlias.get(value) || value;
}

function normSeasonTeam(team) {
  const compact = clean(team).replace(/팀/g, '').replace(/[()]/g, '').replace(/\s+/g, '');
  if (compact.includes('디스')) return '디스';
  if (compact.includes('천하갑') || compact === '천하') return '천하갑';
  if (compact.includes('만원개이득') || compact.includes('만개득')) return '만원개이득';
  if (compact.includes('모아이의석상근처둘') || compact.includes('모아이의석상근처돌') || compact.includes('모석둘')) {
    return '모아이의 석상 근처 둘';
  }
  if (compact.includes('레알데마드리드') || compact.includes('레알데') || compact.includes('큐알고')) return '큐알 고';
  return clean(team);
}

function normTeam(team, season) {
  let value = clean(team).replace(/^팀\s+/, '').replace(/\s+팀$/, '').trim();
  value = value.replace(/\(\s*승(?:리)?\s*\)/g, '').replace(/\[\s*승(?:리)?\s*\]/g, '').trim();
  value = value.replace(/[()[\]]/g, '').replace(/\s*승(?:리)?$/, '').trim();
  if (season === 'Season1') return normSeasonTeam(value);
  return value.replace(/스타\s*geniUS/i, '스타 geniUS');
}

function normGame(raw, season) {
  let value = clean(raw)
    .replace(/^[-–—]+|[-–—]+$/g, '')
    .replace(/\s*[-–—]+\s*$/, '')
    .replace(/[!！]/g, '')
    .trim();
  const compact = value.replace(/\s+/g, '').toLowerCase();
  const seasonNo = Number(season.match(/\d+/)[0]);
  if (!compact) return '';

  if (/^(인포q|인디언포커q?|인디언포커)$/.test(compact)) return '인디언 포커 Q';
  if (/^인디언홀덤q?$/.test(compact)) return '인디언 홀덤 Q';
  if (compact === '실흑' || compact === '실퍼의흑과백') return '실퍼의 흑과백';
  if (compact === '5탑' || compact === '5개의탑') return '5개의 탑';
  if (compact === '넘4' || compact === '넘버4') return '넘버 4';
  if (compact === '숫야' || compact === '숫자야구') return '숫자야구';
  if (compact === '데레2' || /^데스레이스(2|ii|ll|ⅱ)$/.test(compact)) return '데스 레이스 2';
  if (compact === '배흑' || compact === '배수흑과백') return '배수 흑과백';
  if (compact === '시흑' || compact === '시드흑과백') return '시드 흑과백';
  if (compact === '다코' || compact === '다빈치코드') return '다빈치코드';
  if (['베가', '베가보', '베팅가위보', '베팅가위바위보', '배팅가위바위보'].includes(compact)) {
    return '베팅 가위바위보';
  }
  if (compact === '베팅흑과백' || compact === '배팅흑과백') return '베팅 흑과백';
  if (compact === '흑2' || compact === '흑백2' || compact === '흑과백2') return '흑과백 2';
  if (compact === '흑백1' || compact === '흑과백1') return '흑과백 1';
  if (compact === '흑과백') return seasonNo >= 2 ? '흑과백 2' : '흑과백 1';
  if (compact === '매난곡죽' || compact === '매난국죽') return '매난국죽';
  if (compact === '투자와기부') return '투자와 기부';
  if (compact === '연승게임' || compact === '연승게임리뉴얼') return '연승게임리뉴얼';
  if (compact === '하이n로우') return '하이N로우';

  const exact = [
    '3M', '콰트로', '해달별2', '암전게임', '산토리니', '시드게임', '시드섯다', '배틀넘버',
    '시드장기', '사이장기', '은행놀이', '동전포커', '포도설탕2', '양면장기', '사중력사목', '레드블랙',
  ];
  for (const item of exact) {
    if (compact === item.replace(/\s+/g, '').toLowerCase()) return item;
  }
  for (const item of ['하이N로우', '사이장기', '5개의 탑', '베팅 가위바위보', '인디언 포커 Q']) {
    if (compact.startsWith(item.replace(/\s+/g, '').toLowerCase())) return item;
  }
  return '';
}

function phaseFromFile(file) {
  if (file.startsWith('Week')) return '정규시즌';
  if (file === 'Playoff.txt') return '플레이오프';
  if (file === 'Final.txt') return '결승';
  return '';
}

function weekFromFile(file) {
  const match = file.match(/Week(\d+)/);
  return match ? Number(match[1]) : null;
}

function isNonMatchLine(line) {
  return /세트스코어|결승진출|최종|출처|시상식|^\[?결승전|^UPL시즌\d+|^UPL 결승전|^UPL 준결승전|^플레이오프\s*\d+차전/.test(line);
}

function extractWinner(line) {
  let match = line.match(/([^\s()[\]{}]+)\s*\(\s*승\s*\)\s*$/);
  if (match) return normPlayer(match[1]);
  const parens = [...line.matchAll(/\(([^()]*?)\s*승(?:리)?\s*\)/g)];
  if (parens.length) {
    const value = clean(parens.at(-1)[1]);
    if (value) return normPlayer(value);
  }
  const wins = [...line.matchAll(/([^\s()]+)\s*승(?:리)?/g)];
  if (wins.length) return normPlayer(wins.at(-1)[1]);
  return '';
}

function stripWinner(body, winner) {
  let value = body;
  value = value.replace(/([^\s()]+)\s*\(\s*승\s*\)\s*$/, '').trim();
  value = value.replace(/\([^()]*?\s*승(?:리)?\s*\)\s*$/, '').trim();
  if (winner) value = value.replace(new RegExp(`${esc(winner)}\\s*승(?:리)?\\s*$`), '').trim();
  value = value.replace(/[^\s()]+\s*승(?:리)?\s*$/, '').trim();
  return value.replace(/[()]/g, ' ').trim();
}

function parsePersonal(raw, season) {
  const line = clean(raw.replace(/^>\s*/, '').replace(/^#+\s*/, ''));
  if (!line || !/(?:vs|VS)/.test(line) || !/승/.test(line) || /경기취소/.test(line)) return null;
  if (isNonMatchLine(line)) return null;

  const winner = extractWinner(line);
  if (!winner) return null;

  let body = line
    .replace(/^\d+\s*(?:경기|경가|세트|set)?\s*[:：]?\s*/i, '')
    .replace(/^\d+\s*set\s*[:：]?\s*/i, '')
    .trim();
  body = stripWinner(body, winner);

  const parts = body.split(/\s*(?:vs|VS)\s*/);
  if (parts.length < 2) return null;

  const left = clean(parts[0]);
  const right = clean(parts.slice(1).join(' vs '));

  function splitLeft(value) {
    const segs = value.replace(/[-–—]+/g, ' - ').split(/\s+-\s+/).map(clean).filter(Boolean);
    const last = segs.length ? segs.at(-1) : value;
    const tokens = last.split(/\s+/).filter(Boolean);
    const p1 = normPlayer(tokens.pop() || '');
    const prefix = clean([...segs.slice(0, -1), tokens.join(' ')].join(' '));
    return { p1, prefix };
  }

  function splitRight(value) {
    const segs = value.replace(/[-–—]+/g, ' - ').split(/\s+-\s+/).map(clean).filter(Boolean);
    if (segs.length >= 2) return { p2: normPlayer(segs[0]), suffix: clean(segs.slice(1).join(' ')) };
    const tokens = value.split(/\s+/).filter(Boolean);
    const p2 = normPlayer(tokens.shift() || '');
    return { p2, suffix: clean(tokens.join(' ')) };
  }

  const leftParts = splitLeft(left);
  const rightParts = splitRight(right);
  const rawGame = clean([leftParts.prefix, rightParts.suffix].filter(Boolean).join(' '));
  const game = normGame(rawGame, season);

  if (!game || (winner !== leftParts.p1 && winner !== rightParts.p2)) return null;
  return {
    player1: leftParts.p1,
    player2: rightParts.p2,
    winner,
    loser: winner === leftParts.p1 ? rightParts.p2 : leftParts.p1,
    game,
    rawGame,
    rawLine: line,
  };
}

function parseTeamHeader(raw, season) {
  let line = clean(raw.replace(/^>\s*/, '').replace(/^#+\s*/, ''));
  if (!/(?:vs|VS)/.test(line)) return null;
  if (/^\d+\s*(?:경기|경가|세트|set)/i.test(line)) return null;
  if (/\d+\s*[:：]\s*\d+\s*승리/.test(line)) return null;

  const inside = line.match(/\(([^()]*(?:vs|VS)[^()]*)\)/);
  if (inside) line = inside[1];
  line = line
    .replace(/^UPL\s*시즌\d+\s*(?:준결승전|결승전)\s*/, '')
    .replace(/^UPL\s*(?:준결승전|결승전)\s*/, '')
    .replace(/^플레이오프\s*\d+차전\s*/, '');

  const parts = line.split(/\s*(?:vs|VS)\s*/);
  if (parts.length < 2) return null;

  const team1 = normTeam(parts[0], season);
  const team2 = normTeam(parts.slice(1).join(' vs ').replace(/\([^)]*\)/g, '').replace(/\s*승(?:리)?\s*$/, ''), season);
  if (!team1 || !team2 || team1 === team2) return null;

  let winner = '';
  const match = raw.match(/\(([^()]*)\s*승(?:리)?\s*\)/);
  if (match && clean(match[1])) winner = normTeam(match[1], season);
  return { team1, team2, winner };
}

function detectTeamResult(raw, season) {
  const line = clean(raw.replace(/^>\s*/, '').replace(/[[\]]/g, ''));
  const match = line.match(/^(.+?)\s+\d+\s*[:：]\s*\d+\s*승리/);
  return match ? normTeam(match[1], season) : '';
}

function shortSeason(season) {
  return season.replace('Season', 'S');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pct(wins, games) {
  return games ? wins / games : 0;
}

const ELO_CONFIG = {
  k: 50,
  divisor: 1000,
  center: 1000,
  edgeMinInitial: 0,
  edgeMaxInitial: 2000,
  initialWeeks: 4,
};

function roundRating(value) {
  return Math.round(value * 10) / 10;
}

function roundPct(value) {
  return Math.round(value * 1000) / 1000;
}

function eloUnitKey(match) {
  if (match.week !== null) return `${match.seasonShort}-W${String(match.week).padStart(2, '0')}`;
  if (match.phase === '플레이오프') return `${match.seasonShort}-PO`;
  if (match.phase === '결승') return `${match.seasonShort}-F`;
  return `${match.seasonShort}-${match.source}`;
}

function eloUnitLabel(match) {
  if (match.week !== null) return `${match.seasonShort} W${match.week}`;
  return `${match.seasonShort} ${match.phase || match.source}`;
}

function eloUnitOrder(match) {
  const seasonNo = Number(match.season.match(/\d+/)[0]);
  const phaseRank = match.week !== null ? match.week : match.phase === '플레이오프' ? 900 : match.phase === '결승' ? 901 : 999;
  return seasonNo * 1000 + phaseRank;
}

function expectedScore(rating, opponentRating) {
  return 1 / (1 + (10 ** ((opponentRating - rating) / ELO_CONFIG.divisor)));
}

function initialRatingFromRecord(wins, losses) {
  if (!wins && !losses) return ELO_CONFIG.center;
  if (!wins) return ELO_CONFIG.edgeMinInitial;
  if (!losses) return ELO_CONFIG.edgeMaxInitial;
  return roundRating(ELO_CONFIG.center + (ELO_CONFIG.divisor * Math.log10(wins / losses)));
}

function buildEloAnalysis(allMatches, allPlayers) {
  const unitMap = new Map();
  for (const match of allMatches) {
    const key = eloUnitKey(match);
    if (!unitMap.has(key)) {
      unitMap.set(key, {
        key,
        label: eloUnitLabel(match),
        season: match.season,
        seasonShort: match.seasonShort,
        phase: match.phase,
        week: match.week,
        order: eloUnitOrder(match),
        matches: [],
      });
    }
    unitMap.get(key).matches.push(match);
  }
  const units = [...unitMap.values()].sort((a, b) => a.order - b.order);
  const unitByKey = new Map(units.map((unit) => [unit.key, unit]));

  const initial = new Map();
  for (const player of allPlayers) {
    const regularWeekKeys = unique(
      allMatches
        .filter((match) => match.week !== null && (match.player1 === player || match.player2 === player))
        .sort((a, b) => eloUnitOrder(a) - eloUnitOrder(b) || a.id - b.id)
        .map(eloUnitKey),
    ).slice(0, ELO_CONFIG.initialWeeks);

    const fallbackKeys = regularWeekKeys.length ? [] : unique(
      allMatches
        .filter((match) => match.player1 === player || match.player2 === player)
        .sort((a, b) => eloUnitOrder(a) - eloUnitOrder(b) || a.id - b.id)
        .map(eloUnitKey),
    ).slice(0, ELO_CONFIG.initialWeeks);

    const windowKeys = regularWeekKeys.length ? regularWeekKeys : fallbackKeys;
    const windowSet = new Set(windowKeys);
    const windowMatches = allMatches.filter((match) => (
      windowSet.has(eloUnitKey(match)) && (match.player1 === player || match.player2 === player)
    ));
    const wins = windowMatches.filter((match) => match.winner === player).length;
    const losses = windowMatches.length - wins;
    const rating = initialRatingFromRecord(wins, losses);
    const windowUnits = windowKeys.map((key) => unitByKey.get(key)).filter(Boolean);

    initial.set(player, {
      player,
      rating,
      wins,
      losses,
      games: wins + losses,
      winRate: pct(wins, wins + losses),
      units: windowUnits.map((unit) => unit.label),
      unitKeys: windowKeys,
      startUnit: windowUnits[0]?.label || '',
      readyUnit: windowUnits.at(-1)?.label || '',
      edgeCapped: (!wins && losses > 0) || (!losses && wins > 0),
    });
  }

  const ratings = new Map(allPlayers.map((player) => [player, initial.get(player)?.rating ?? ELO_CONFIG.center]));
  const timeline = Object.fromEntries(allPlayers.map((player) => [player, []]));
  const playerTotals = new Map(allPlayers.map((player) => [player, { matches: 0, wins: 0, losses: 0 }]));
  const matchRatings = [];
  const unitSummaries = [];

  for (const unit of units) {
    const deltas = new Map();
    const unitStats = new Map();
    const beforeRatings = new Map();

    for (const match of unit.matches) {
      const winnerBefore = ratings.get(match.winner) ?? ELO_CONFIG.center;
      const loserBefore = ratings.get(match.loser) ?? ELO_CONFIG.center;
      beforeRatings.set(match.winner, winnerBefore);
      beforeRatings.set(match.loser, loserBefore);

      const winnerExpected = expectedScore(winnerBefore, loserBefore);
      const loserExpected = 1 - winnerExpected;
      const winnerDelta = ELO_CONFIG.k * (1 - winnerExpected);
      const loserDelta = ELO_CONFIG.k * (0 - loserExpected);

      deltas.set(match.winner, (deltas.get(match.winner) || 0) + winnerDelta);
      deltas.set(match.loser, (deltas.get(match.loser) || 0) + loserDelta);

      for (const player of [match.winner, match.loser]) {
        if (!unitStats.has(player)) unitStats.set(player, { matches: 0, wins: 0, losses: 0 });
        unitStats.get(player).matches += 1;
      }
      unitStats.get(match.winner).wins += 1;
      unitStats.get(match.loser).losses += 1;

      matchRatings.push({
        matchId: match.id,
        unitKey: unit.key,
        unitLabel: unit.label,
        winner: match.winner,
        loser: match.loser,
        winnerBefore: roundRating(winnerBefore),
        loserBefore: roundRating(loserBefore),
        winnerExpected: roundPct(winnerExpected),
        loserExpected: roundPct(loserExpected),
        winnerDelta: roundRating(winnerDelta),
        loserDelta: roundRating(loserDelta),
      });
    }

    for (const [player, stats] of unitStats.entries()) {
      const before = beforeRatings.get(player) ?? ratings.get(player) ?? ELO_CONFIG.center;
      const delta = deltas.get(player) || 0;
      const after = before + delta;
      ratings.set(player, after);

      const total = playerTotals.get(player);
      total.matches += stats.matches;
      total.wins += stats.wins;
      total.losses += stats.losses;

      timeline[player].push({
        unitKey: unit.key,
        label: unit.label,
        seasonShort: unit.seasonShort,
        phase: unit.phase,
        week: unit.week,
        ratingBefore: roundRating(before),
        delta: roundRating(delta),
        ratingAfter: roundRating(after),
        matches: stats.matches,
        wins: stats.wins,
        losses: stats.losses,
      });
    }

    const unitDeltas = [...unitStats.keys()].map((player) => ({
      player,
      delta: deltas.get(player) || 0,
      ratingAfter: ratings.get(player),
    }));
    unitDeltas.sort((a, b) => b.delta - a.delta);
    unitSummaries.push({
      key: unit.key,
      label: unit.label,
      seasonShort: unit.seasonShort,
      phase: unit.phase,
      week: unit.week,
      matches: unit.matches.length,
      players: unitStats.size,
      biggestGain: unitDeltas[0] ? { player: unitDeltas[0].player, delta: roundRating(unitDeltas[0].delta) } : null,
      biggestLoss: unitDeltas.at(-1) ? { player: unitDeltas.at(-1).player, delta: roundRating(unitDeltas.at(-1).delta) } : null,
    });
  }

  const leaderboard = allPlayers.map((player) => {
    const start = initial.get(player);
    const rows = timeline[player];
    const ratingsForPlayer = [start.rating, ...rows.map((row) => row.ratingAfter)];
    const totals = playerTotals.get(player);
    return {
      player,
      rating: roundRating(ratings.get(player) ?? start.rating),
      initialRating: start.rating,
      change: roundRating((ratings.get(player) ?? start.rating) - start.rating),
      peakRating: roundRating(Math.max(...ratingsForPlayer)),
      lowRating: roundRating(Math.min(...ratingsForPlayer)),
      matches: totals.matches,
      wins: totals.wins,
      losses: totals.losses,
      winRate: pct(totals.wins, totals.matches),
      initialWins: start.wins,
      initialLosses: start.losses,
      initialWinRate: start.winRate,
      initialUnits: start.units,
      startUnit: start.startUnit,
      readyUnit: start.readyUnit,
      edgeCapped: start.edgeCapped,
    };
  }).sort((a, b) => b.rating - a.rating || b.peakRating - a.peakRating || a.player.localeCompare(b.player, 'ko'));

  leaderboard.forEach((row, index) => {
    row.rank = index + 1;
  });

  return {
    config: {
      ...ELO_CONFIG,
      initialFormula: '1000 + 1000 * log10(wins / losses)',
      updateMode: 'weekly simultaneous batch',
    },
    leaderboard,
    timeline,
    units: unitSummaries,
    matches: matchRatings,
  };
}

const seasons = (await fs.readdir(root, { withFileTypes: true }))
  .filter((dirent) => dirent.isDirectory() && /^Season\d+$/.test(dirent.name))
  .map((dirent) => dirent.name)
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const matches = [];
const adjustments = [];
const cancellations = [];
const issues = [];

for (const season of seasons) {
  const dir = path.join(root, season);
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.txt')).sort((a, b) => {
    const rank = (file) => (file.startsWith('Week') ? Number(file.match(/Week(\d+)/)[1]) : file === 'Playoff.txt' ? 100 : file === 'Final.txt' ? 101 : 999);
    return rank(a) - rank(b);
  });

  let current = { team1: '', team2: '', winner: '', matchNo: 0, startIndex: 0 };

  for (const file of files) {
    const text = await fs.readFile(path.join(dir, file), 'utf8');
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
      const raw = clean(lines[index]);
      if (!raw) continue;

      if (/경기취소/.test(raw)) {
        cancellations.push({ season, source: file, line: index + 1, rawLine: raw });
        continue;
      }

      const summary = raw.match(/^([^\s]+)\s+(\d+)승\s+(\d+)패$/);
      if (season === 'Season2' && file === 'Week10.txt' && summary) {
        adjustments.push({
          season,
          source: file,
          line: index + 1,
          player: normPlayer(summary[1]),
          wins: Number(summary[2]),
          losses: Number(summary[3]),
          rawLine: raw,
        });
        continue;
      }

      const parsed = parsePersonal(lines[index], season);
      if (parsed) {
        matches.push({
          id: matches.length + 1,
          season,
          seasonShort: shortSeason(season),
          phase: phaseFromFile(file),
          week: weekFromFile(file),
          source: file,
          line: index + 1,
          teamMatchNo: current.matchNo,
          team1: current.team1,
          team2: current.team2,
          teamWinner: current.winner,
          player1: parsed.player1,
          player2: parsed.player2,
          game: parsed.game,
          winner: parsed.winner,
          loser: parsed.loser,
          winnerTeam: parsed.winner === parsed.player1 ? current.team1 : current.team2,
          loserTeam: parsed.winner === parsed.player1 ? current.team2 : current.team1,
          rawGame: parsed.rawGame,
          rawLine: parsed.rawLine,
        });
        continue;
      }

      const header = parseTeamHeader(raw, season);
      if (header) {
        current = { ...header, matchNo: current.matchNo + 1, startIndex: matches.length };
        continue;
      }

      const teamWinner = detectTeamResult(raw, season);
      if (teamWinner && current.matchNo) {
        current.winner = teamWinner;
        for (let matchIndex = current.startIndex; matchIndex < matches.length; matchIndex++) {
          matches[matchIndex].teamWinner = teamWinner;
        }
      }
    }
  }
}

const players = unique([
  ...matches.flatMap((match) => [match.player1, match.player2]),
  ...adjustments.map((adjustment) => adjustment.player),
]).sort((a, b) => a.localeCompare(b, 'ko'));

const games = unique(matches.map((match) => match.game)).sort((a, b) => a.localeCompare(b, 'ko'));

const playerSummary = players.map((player) => {
  const detailed = matches.filter((match) => match.player1 === player || match.player2 === player);
  const adjusted = adjustments.filter((adjustment) => adjustment.player === player);
  const adjustedWins = adjusted.reduce((sum, item) => sum + item.wins, 0);
  const adjustedLosses = adjusted.reduce((sum, item) => sum + item.losses, 0);
  const wins = detailed.filter((match) => match.winner === player).length + adjustedWins;
  const losses = detailed.length - detailed.filter((match) => match.winner === player).length + adjustedLosses;
  return {
    player,
    games: wins + losses,
    wins,
    losses,
    winRate: pct(wins, wins + losses),
    detailedGames: detailed.length,
    adjustedGames: adjustedWins + adjustedLosses,
    seasons: unique([...detailed.map((match) => match.seasonShort), ...adjusted.map((adjustment) => shortSeason(adjustment.season))]),
    teams: unique(detailed.flatMap((match) => [
      match.player1 === player ? match.team1 : '',
      match.player2 === player ? match.team2 : '',
    ])),
    gameTypes: unique(detailed.map((match) => match.game)).length,
  };
}).sort((a, b) => b.wins - a.wins || b.games - a.games || a.player.localeCompare(b.player, 'ko'));

const seasonSummary = seasons.map((season) => {
  const detailed = matches.filter((match) => match.season === season);
  const adjusted = adjustments.filter((adjustment) => adjustment.season === season);
  return {
    season,
    seasonShort: shortSeason(season),
    matches: detailed.length,
    adjustedMatches: adjusted.reduce((sum, item) => sum + item.wins, 0),
    players: unique([...detailed.flatMap((match) => [match.player1, match.player2]), ...adjusted.map((item) => item.player)]).length,
    games: unique(detailed.map((match) => match.game)).length,
  };
});

const elo = buildEloAnalysis(matches, players);

const payload = {
  generatedAt: new Date().toISOString(),
  meta: {
    matches: matches.length,
    adjustedMatches: adjustments.reduce((sum, item) => sum + item.wins, 0),
    players: players.length,
    games: games.length,
    seasons: seasons.map(shortSeason),
    elo: {
      k: elo.config.k,
      divisor: elo.config.divisor,
      center: elo.config.center,
      initialWeeks: elo.config.initialWeeks,
    },
    note: 'Season2 Week10 adjustments are included only in total player records.',
  },
  players,
  games,
  playerSummary,
  seasonSummary,
  elo,
  matches,
  adjustments,
  cancellations,
  issues,
  aliases: {
    players: Object.fromEntries(playerAlias),
    games: {
      '인포Q, 인디언포커Q': '인디언 포커 Q',
      '인디언홀덤Q': '인디언 홀덤 Q',
      '실흑': '실퍼의 흑과백',
      '5탑': '5개의 탑',
      '넘4': '넘버 4',
      '숫야': '숫자야구',
      '데레2': '데스 레이스 2',
      '배흑': '배수 흑과백',
      '시흑': '시드 흑과백',
      '다코': '다빈치코드',
      '베가, 베가보, 베팅가위보': '베팅 가위바위보',
      '연승게임': '연승게임리뉴얼',
      '흑과백 Season1': '흑과백 1',
      '흑과백 Season2+': '흑과백 2',
    },
  },
};

await fs.mkdir(`${outDir}/assets`, { recursive: true });
await fs.writeFile(`${outDir}/assets/upl-data.json`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await fs.writeFile(`${outDir}/assets/upl-data.js`, `window.UPL_DATA = ${JSON.stringify(payload)};\n`, 'utf8');
console.log(JSON.stringify(payload.meta, null, 2));
