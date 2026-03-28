const createStorage = () => {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
    removeItem(key) {
      store.delete(String(key))
    },
    clear() {
      store.clear()
    },
    key(index) {
      return [...store.keys()][index] || null
    },
    get length() {
      return store.size
    },
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorage()
}
