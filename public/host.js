const socket = io();
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

$('createRoomBtn').addEventListener('click', () => {
  socket.emit('host:createRoom');
});

socket.on('host:roomCreated', ({ code }) => {
  $('setup').classList.add('hidden');
  $('lobby').classList.remove('hidden');
  $('roomCode').textContent = code;
});

socket.on('host:playersUpdate', (players) => {
  $('playerList').innerHTML = players
    .map((p) => `<li>${escapeHtml(p.name)}</li>`)
    .join('');
});

$('startBtn').addEventListener('click', () => {
  socket.emit('host:startGame');
});

socket.on('host:error', ({ message }) => alert(message));

socket.on('game:question', ({ index, total, question, options }) => {
  $('lobby').classList.add('hidden');
  $('resultArea').classList.add('hidden');
  $('gameArea').classList.remove('hidden');
  $('questionCounter').textContent = `Вопрос ${index + 1} из ${total}`;
  $('questionText').textContent = question;
  $('optionsList').innerHTML = options
    .map((o, i) => `<li>${String.fromCharCode(65 + i)}. ${escapeHtml(o)}</li>`)
    .join('');
  $('answerCount').textContent = '';
});

socket.on('host:answerCount', (count) => {
  $('answerCount').textContent = `Ответили: ${count}`;
});

socket.on('game:questionResult', ({ leaderboard }) => {
  $('gameArea').classList.add('hidden');
  $('resultArea').classList.remove('hidden');
  $('leaderboard').innerHTML = leaderboard
    .map((p) => `<li>${escapeHtml(p.name)} — ${p.score}</li>`)
    .join('');
});

socket.on('game:over', ({ leaderboard }) => {
  $('resultArea').classList.add('hidden');
  $('finalArea').classList.remove('hidden');
  $('finalLeaderboard').innerHTML = leaderboard
    .map((p) => `<li>${escapeHtml(p.name)} — ${p.score}</li>`)
    .join('');
});

socket.on('room:hostLeft', () => {
  alert('Ведущий покинул комнату');
});
