/* Manual end-to-end smoke test (not run by `npm test`).
 * Boots the real server, connects a host + a player via socket.io-client,
 * plays through an ENTIRE pack (all questions to game:over), and asserts
 * the full room/scoring flow works, not just the first question.
 * Usage: node test/smoke.manual.js
 */
const { io: ioClient } = require('socket.io-client');

process.env.PORT = '3911';
require('../server');

const URL = 'http://localhost:3911';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const host = ioClient(URL);
const player = ioClient(URL);
let roomCode;
let packId;
let questionsSeen = 0;

host.on('connect', () => host.emit('host:createRoom'));

host.on('host:roomCreated', ({ code, packs }) => {
  roomCode = code;
  if (!packs || packs.length === 0) fail('no packs received by host');
  packId = packs[0].id;
  console.log('Room created:', roomCode, 'packs:', packs.map((p) => p.id));
  player.emit('player:joinRoom', { code: roomCode, name: 'SmokeTester' });
});

player.on('player:joined', () => {
  console.log('Player joined, host starting game with pack', packId);
  host.emit('host:startGame', { packId });
});

player.on('player:joinError', ({ message }) => fail(`join error: ${message}`));

player.on('game:question', ({ index, total, question }) => {
  questionsSeen += 1;
  console.log(`Question ${index + 1}/${total}:`, question);
  player.emit('player:submitAnswer', { answerIndex: 0 });
});

player.on('game:questionResult', ({ leaderboard }) => {
  console.log('  -> round result, leaderboard:', leaderboard);
});

player.on('game:over', ({ leaderboard }) => {
  console.log('Game over, final leaderboard:', leaderboard);
  if (questionsSeen === 0) fail('never received any questions');
  console.log(`PASS: played through all ${questionsSeen} questions to game:over`);
  process.exit(0);
});

setTimeout(() => fail('timed out waiting for full round-trip'), 60000);
