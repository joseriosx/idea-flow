const HINTS: { keys: string[]; text: string }[] = [
  { keys: ['double-click'], text: 'rename' },
  { keys: ['drag'], text: 'between the dots to relate' },
  { keys: ['shift'], text: 'inverts a new line' },
  { keys: ['del'], text: 'remove what is selected' },
]

/** The shortcuts the rest of the chrome does not have room to explain. */
export function HintBar() {
  return (
    <div
      className="anim-rise absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 md:block"
      style={{ animationDelay: '540ms' }}
    >
      <div className="hud flex items-center gap-2.5 rounded-full px-3.5 py-2">
        {HINTS.map((hint, index) => (
          <span key={hint.text} className="flex items-center gap-2.5">
            {index > 0 && <span className="h-2.5 w-px bg-divider" />}
            <span className="flex items-center gap-1.5">
              {hint.keys.map((key) => (
                <span key={key} className="kbd">
                  {key}
                </span>
              ))}
              <span className="text-[10.5px] font-normal text-fg-dim">{hint.text}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
