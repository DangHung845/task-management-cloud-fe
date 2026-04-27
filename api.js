const API_BASE = 'https://sqdh3muj59.execute-api.us-east-1.amazonaws.com/prod/tasks';

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function toApiDate(value) {
  if (!value) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.tasks)) return data.tasks;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;

  // Object-map fallback: { "id1": {...}, "id2": {...} }
  return Object.values(data).filter((value) => value && typeof value === 'object');
}

function unwrapSingle(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.item && typeof data.item === 'object') return data.item;
  if (data.task && typeof data.task === 'object') return data.task;
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
}

export function normalizeTask(task) {
  return {
    id: task.taskId ?? task.id,
    title: task.title ?? '',
    description: task.description ?? '',
    userId: task.userId ?? '',
    priority: task.priority ?? 'medium',
    dueDate: toInputDate(task.dueDate),
    createdAt: toInputDate(task.createdAt),
    status: task.status ?? 'pending'
  };
}

export function toApiTask(task, current = null) {
  return {
    title: task.title ?? '',
    description: task.description ?? '',
    userId: task.userId ?? '',
    priority: task.priority ?? 'medium',
    dueDate: toApiDate(task.dueDate),
    createdAt: task.createdAt ? toApiDate(task.createdAt) : (current?.createdAt ? toApiDate(current.createdAt) : new Date().toISOString()),
    status: task.status ?? current?.status ?? 'pending'
  };
}

export async function getTasks() {
  const data = await request(API_BASE);
  return extractItems(data).map(normalizeTask);
}

export async function createTask(task) {
  const data = await request(API_BASE, {
    method: 'POST',
    body: JSON.stringify(toApiTask(task))
  });
  const item = unwrapSingle(data);
  return item && typeof item === 'object' ? normalizeTask(item) : item;
}

export async function updateTask(id, task, current = null) {
  const data = await request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(toApiTask(task, current))
  });
  const item = unwrapSingle(data);
  return item && typeof item === 'object' ? normalizeTask(item) : item;
}

export async function deleteTask(id) {
  return request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function changeTaskStatus(id, status) {
  const data = await request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });

  return data && typeof data === 'object'
    ? normalizeTask(data.item ?? data.task ?? data)
    : data;
}
