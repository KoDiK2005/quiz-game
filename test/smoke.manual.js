/* Manual end-to-end smoke test (not run by `npm test`).
 * Boots the real server, connects a host + a player via socket.io-client,
 * plays through one question, and asserts the room flow works.
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

player.on('game:question', ({ question, options }) => {
  console.log('Got question:', question, options);
  player.emit('player:submitAnswer', { answerIndex: 0 });
});

player.on('game:questionResult', ({ leaderboard }) => {
  console.log('Round result, leaderboard:', leaderboard);
  console.log('PASS: full host/player/question/score round-trip works');
  process.exit(0);
});

setTimeout(() => fail('timed out waiting for full round-trip'), 10000);
