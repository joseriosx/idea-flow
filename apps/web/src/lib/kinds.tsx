import type { LinkKind, NodeKind } from '../types'

/* ==========================================================================
   Kind metadata — one place that owns a kind's colour, wording and glyph, so
   the card, the rail, the inspector, the legend and the edges can never drift
   apart.

   The accents are literal hex on purpose: they are handed to SVG markers, whose
   `defs` do not reliably inherit custom properties. `--color-idea`,
   `--color-question` and `--color-evidence` in styles.css are the same three
   values for the chrome.
   ========================================================================== */

/** `#f0873c` + alpha -> `rgb(240 135 60 / 0.2)`, so no rgba() is hand-written. */
export function withAlpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`
}

export type KindMeta = {
  /** singular label, used on the card and in the rail */
  label: string
  /** what the card is, in five words or fewer */
  blurb: string
  /** the accent, and a transparent wash of it */
  color: string
  wash: string
  /** single key that creates this kind */
  key: string
}

export const KIND_META: Record<NodeKind, KindMeta> = {
  idea: {
    label: 'Idea',
    blurb: 'a claim worth chasing',
    color: '#f0873c',
    wash: withAlpha('#f0873c', 0.16),
    key: 'I',
  },
  question: {
    label: 'Question',
    blurb: 'something still unproven',
    color: '#8b7bf7',
    wash: withAlpha('#8b7bf7', 0.16),
    key: 'Q',
  },
  evidence: {
    label: 'Evidence',
    blurb: 'something actually observed',
    color: '#3fbfa0',
    wash: withAlpha('#3fbfa0', 0.16),
    key: 'E',
  },
}

export type LinkMeta = {
  label: string
  /** how the label reads when drawn on the line */
  phrase: string
  color: string
  wash: string
  /** dashed edges read as inference, solid ones as observation */
  dashed: boolean
  /** shown in the legend so the arrow direction is never a guess */
  hint: string
}

export const LINK_META: Record<LinkKind, LinkMeta> = {
  supports: {
    label: 'Supports',
    phrase: 'supports',
    color: '#3fbfa0',
    wash: withAlpha('#3fbfa0', 0.16),
    dashed: false,
    hint: 'this backs that',
  },
  derives: {
    label: 'Derives from',
    phrase: 'derives from',
    color: '#8b7bf7',
    wash: withAlpha('#8b7bf7', 0.16),
    dashed: true,
    hint: 'this grew out of that',
  },
}

/* ==========================================================================
   Glyphs — 16px, drawn with `currentColor`, one visual weight across all of
   them so the rail, the card and the inspector read as the same family.
   ========================================================================== */

export function KindGlyph({ kind, className = 'h-3.5 w-3.5' }: { kind: NodeKind; className?: string }) {
  if (kind === 'idea') {
    // a four point sparkle
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
        <path d="M8 0.6c.36 3.34 1.3 4.3 4.7 4.7-3.4.36-4.34 1.36-4.7 4.7C7.64 6.66 6.7 5.7 3.3 5.3 6.7 4.94 7.64 3.94 8 0.6Z" />
        <path d="M13 10.4c.19 1.55.6 1.98 2.2 2.2-1.6.19-2.01.64-2.2 2.2-.2-1.56-.6-2.01-2.2-2.2 1.6-.22 2-1.01 2.2-2.2Z" />
      </svg>
    )
  }

  if (kind === 'question') {
    // an open question mark, drawn rather than typeset
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <path
          d="M4.9 6.1a3.1 3.1 0 1 1 4.35 3.6c-.62.3-.95.85-.95 1.55v.35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8.3" cy="13.6" r="0.95" fill="currentColor" />
      </svg>
    )
  }

  // evidence: a small sourced sheet
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M3.4 1.9h5.2l4 4v8.2a.6.6 0 0 1-.6.6H3.4a.6.6 0 0 1-.6-.6V2.5a.6.6 0 0 1 .6-.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8.5 2v3.6h3.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.3 8.7h5.2M5.3 11.2h3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
