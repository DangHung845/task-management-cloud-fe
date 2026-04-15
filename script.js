import { getTasks, createTask, updateTask, deleteTask } from './api.js';

let tasks = [];
let editingId = null;
let filters = { priority: ['all'], date: ['all'], search: '' };

const STORAGE_FALLBACK_KEY = 'taskflow_tasks_backup_v1';

const taskList = document.getElementById('taskList');
const filterSummary = document.getElementById('filterSummary');
const totalCount = document.getElementById('totalCount');
const dueSoonCount = document.getElementById('dueSoonCount');
const highCount = document.getElementById('highCount');
const doneCount = document.getElementById('doneCount');

const titleInput = document.getElementById('quickTitle');
const descInput = document.getElementById('quickDescription');
const userIdInput = document.getElementById('quickUserId');
const priorityInput = document.getElementById('quickPriority');
const dueDateInput = document.getElementById('quickDueDate');
const searchInput = document.getElementById('searchInput');
const addBtn = document.getElementById('quickAddTopBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editStrip = document.getElementById('editStrip');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

addBtn.addEventListener('click', saveFromQuickForm);
cancelEditBtn.addEventListener('click', resetQuickForm);
clearFiltersBtn.addEventListener('click', resetAllFilters);
searchInput.addEventListener('input', (e) => {
  filters.search = e.target.value.trim().toLowerCase();
  renderTasks();
});

setupCheckboxGroup('priorityChips', 'priority');
setupCheckboxGroup('dateChips', 'date');

dueDateInput.value = todayString();
init();

async function init() {
  try {
    tasks = await getTasks();
    saveBackup(tasks);
  } catch (err) {
    console.error('Failed to load from API, using local backup if available.', err);
    tasks = loadBackup();
  }
  renderTasks();
}

function setupCheckboxGroup(groupId, key) {
  const group = document.getElementById(groupId);
  group.addEventListener('change', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

    const values = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);

    if (target.value === 'all' && target.checked) {
      group.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        if (el.value !== 'all') el.checked = false;
      });
      filters[key] = ['all'];
    } else if (target.value !== 'all' && target.checked) {
      const allBox = group.querySelector('input[value="all"]');
      if (allBox) allBox.checked = false;
      filters[key] = values.filter((v) => v !== 'all');
      if (filters[key].length === 0) {
        if (allBox) allBox.checked = true;
        filters[key] = ['all'];
      }
    } else {
      const checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
      if (checked.length === 0) {
        const allBox = group.querySelector('input[value="all"]');
        if (allBox) allBox.checked = true;
        filters[key] = ['all'];
      } else if (checked.includes('all')) {
        filters[key] = ['all'];
      } else {
        filters[key] = checked;
      }
    }

    if (filters[key].length > 1 && filters[key].includes('all')) {
      filters[key] = filters[key].filter((v) => v !== 'all');
    }
    renderTasks();
  });
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function loadBackup() {
  try {
    const saved = localStorage.getItem(STORAGE_FALLBACK_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveBackup(list) {
  try {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage failures.
  }
}

function resetQuickForm() {
  editingId = null;
  titleInput.value = '';
  descInput.value = '';
  userIdInput.value = '';
  priorityInput.value = 'medium';
  dueDateInput.value = todayString();
  addBtn.textContent = '+ Add Task';
  editStrip.style.display = 'none';
}

function resetAllFilters() {
  filters = { priority: ['all'], date: ['all'], search: '' };
  searchInput.value = '';
  ['priorityChips', 'dateChips'].forEach((groupId) => {
    const group = document.getElementById(groupId);
    group.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = el.value === 'all';
    });
  });
  renderTasks();
}

async function saveFromQuickForm() {
  const title = titleInput.value.trim();
  if (!title) {
    alert('Please enter a task title.');
    return;
  }

  const userId = userIdInput.value.trim();
  if (!userId) {
    alert('Please enter a User ID.');
    return;
  }

  const payload = {
    title,
    description: descInput.value.trim(),
    userId,
    priority: priorityInput.value,
    dueDate: dueDateInput.value || todayString(),
    status: editingId ? (tasks.find((t) => t.id === editingId)?.status || 'pending') : 'pending',
    createdAt: editingId ? (tasks.find((t) => t.id === editingId)?.createdAt || todayString()) : todayString()
  };

  try {
    if (editingId) {
      const current = tasks.find((t) => t.id === editingId) || null;
      await updateTask(editingId, payload, current);
    } else {
      await createTask(payload);
    }

    await refreshTasks();
    resetQuickForm();
  } catch (err) {
    console.error(err);
    alert('Không lưu được task. Hãy kiểm tra backend/API.');
  }
}

async function refreshTasks() {
  try {
    tasks = await getTasks();
    saveBackup(tasks);
  } catch (err) {
    console.error('Refresh from API failed, keeping current list.', err);
  }
  renderTasks();
}

async function deleteTaskById(id) {
  if (!confirm('Delete this task?')) return;

  try {
    await deleteTask(id);
    await refreshTasks();
  } catch (err) {
    console.error(err);
    alert('Không xoá được task.');
  }
}

async function toggleStatus(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const next = task.status === 'pending' ? 'doing' : task.status === 'doing' ? 'done' : 'pending';
  await changeTaskStatus(id, next);
}

async function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  editingId = id;
  titleInput.value = task.title;
  descInput.value = task.description || '';
  userIdInput.value = task.userId || '';
  priorityInput.value = task.priority || 'medium';
  dueDateInput.value = task.dueDate || todayString();
  addBtn.textContent = 'Update Task';
  editStrip.style.display = 'flex';
  titleInput.focus();
}

async function changeTaskStatus(id, status) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  try {
    await updateTask(id, { ...task, status }, task);
    await refreshTasks();
  } catch (err) {
    console.error(err);
    alert('Không đổi được trạng thái.');
  }
}

function getPriorityLabel(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function isSameDay(a, b) {
  return a === b;
}

function isWithinWeek(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  const diff = (date - new Date(now.toISOString().split('T')[0] + 'T00:00:00')) / 86400000;
  return diff >= 0 && diff <= 7;
}

function priorityRank(p) {
  return p === 'high' ? 3 : p === 'medium' ? 2 : 1;
}

function getFilteredTasks() {
  const today = todayString();
  return tasks.filter((task) => {
    const matchesSearch = !filters.search || task.title.toLowerCase().includes(filters.search) || (task.description || '').toLowerCase().includes(filters.search);

    const priorityAll = filters.priority.includes('all');
    const dateAll = filters.date.includes('all');
    const matchesPriority = priorityAll || filters.priority.includes(task.priority);

    let matchesDate = true;
    if (!dateAll) {
      matchesDate = filters.date.some((item) => {
        if (item === 'overdue') return task.dueDate && task.dueDate < today && task.status !== 'done';
        if (item === 'today') return isSameDay(task.dueDate, today);
        if (item === 'week') return task.dueDate ? isWithinWeek(task.dueDate) : false;
        return false;
      });
    }

    return matchesSearch && matchesPriority && matchesDate;
  }).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || new Date(a.dueDate) - new Date(b.dueDate));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function closeAllPriorityMenus(except = null) {
  document.querySelectorAll('[data-status-dropdown].open').forEach((dd) => {
    if (dd !== except) dd.classList.remove('open');
  });
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';
  const today = todayString();

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <div class="empty">
        <h3 style="margin-bottom:8px;">No tasks found</h3>
        <p>Try changing the filters or create a new task.</p>
      </div>
    `;
  } else {
    filtered.forEach((task) => {
      const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
      const priorityClass = task.priority === 'high' ? 'pri-high' : task.priority === 'medium' ? 'pri-med' : 'pri-low';
      const containerClass = task.priority === 'high' ? 'top-priority' : task.priority === 'medium' ? 'medium-priority' : 'low-priority';

      const el = document.createElement('article');
      el.className = `task ${containerClass}`;
      el.innerHTML = `
        <div class="task-head">
          <div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-desc">${escapeHtml(task.description || 'No description added yet.')}</div>
          </div>
          <div class="task-priority-wrap">
            <div class="priority-dropdown" data-status-dropdown>
              <button class="priority-toggle" type="button" data-action="toggle-status" aria-label="Quick change status">
                <span class="priority-arrow">▼</span>
              </button>
              <div class="priority-menu" role="menu">
                <button class="status-option" type="button" data-action="status-option" data-value="pending">PENDING</button>
                <button class="status-option" type="button" data-action="status-option" data-value="doing">DOING</button>
                <button class="status-option" type="button" data-action="status-option" data-value="done">DONE</button>
              </div>
            </div>
          </div>
        </div>
        <div class="meta">
          <span class="badge ${priorityClass}">${getPriorityLabel(task.priority).toUpperCase()}</span>
          <span class="badge user-badge">User ID: ${escapeHtml(task.userId || 'N/A')}</span>
          <span class="badge ${overdue ? 'overdue' : ''}">${overdue ? 'OVERDUE' : formatDate(task.dueDate)}</span>
          <span class="badge created-badge">Added ${formatDate(task.createdAt || today)}</span>
          <span class="badge status-badge">${escapeHtml((task.status || 'pending').toUpperCase())}</span>
        </div>
        <div class="task-footer">
          <button class="btn ghost" data-action="edit">Edit</button>
          <button class="btn danger" data-action="delete">Delete</button>
        </div>
      `;

      const statusDropdown = el.querySelector('[data-status-dropdown]');
      const statusToggle = el.querySelector('[data-action="toggle-status"]');
      const statusButtons = el.querySelectorAll('[data-action="status-option"]');

      statusToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (statusDropdown.classList.contains('open')) {
          statusDropdown.classList.remove('open');
        } else {
          closeAllPriorityMenus(statusDropdown);
          statusDropdown.classList.add('open');
        }
      });

      statusButtons.forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await changeTaskStatus(task.id, btn.dataset.value);
          statusDropdown.classList.remove('open');
        });
      });

      el.querySelector('[data-action="edit"]').addEventListener('click', () => editTask(task.id));
      el.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTaskById(task.id));
      taskList.appendChild(el);
    });
  }

  totalCount.textContent = tasks.length;
  dueSoonCount.textContent = tasks.filter((t) => t.dueDate && isWithinWeek(t.dueDate) && t.status !== 'done').length;
  highCount.textContent = tasks.filter((t) => t.priority === 'high').length;
  doneCount.textContent = tasks.filter((t) => t.status === 'done').length;

  const parts = [];
  if (!filters.priority.includes('all')) parts.push(`Priority: ${filters.priority.join(', ')}`);
  if (!filters.date.includes('all')) parts.push(`Date: ${filters.date.join(', ')}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  filterSummary.textContent = parts.length ? parts.join(' • ') : 'Showing all tasks';
}

document.addEventListener('click', () => closeAllPriorityMenus());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPriorityMenus();
});
