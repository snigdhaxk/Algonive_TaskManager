// ==============================
//  Taskorbit — script.js
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
  setInterval(checkDeadlines, 60000);
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
  try {
    localStorage.setItem('taskorbit_tasks', JSON.stringify(tasks));
  } catch (e) {
    showToast('Could not save — storage full.', 'danger');
  }
}

function loadTasks() {
  const stored = localStorage.getItem('taskorbit_tasks')
    || localStorage.getItem('algonive_tasks');
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
  setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay.classList.contains('hidden')) saveTask();
  }
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
    flashInput('taskDate', 'Set a due date!');
    return;
  }

  if (editingId !== null) {
    tasks = tasks.map(t => t.id === editingId
      ? { ...t, title, description: desc, dueDate, priority }
      : t
    );
    showToast('Task updated', 'info');
  } else {
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
    showToast('Task added', 'success');
  }

  saveTasks();
  renderTasks();
  closeModal();
  checkDeadlines();
}

function flashInput(id, msg) {
  const el = document.getElementById(id);
  const prev = el.placeholder;
  el.style.borderColor = '#ff4d6d';
  el.placeholder = msg;
  el.focus();
  setTimeout(() => {
    el.style.borderColor = '';
    el.placeholder = prev;
  }, 2200);
}

// ---------- Delete ----------
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  showToast('Task deleted', 'danger');
}

function confirmDelete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (confirm(`Delete "${task.title}"?`)) deleteTask(id);
}

// ---------- Toggle Complete ----------
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveTasks();
  renderTasks();
  showToast(task.completed ? 'Marked incomplete' : 'Task completed! 🎉', task.completed ? 'info' : 'success');
}

// ---------- Filter ----------
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const titles = { all: 'All Tasks', active: 'Active Tasks', completed: 'Completed', overdue: 'Overdue' };
  document.getElementById('headerTitle').textContent = titles[filter];
  renderTasks();
}

// ---------- Deadline Helpers ----------
function getDaysLeft(dueDateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDateStr); due.setHours(0,0,0,0);
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
  if (task.completed) return `<span class="due-badge done">✓ Done</span>`;
  const days = getDaysLeft(task.dueDate);
  const label = formatDueDate(task.dueDate);
  if (days < 0)   return `<span class="due-badge overdue">⚠ ${Math.abs(days)}d overdue</span>`;
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
  const banner = document.getElementById('reminderBanner');
  if (urgent.length === 0) {
    banner.classList.add('hidden');
    return;
  }
  const overdueCount = urgent.filter(t => isOverdue(t)).length;
  const soonCount    = urgent.filter(t => isSoon(t) && !isOverdue(t)).length;
  let msg = '';
  if (overdueCount) msg += `${overdueCount} task${overdueCount > 1 ? 's' : ''} overdue. `;
  if (soonCount)    msg += `${soonCount} task${soonCount > 1 ? 's' : ''} due within 2 days.`;
  document.getElementById('reminderText').textContent = msg;
  banner.classList.remove('hidden');
}

// ---------- Update Counts ----------
function updateCounts() {
  const all       = tasks.length;
  const active    = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t =>  t.completed).length;
  const overdue   = tasks.filter(t => isOverdue(t)).length;

  document.getElementById('count-all').textContent       = all;
  document.getElementById('count-active').textContent    = active;
  document.getElementById('count-completed').textContent = completed;
  document.getElementById('count-overdue').textContent   = overdue;

  const pct = all === 0 ? 0 : Math.round((completed / all) * 100);
  document.getElementById('progressFill').style.width    = pct + '%';
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('stat-done').textContent       = completed;
  document.getElementById('stat-left').textContent       = active;
}

// ---------- Sort ----------
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function sortTasks(arr) {
  const sort = document.getElementById('sortSelect')?.value || 'dueDate';
  return [...arr].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return  1;
    switch (sort) {
      case 'priority': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case 'created':  return new Date(b.createdAt) - new Date(a.createdAt);
      case 'title':    return a.title.localeCompare(b.title);
      default:         return new Date(a.dueDate) - new Date(b.dueDate);
    }
  });
}

// ---------- Render ----------
function renderTasks() {
  updateCounts();

  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();

  let filtered;
  switch (currentFilter) {
    case 'active':    filtered = tasks.filter(t => !t.completed); break;
    case 'completed': filtered = tasks.filter(t =>  t.completed); break;
    case 'overdue':   filtered = tasks.filter(t => isOverdue(t)); break;
    default:          filtered = [...tasks];
  }

  if (query) {
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }

  filtered = sortTasks(filtered);

  const grid  = document.getElementById('taskGrid');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = filtered.map((task, i) => `
    <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue-card' : ''}"
         style="animation-delay: ${i * 0.04}s">
      <div class="card-top">
        <div class="card-title">${escapeHTML(task.title)}</div>
      </div>
      ${task.description ? `<div class="card-desc">${escapeHTML(task.description)}</div>` : ''}
      <div class="card-meta">
        ${dueBadgeHTML(task)}
        <span class="priority-tag ${task.priority}">${task.priority}</span>
      </div>
      <div class="card-actions">
        <button class="btn-check" onclick="toggleComplete(${task.id})">${task.completed ? '↩ Undo' : '✓ Done'}</button>
        <button class="btn-edit"  onclick="openModal(${task.id})">✎ Edit</button>
        <button class="btn-del"   onclick="confirmDelete(${task.id})">✕ Del</button>
      </div>
    </div>
  `).join('');
}

// ---------- Toast ----------
function showToast(msg, type = 'info') {
  const icons = { success: '✓', danger: '✕', info: '✦' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '•'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ---------- XSS Protection ----------
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
