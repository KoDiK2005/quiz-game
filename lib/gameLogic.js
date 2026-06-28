const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRoomCode(isTaken, length = 4) {
  let code;
  do {
    code = Array.from(
      { length },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('');
  } while (isTaken(code));
  return code;
}

function calculatePoints(elapsedMs, timeLimitMs) {
  if (elapsedMs < 0 || elapsedMs > timeLimitMs) {
    return 10;
  }
  const speedBonus = Math.max(0, 1 - elapsedMs / timeLimitMs);
  return Math.round(10 + speedBonus * 10);
}

function buildLeaderboard(players) {
  return Object.values(players)
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { generateRoomCode, calculatePoints, buildLeaderboard, ROOM_CODE_CHARS };
