export function cleanupLegacyCanvas() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem('idea-flow.canvas.v1')
  } catch {
    // ignore storage errors
  }
}
