// ==============================
//  TaskFlow — script.js
//  Algonive Web Dev Task 1
// ==============================

// ---------- State ----------
let tasks = [];
let currentFilter = 'all';
let editingId = null;

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  setHeaderDate();
  loadTasks();
  renderTasks();
  checkDeadlines();
});

// ---------- Date Header ----------
function setHeaderDate() {
  const el = document.getElementById('headerDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ---------- Local Storage ----------
function saveTasks() {
  localStorage.setItem('algonive_tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem('algonive_tasks');
  tasks = stored ? JSON.parse(stored) : [];
}

// ---------- Modal ----------
function openModal(id = null) {
  editingId = id;
  const overlay = document.getElementById('modalOverlay');
  const title   = document.getElementById('modalTitle');

  if (id !== null) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    title.textContent = 'Edit Task';
    document.getElementById('taskTitle').value    = t.title;
    document.getElementById('taskDesc').value     = t.description;
    document.getElementById('taskDate').value     = t.dueDate;
    document.getElementById('taskPriority').value = t.priority;
  } else {
    title.textContent = 'New Task';
    document.getElementById('taskTitle').value    = '';
    document.getElementById('taskDesc').value     = '';
    document.getElementById('taskDate').value     = '';
    document.getElementById('taskPriority').value = 'medium';
  }

  overlay.classList.remove('hidden');
  document.getElementById('taskTitle').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ---------- Save Task ----------
function saveTask() {
  const title    = document.getElementById('taskTitle').value.trim();
  const desc     = document.getElementById('taskDesc').value.trim();
  const dueDate  = document.getElementById('taskDate').value;
  const priority = document.getElementById('taskPriority').value;

  if (!title) {
    flashInput('taskTitle', 'Title is required!');
    return;
  }
  if (!dueDate) {
    flashInput('taskDate', 'Please set a due date!');
    return;
  }

  if (editingId !== null) {
    // Edit existing
    tasks = tasks.map(t => t.id === editingId
      ? { ...t, title, description: desc, dueDate, priority }
      : t
    );
  } else {
    // Add new
    const newTask = {
      id: Date.now(),
      title,
      description: desc,
      dueDate,
      priority,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
  }

  saveTasks();
  renderTasks();
  closeModal();
}

function flashInput(id, msg) {
  const el = document.getElementById(id);
  el.style.borderColor = '#ff4d6d';
  el.placeholder = msg;
  setTimeout(() => {
    el.style.borderColor = '';
    el.placeholder = id === 'taskTitle'
      ? 'e.g. Complete project report'
      : '';
  }, 2000);
}

// ---------- Delete ----------
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

// ---------- Toggle Complete ----------
function toggleComplete(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveTasks();
  renderTasks();
}

// ---------- Filter ----------
function setFilter(filter, btn) {
  currentFilter = filter;

  // Update active button
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Update header title
  const titles = { all: 'All Tasks', active: 'Active Tasks', completed: 'Completed', overdue: 'Overdue' };
  document.getElementById('headerTitle').textContent = titles[filter];

  renderTasks();
}

// ---------- Deadline Helpers ----------
function getDaysLeft(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function isOverdue(task) {
  return !task.completed && getDaysLeft(task.dueDate) < 0;
}

function isSoon(task) {
  const d = getDaysLeft(task.dueDate);
  return !task.completed && d >= 0 && d <= 2;
}

function dueBadgeHTML(task) {
  if (task.completed) {
    return `<span class="due-badge done">✓ Done</span>`;
  }
  const days = getDaysLeft(task.dueDate);
  const label = formatDueDate(task.dueDate);
  if (days < 0)  return `<span class="due-badge overdue">⚠ ${Math.abs(days)}d overdue</span>`;
  if (days === 0) return `<span class="due-badge soon">Due Today!</span>`;
  if (days === 1) return `<span class="due-badge soon">Due Tomorrow</span>`;
  if (days <= 2)  return `<span class="due-badge soon">Due in ${days}d</span>`;
  return `<span class="due-badge">📅 ${label}</span>`;
}

function formatDueDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- Deadline Reminder Banner ----------
function checkDeadlines() {
  const urgent = tasks.filter(t => !t.completed && (isSoon(t) || isOverdue(t)));
  if (urgent.length === 0) return;

  const overdueCount = urgent.filter(t => isOverdue(t)).length;
  const soonCount    = urgent.filter(t => isSoon(t) && !isOverdue(t)).length;

  let msg = '⚠ ';
  if (overdueCount) msg += `${overdueCount} task${overdueCount > 1 ? 's are' : ' is'} overdue. `;
  if (soonCount)    msg += `${soonCount} task${soonCount > 1 ? 's are' : ' is'} due within 2 days.`;

  document.getElementById('reminderText').textContent = msg;
  document.getElementById('reminderBanner').classList.remove('hidden');
}

// ---------- Update Badges (sidebar counts) ----------
function updateCounts() {
  const today = new Date(); today.setHours(0,0,0,0);

  const all       = tasks.length;
  const active    = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t =>  t.completed).length;
  const overdue   = tasks.filter(t => isOverdue(t)).length;

  document.getElementById('count-all').textContent       = all;
  document.getElementById('count-active').textContent    = active;
  document.getElementById('count-completed').textContent = completed;
  document.getElementById('count-overdue').textContent   = overdue;

  // Progress bar
  const pct = all === 0 ? 0 : Math.round((completed / all) * 100);
  document.getElementById('progressFill').style.width   = pct + '%';
  document.getElementById('progressPercent').textContent = pct + '%';
}

// ---------- Render ----------
function renderTasks() {
  updateCounts();

  let filtered;
  switch (currentFilter) {
    case 'active':    filtered = tasks.filter(t => !t.completed); break;
    case 'completed': filtered = tasks.filter(t =>  t.completed); break;
    case 'overdue':   filtered = tasks.filter(t => isOverdue(t)); break;
    default:          filtered = [...tasks];
  }

  // Sort: overdue first, then by dueDate
  filtered.sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return  1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const grid  = document.getElementById('taskGrid');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = filtered.map(task => `
    <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue-card' : ''}">
      <div class="card-top">
        <div class="card-title">${escapeHTML(task.title)}</div>
      </div>

      ${task.description
        ? `<div class="card-desc">${escapeHTML(task.description)}</div>`
        : ''}

      <div class="card-meta">
        ${dueBadgeHTML(task)}
        <span class="priority-tag ${task.priority}">${task.priority}</span>
      </div>

      <div class="card-actions">
        <button class="btn-check" onclick="toggleComplete(${task.id})">
          ${task.completed ? '↩ Undo' : '✓ Done'}
        </button>
        <button class="btn-edit" onclick="openModal(${task.id})">✎ Edit</button>
        <button class="btn-del"  onclick="confirmDelete(${task.id})">✕ Del</button>
      </div>
    </div>
  `).join('');
}

// ---------- Confirm Delete ----------
function confirmDelete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (confirm(`Delete "${task.title}"?`)) deleteTask(id);
}

// ---------- XSS protection ----------
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}