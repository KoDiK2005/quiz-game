const { generateRoomCode, calculatePoints, buildLeaderboard, ROOM_CODE_CHARS } = require('../lib/gameLogic');

describe('generateRoomCode', () => {
  test('returns a 4-character code from the allowed alphabet', () => {
    const code = generateRoomCode(() => false);
    expect(code).toHaveLength(4);
    expect(code.split('').every((c) => ROOM_CODE_CHARS.includes(c))).toBe(true);
  });

  test('respects a custom length', () => {
    const code = generateRoomCode(() => false, 6);
    expect(code).toHaveLength(6);
  });

  test('retries until isTaken returns false', () => {
    let calls = 0;
    const isTaken = () => {
      calls += 1;
      return calls < 3;
    };
    const code = generateRoomCode(isTaken);
    expect(calls).toBe(3);
    expect(code).toHaveLength(4);
  });
});

describe('calculatePoints', () => {
  test('awards max points for an instant correct answer', () => {
    expect(calculatePoints(0, 15000)).toBe(20);
  });

  test('awards base points for an answer at the time limit', () => {
    expect(calculatePoints(15000, 15000)).toBe(10);
  });

  test('awards a partial bonus for a mid-speed answer', () => {
    expect(calculatePoints(7500, 15000)).toBe(15);
  });

  test('falls back to base points for an out-of-range elapsed time', () => {
    expect(calculatePoints(-5, 15000)).toBe(10);
    expect(calculatePoints(20000, 15000)).toBe(10);
  });
});

describe('buildLeaderboard', () => {
  test('sorts players by score descending', () => {
    const players = {
      a: { name: 'Alice', score: 30 },
      b: { name: 'Bob', score: 50 },
      c: { name: 'Cara', score: 10 },
    };
    expect(buildLeaderboard(players)).toEqual([
      { name: 'Bob', score: 50 },
      { name: 'Alice', score: 30 },
      { name: 'Cara', score: 10 },
    ]);
  });

  test('returns an empty array for no players', () => {
    expect(buildLeaderboard({})).toEqual([]);
  });
});
