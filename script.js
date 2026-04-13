const STORAGE_KEY = 'taskflow_tasks_v1';

  let tasks = loadTasks();
  let editingId = null;
  let filters = { priority: ['all'], date: ['all'], search: '' };

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
          allBox.checked = true;
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

  function loadTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: crypto.randomUUID(),
        title: 'Design landing page',
        description: 'Create a modern section with CTA and mobile friendly layout.',
        userId: 'AB001',
        priority: 'high',
        dueDate: todayString(),
        status: 'doing',
        createdAt: todayString()
      },
      {
        id: crypto.randomUUID(),
        title: 'Prepare weekly report',
        description: 'Summarize progress, blockers, and next steps.',
        userId: 'CD002',
        priority: 'medium',
        dueDate: addDays(2),
        status: 'todo',
        createdAt: todayString()
      },
      {
        id: crypto.randomUUID(),
        title: 'Review UI feedback',
        description: 'Check comments and refine spacing, colors, and states.',
        userId: 'EF003',
        priority: 'low',
        dueDate: addDays(-1),
        status: 'done',
        createdAt: todayString()
      }
    ];
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

  function saveFromQuickForm() {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Please enter a task title.');
      return;
    }

    const userId = userIdInput.value.trim().toUpperCase();
    if (userId.length !== 5) {
      alert('Please enter a User ID with exactly 5 characters.');
      return;
    }

    const payload = {
      title,
      description: descInput.value.trim(),
      userId,
      priority: priorityInput.value,
      dueDate: dueDateInput.value || todayString()
    };

    if (editingId) {
      tasks = tasks.map((t) => t.id === editingId ? { ...t, ...payload } : t);
    } else {
      tasks.unshift({
        id: crypto.randomUUID(),
        ...payload,
        status: 'todo',
        createdAt: todayString()
      });
    }

    saveToStorage();
    resetQuickForm();
    renderTasks();
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter((t) => t.id !== id);
    saveToStorage();
    renderTasks();
  }

  function toggleStatus(id) {
    tasks = tasks.map((t) => {
      if (t.id !== id) return t;
      const next = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
      return { ...t, status: next };
    });
    saveToStorage();
    renderTasks();
  }

  function editTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingId = id;
    titleInput.value = task.title;
    descInput.value = task.description || '';
    userIdInput.value = task.userId || '';
    priorityInput.value = task.priority;
    dueDateInput.value = task.dueDate || todayString();
    addBtn.textContent = 'Update Task';
    editStrip.style.display = 'flex';
    titleInput.focus();
  }

  function changeTaskStatus(id, status) {
    tasks = tasks.map((t) => t.id === id ? { ...t, status } : t);
    saveToStorage();
    renderTasks();
  }

  function getPriorityLabel(priority) {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  function formatDate(value) {
    if (!value) return 'No date';
    return new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
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
                  <button class="status-option" type="button" data-action="status-option" data-value="todo">TODO</button>
                  <button class="status-option" type="button" data-action="status-option" data-value="doing">DOING</button>
                  <button class="status-option" type="button" data-action="status-option" data-value="done">DONE</button>
                </div>
              </div>
            </div>
          </div>
          <div class="meta">
            <span class="badge ${priorityClass}">${task.priority.toUpperCase()}</span>
            <span class="badge user-badge">User ID: ${escapeHtml(task.userId || 'N/A')}</span>
            <span class="badge ${overdue ? 'overdue' : ''}">${overdue ? 'OVERDUE' : formatDate(task.dueDate)}</span>
            <span class="badge created-badge">Added ${formatDate(task.createdAt || today)}</span>
            <span class="badge status-badge">${task.status.toUpperCase()}</span>
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
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            changeTaskStatus(task.id, btn.dataset.value);
            statusDropdown.classList.remove('open');
          });
        });

        el.querySelector('[data-action="edit"]').addEventListener('click', () => editTask(task.id));
        el.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));
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

  dueDateInput.value = todayString();
  renderTasks();
