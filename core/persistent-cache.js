export function createPersistentCache(key, { ttl = 8000 } = {}) {
  let memoryData = null;
  let lastFetch = 0;
  let lastError = null;

  function readStorage() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeStorage(payload) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
  }

  function isFresh(timestamp) {
    return Date.now() - timestamp < ttl;
  }

  function get() {
    if (memoryData !== null && isFresh(lastFetch)) {
      return memoryData;
    }

    const stored = readStorage();
    if (!stored) return null;

    if (isFresh(stored.lastFetch)) {
      memoryData = stored.data;
      lastFetch = stored.lastFetch;
      return stored.data;
    }

    return null;
  }

  function getRaw() {
    if (memoryData !== null) return memoryData;

    const stored = readStorage();
    if (!stored) return null;

    memoryData = stored.data;
    lastFetch = stored.lastFetch || 0;
    return stored.data;
  }

  function set(data) {
    memoryData = data;
    lastFetch = Date.now();
    lastError = null;

    writeStorage({
      data,
      lastFetch,
    });
  }

  function setError(error) {
    lastError = error;
  }

  function getError() {
    return lastError;
  }

  function clear() {
    memoryData = null;
    lastFetch = 0;
    lastError = null;

    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  function isExpired() {
    return Date.now() - lastFetch >= ttl;
  }

  return {
    get,
    getRaw,
    set,
    clear,
    isExpired,
    setError,
    getError,
  };
}