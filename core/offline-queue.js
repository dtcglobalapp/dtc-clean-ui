const STORAGE_KEY = "dtc-offline-queue";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function addOfflineAction(action) {
  const queue = readQueue();

  queue.push({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...action,
  });

  writeQueue(queue);
}

export function getOfflineQueue() {
  return readQueue();
}

export function clearOfflineQueue() {
  writeQueue([]);
}

export function removeOfflineAction(id) {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
}