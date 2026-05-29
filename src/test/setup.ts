import '@testing-library/jest-dom'

// Minimal chrome API stub — only what the tested modules use
const storage: Record<string, unknown> = {}

global.chrome = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: storage[key] }),
      set: async (obj: Record<string, unknown>) => { Object.assign(storage, obj) },
    },
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
    sendMessage: async () => ({}),
    onMessage: { addListener: () => {} },
  },
  tabs: {
    query: async () => [],
    create: async () => ({}),
    captureVisibleTab: async () => 'data:image/png;base64,abc',
  },
  scripting: {
    executeScript: async () => [],
  },
} as unknown as typeof chrome

// Reset storage between tests
beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k])
})
