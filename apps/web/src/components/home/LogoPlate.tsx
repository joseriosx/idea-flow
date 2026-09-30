import logo from '../../assets/logo-512.png'

/* ==========================================================================
   The mark, on paper

   The source file is 512px of dark ink on a *baked-in white* background — no
   alpha channel — so it cannot simply be dropped onto a near-black board
   without becoming a glaring white square. The fix is not to strip the
   background (that is the artwork's ground, not an accident) but to give it one:
   the plate is white in both themes, which is the material the app already uses
   for its cards, and the logo's own #fdfdfd ground disappears into it. The mark
   then reads as a print pinned to the board rather than a picture floating in
   it, and it is legible under either lamp without a second asset.
   ========================================================================== */

export function LogoPlate({ size = 88 }: { size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[1.125rem] border border-card-line bg-white shadow-lift-lg"
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt="Idea Flow"
        width={512}
        height={512}
        // the mark is a poster, not a lazy image: it is the first thing painted
        decoding="sync"
        // an <img> is draggable by default, and dragging the masthead would
        // select the wordmark next to it
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </div>
  )
}
