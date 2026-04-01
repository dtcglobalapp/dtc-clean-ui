export function createCache({ ttl = 5000 } = {}) {
  let data = null;
  let lastFetch = 0;
  let lastError = null;

  function isValid() {
    return data !== null && (Date.now() - lastFetch < ttl);
  }

  function isExpired() {
    return Date.now() - lastFetch >= ttl;
  }

  function get() {
    return isValid() ? data : null;
  }

  function getRaw() {
    return data;
  }

  function set(newData) {
    data = newData;
    lastFetch = Date.now();
    lastError = null;
  }

  function setError(error) {
    lastError = error;
  }

  function getError() {
    return lastError;
  }

  function clear() {
    data = null;
    lastFetch = 0;
    lastError = null;
  }

  return {
    get,
    getRaw,
    set,
    clear,
    isValid,
    isExpired,
    setError,
    getError,
  };
}