/** Short, readable, collision-free enough for a client-side canvas. */
export function uid(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${random}`
}

/** `7` -> `"07"`, so the number printed on a card stays two columns wide. */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
