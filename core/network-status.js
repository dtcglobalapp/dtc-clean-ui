export function isOnline() {
  return navigator.onLine;
}

export function watchNetworkStatus({ onOnline, onOffline }) {
  window.addEventListener("online", () => {
    onOnline?.();
  });

  window.addEventListener("offline", () => {
    onOffline?.();
  });
}