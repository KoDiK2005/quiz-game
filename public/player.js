const socket = io();
const $ = (id) => document.getElementById(id);
let myAnswered = false;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

$('joinBtn').addEventListener('click', () => {
  const name = $('nameInput').value;
  const code = $('codeInput').value;
  if (!name.trim() || !code.trim()) {
    $('joinError').textContent = 'Введите имя и код комнаты';
    return;
  }
  $('joinError').textContent = '';
  socket.emit('player:joinRoom', { code, name });
});

socket.on('player:joined', () => {
  $('joinForm').classList.add('hidden');
  $('waitingArea').classList.remove('hidden');
});

socket.on('player:joinError', ({ message }) => {
  $('joinError').textContent = message;
});

socket.on('game:question', ({ index, total, question, options }) => {
  myAnswered = false;
  $('waitingArea').classList.add('hidden');
  $('resultArea').classList.add('hidden');
  $('questionArea').classList.remove('hidden');
  $('answeredMsg').classList.add('hidden');
  $('questionCounter').textContent = `Вопрос ${index + 1} из ${total}`;
  $('questionText').textContent = question;

  const container = $('optionsButtons');
  container.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
    btn.addEventListener('click', () => {
      if (myAnswered) return;
      myAnswered = true;
      socket.emit('player:submitAnswer', { answerIndex: i });
    });
    container.appendChild(btn);
  });
});

socket.on('player:answerReceived', () => {
  $('answeredMsg').classList.remove('hidden');
});

socket.on('game:questionResult', ({ leaderboard }) => {
  $('questionArea').classList.add('hidden');
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
