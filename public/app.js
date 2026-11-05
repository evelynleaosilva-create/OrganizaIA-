const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'organizaia-local-v1';
let state = { tasks: [], messages: [] };
try { state = { ...state, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch {}
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function switchView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `${view}-view`));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#page-title').textContent = view === 'chat' ? 'Oi! Por onde começamos?' : 'Seu planejamento, no seu ritmo.';
  if (view === 'tasks') renderTasks();
}
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
$('#go-chat').addEventListener('click', () => switchView('chat'));

function renderTasks() {
  const list = $('#task-list'); list.innerHTML = '';
  state.tasks.forEach(task => {
    const row = document.createElement('label'); row.className = `task-item ${task.done ? 'done' : ''}`;
    row.innerHTML = `<input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Marcar tarefa como concluída"><span>${escapeHtml(task.text)}</span><button class="delete-task" type="button" aria-label="Excluir tarefa">×</button>`;
    row.querySelector('input').addEventListener('change', e => { task.done = e.target.checked; save(); renderTasks(); });
    row.querySelector('button').addEventListener('click', () => { state.tasks = state.tasks.filter(t => t.id !== task.id); save(); renderTasks(); });
    list.appendChild(row);
  });
  const done = state.tasks.filter(t => t.done).length;
  $('#progress-count').textContent = `${done}/${state.tasks.length}`;
  $('#progress-bar').style.width = state.tasks.length ? `${done / state.tasks.length * 100}%` : '0%';
  $('#empty-state').style.display = state.tasks.length ? 'none' : 'block';
}
function addTask(text) {
  const clean = text.trim(); if (!clean) return;
  state.tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text: clean, done: false });
  save(); renderTasks();
}
$('#task-form').addEventListener('submit', e => { e.preventDefault(); addTask($('#task-input').value); $('#task-input').value = ''; });

const chatBox = $('#chat-messages');
function addMessage(role, content, allowAdd = false) {
  const el = document.createElement('div'); el.className = `message ${role}`;
  const safe = escapeHtml(content).replace(/\n/g, '<br>');
  el.innerHTML = `<div class="avatar">${role === 'assistant' ? '✦' : '•'}</div><div class="bubble"><div>${safe}</div>${allowAdd ? '<button class="add-plan" type="button">＋ Adicionar esta sugestão ao planejamento</button>' : ''}</div>`;
  if (allowAdd) el.querySelector('.add-plan').addEventListener('click', () => { addTask(content.length > 180 ? content.slice(0,177) + '…' : content); switchView('tasks'); });
  chatBox.appendChild(el); chatBox.scrollTop = chatBox.scrollHeight;
}
function restoreChat() {
  state.messages.forEach(m => addMessage(m.role, m.content, m.role === 'assistant'));
}
restoreChat();

async function sendMessage(text) {
  const clean = text.trim(); if (!clean) return;
  $('#suggestions').style.display = 'none';
  state.messages.push({ role: 'user', content: clean }); save(); addMessage('user', clean);
  $('#send-btn').disabled = true; $('#send-btn').textContent = '…';
  const loading = document.createElement('div'); loading.className = 'message assistant'; loading.innerHTML = '<div class="avatar">✦</div><div class="bubble">Pensando em um próximo passo possível…</div>'; chatBox.appendChild(loading); chatBox.scrollTop = chatBox.scrollHeight;
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: state.messages }) });
    const data = await response.json(); loading.remove();
    if (!response.ok) throw new Error(data.error || 'Erro ao conectar com a IA.');
    state.messages.push({ role: 'assistant', content: data.reply }); state.messages = state.messages.slice(-12); save(); addMessage('assistant', data.reply, true);
  } catch (err) {
    loading.remove(); addMessage('assistant', `Não consegui responder agora. ${err.message} Você ainda pode adicionar tarefas manualmente no seu planejamento.`);
  } finally { $('#send-btn').disabled = false; $('#send-btn').textContent = '↑'; }
}
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); const input = $('#chat-input'); const text = input.value; input.value = ''; sendMessage(text); });
document.querySelectorAll('.suggestion').forEach(btn => btn.addEventListener('click', () => sendMessage(btn.textContent)));
$('#clear-data').addEventListener('click', () => {
  if (!confirm('Isso apagará as conversas e tarefas salvas neste dispositivo. Deseja continuar?')) return;
  state = { tasks: [], messages: [] }; save(); chatBox.innerHTML = '<div class="message assistant"><div class="avatar">✦</div><div class="bubble"><p>Oi! Eu sou o OrganizaIA. 💜</p><p>Podemos começar de novo, no seu ritmo. O que você gostaria de organizar?</p></div></div>';
  $('#suggestions').style.display = 'flex'; renderTasks(); switchView('chat');
});
renderTasks();
