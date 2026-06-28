const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { generateRoomCode, calculatePoints, buildLeaderboard } = require('./lib/gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PACKS_DIR = path.join(__dirname, 'packs');
const packs = {};
for (const file of fs.readdirSync(PACKS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const id = file.replace(/\.json$/, '');
  packs[id] = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, file), 'utf-8'));
}
const packList = Object.entries(packs).map(([id, pack]) => ({
  id,
  topic: pack.topic,
  count: pack.questions.length,
}));

const QUESTION_TIME_MS = 15000;
const NEXT_QUESTION_DELAY_MS = 4000;

const rooms = {};

function getLeaderboard(room) {
  return buildLeaderboard(room.players);
}

function nextQuestion(code) {
  const room = rooms[code];
  if (!room) return;
  room.questionIndex += 1;
  room.answers = {};

  if (room.questionIndex >= room.questions.length) {
    io.to(code).emit('game:over', { leaderboard: getLeaderboard(room) });
    room.started = false;
    return;
  }

  const q = room.questions[room.questionIndex];
  room.questionStartedAt = Date.now();
  io.to(code).emit('game:question', {
    index: room.questionIndex,
    total: room.questions.length,
    question: q.question,
    options: q.options,
    timeLimitMs: QUESTION_TIME_MS,
  });
  room.timer = setTimeout(() => finishQuestion(code), QUESTION_TIME_MS);
}

function finishQuestion(code) {
  const room = rooms[code];
  if (!room) return;
  clearTimeout(room.timer);

  const q = room.questions[room.questionIndex];
  for (const [id, player] of Object.entries(room.players)) {
    const ans = room.answers[id];
    if (ans && ans.answerIndex === q.correctIndex) {
      player.score += calculatePoints(ans.elapsed, QUESTION_TIME_MS);
    }
  }

  io.to(code).emit('game:questionResult', {
    correctIndex: q.correctIndex,
    leaderboard: getLeaderboard(room),
  });

  room.nextTimer = setTimeout(() => nextQuestion(code), NEXT_QUESTION_DELAY_MS);
}

io.on('connection', (socket) => {
  socket.on('host:createRoom', () => {
    const code = generateRoomCode((c) => Boolean(rooms[c]));
    rooms[code] = {
      hostId: socket.id,
      players: {},
      questionIndex: -1,
      answers: {},
      started: false,
      timer: null,
      nextTimer: null,
      questions: [],
    };
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = 'host';
    socket.emit('host:roomCreated', { code, packs: packList });
  });

  socket.on('player:joinRoom', ({ code, name }) => {
    const roomCode = (code || '').toUpperCase().trim();
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('player:joinError', { message: 'Комната не найдена' });
      return;
    }
    if (room.started) {
      socket.emit('player:joinError', { message: 'Игра уже началась' });
      return;
    }
    const playerName = (name || 'Игрок').trim().slice(0, 16) || 'Игрок';

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.role = 'player';
    socket.data.name = playerName;
    room.players[socket.id] = { name: playerName, score: 0 };

    socket.emit('player:joined', { code: roomCode, name: playerName });
    io.to(room.hostId).emit('host:playersUpdate', getLeaderboard(room));
  });

  socket.on('host:startGame', ({ packId }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;
    if (Object.keys(room.players).length === 0) {
      socket.emit('host:error', { message: 'Нет игроков в комнате' });
      return;
    }
    const pack = packs[packId];
    if (!pack) {
      socket.emit('host:error', { message: 'Выберите тему викторины' });
      return;
    }
    room.questions = pack.questions;
    room.started = true;
    nextQuestion(code);
  });

  socket.on('player:submitAnswer', ({ answerIndex }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.questionIndex < 0) return;
    if (room.answers[socket.id] !== undefined) return;

    const elapsed = Date.now() - room.questionStartedAt;
    room.answers[socket.id] = { answerIndex, elapsed };
    socket.emit('player:answerReceived');
    io.to(room.hostId).emit('host:answerCount', Object.keys(room.answers).length);

    if (Object.keys(room.answers).length === Object.keys(room.players).length) {
      finishQuestion(code);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    if (socket.data.role === 'host') {
      io.to(code).emit('room:hostLeft');
      clearTimeout(room.timer);
      clearTimeout(room.nextTimer);
      delete rooms[code];
    } else if (socket.data.role === 'player') {
      delete room.players[socket.id];
      delete room.answers[socket.id];
      io.to(room.hostId).emit('host:playersUpdate', getLeaderboard(room));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quiz game server running on http://localhost:${PORT}`);
});
