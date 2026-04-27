const API_BASE = 'https://sqdh3muj59.execute-api.us-east-1.amazonaws.com/prod/tasks'

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
  if (!Array.isArray(data)) return [];
  return data.map(normalizeTask);
}

export async function createTask(task) {
  const data = await request(API_BASE, {
    method: 'POST',
    body: JSON.stringify(toApiTask(task))
  });
  return data && typeof data === 'object' ? normalizeTask(data) : data;
}

export async function updateTask(id, task, current = null) {
  const data = await request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(toApiTask(task, current))
  });
  return data && typeof data === 'object' ? normalizeTask(data) : data;
}

export async function deleteTask(id) {
  return request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
