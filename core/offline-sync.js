import { getOfflineQueue, removeOfflineAction } from "./offline-queue.js";
import { isOnline } from "./network-status.js";

export async function syncOfflineQueue({ handlers = {} }) {
  if (!isOnline()) return;

  const queue = getOfflineQueue();

  for (const item of queue) {
    const handler = handlers[item.type];
    if (!handler) continue;

    try {
      await handler(item.payload);
      removeOfflineAction(item.id);
    } catch (error) {
      console.error("Offline sync failed:", item.type, error);
    }
  }
}