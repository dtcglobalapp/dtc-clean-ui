export function setupAutoRefresh({
  onRefresh,
  cooldownMs = 1200,
  isReady = () => true,
  isBusy = () => false,
}) {
  let lastRefreshAt = 0;

  async function maybeRefresh() {
    if (!isReady()) return;
    if (isBusy()) return;

    const now = Date.now();
    if (now - lastRefreshAt < cooldownMs) return;

    lastRefreshAt = now;
    await onRefresh();
  }

  window.addEventListener("pageshow", () => {
    maybeRefresh();
  });

  window.addEventListener("focus", () => {
    maybeRefresh();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      maybeRefresh();
    }
  });

  return {
    trigger: maybeRefresh,
    markRefreshedNow() {
      lastRefreshAt = Date.now();
    },
  };
}