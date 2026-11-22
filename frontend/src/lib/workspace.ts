export const DEMO_PATH = '/demo'
const RETURN_PATH = 'attune:demo:return'
export const MOCK_STORAGE_KEY = 'attune:mock:v1'
export const LOCAL_STORAGE_KEY = 'attune:local:v1'
export const TOUR_STORAGE_KEY = 'attune:demo:tour:v1'

const isDemoPath = (path: string) => path === DEMO_PATH || path.startsWith(DEMO_PATH + '/')
export const isDemoWorkspace = isDemoPath(window.location.pathname)

// The same app loads under /demo, but its data lives in this tab's sessionStorage.
export function workspaceStorage(): Storage {
  return isDemoWorkspace ? window.sessionStorage : window.localStorage
}

export function openTour() {
  try {
    if (!isDemoWorkspace) {
      const { pathname, search, hash } = window.location
      sessionStorage.setItem(RETURN_PATH, pathname + search + hash)
    }
    for (const key of [MOCK_STORAGE_KEY, LOCAL_STORAGE_KEY, TOUR_STORAGE_KEY]) {
      sessionStorage.removeItem(key)
    }
  } catch { /* the demo can run in memory when storage is blocked */ }
  if (isDemoWorkspace) window.location.replace(DEMO_PATH)
  else window.location.assign(DEMO_PATH)
}

export function leaveTour() {
  let path = '/'
  try {
    const saved = sessionStorage.getItem(RETURN_PATH)
    const origin = window.location.origin
    const url = new URL(saved ?? '/', origin)
    if (url.origin === origin && !isDemoPath(url.pathname)) {
      path = url.pathname + url.search + url.hash
    }
  } catch { /* return to the dashboard if the saved route is unavailable */ }
  window.location.replace(path)
}
