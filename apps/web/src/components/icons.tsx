/** Hairline icons, 16px grid, `currentColor`, one stroke weight throughout. */

type Props = { className?: string }

function Svg({ className = 'h-3.5 w-3.5', children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconPlus = (p: Props) => (
  <Svg {...p}>
    <path d="M8 3.4v9.2M3.4 8h9.2" />
  </Svg>
)

export const IconMinus = (p: Props) => (
  <Svg {...p}>
    <path d="M3.4 8h9.2" />
  </Svg>
)

/** frame everything — four corner brackets, no enclosing box */
export const IconFrame = (p: Props) => (
  <Svg {...p}>
    <path d="M2.4 5.4v-2a1 1 0 0 1 1-1h2M13.6 5.4v-2a1 1 0 0 0-1-1h-2M2.4 10.6v2a1 1 0 0 0 1 1h2M13.6 10.6v2a1 1 0 0 1-1 1h-2" />
  </Svg>
)

export const IconRewind = (p: Props) => (
  <Svg {...p}>
    <path d="M2.6 8a5.4 5.4 0 1 0 1.7-3.95" />
    <path d="M2.4 2.6v3.2h3.2" />
  </Svg>
)

export const IconImport = (p: Props) => (
  <Svg {...p}>
    <path d="M8 2.4v7.2M5.4 7l2.6 2.6L10.6 7" />
    <path d="M2.6 11.4v1.2a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-1.2" />
  </Svg>
)

export const IconClose = (p: Props) => (
  <Svg {...p}>
    <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
  </Svg>
)

/** swap two ends — used to flip a relation's direction of reading */
export const IconSwap = (p: Props) => (
  <Svg {...p}>
    <path d="M3.4 6.2h9.2M10.2 3.8l2.4 2.4-2.4 2.4" />
    <path d="M12.6 9.8H3.4M5.8 7.4l-2.4 2.4 2.4 2.4" />
  </Svg>
)

export const IconTrash = (p: Props) => (
  <Svg {...p}>
    <path d="M2.8 4.4h10.4M6.4 4.4V3.2a.8.8 0 0 1 .8-.8h1.6a.8.8 0 0 1 .8.8v1.2" />
    <path d="M4.2 4.4l.6 8.2a1 1 0 0 0 1 .8h4.4a1 1 0 0 0 1-.8l.6-8.2" />
  </Svg>
)

/** a right/left arrow, sized for inline use in the inspector rows */
export const IconArrow = ({ direction = 'right', className = 'h-3 w-3' }: Props & { direction?: 'left' | 'right' }) => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    style={direction === 'left' ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path d="M2.4 6h7.2M6.8 3.2L9.6 6l-2.8 2.8" />
  </svg>
)

/** the lamp to switch to: a sun when the board is dark, a moon when it is light */
export const IconSun = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="3.1" />
    <path d="M8 1.4v1.9M8 12.7v1.9M14.6 8h-1.9M3.3 8H1.4M12.7 3.3l-1.3 1.3M4.6 11.4l-1.3 1.3M12.7 12.7l-1.3-1.3M4.6 4.6L3.3 3.3" />
  </Svg>
)

export const IconMoon = (p: Props) => (
  <Svg {...p}>
    <path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.8 5.8 0 1 0 7 7Z" />
  </Svg>
)

