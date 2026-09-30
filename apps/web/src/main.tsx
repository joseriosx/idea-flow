import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* fonts are bundled through the build, so the app never waits on a third party
   CDN — and works the same behind a locked-down network. Helvetica itself is
   declared with @font-face in styles.css, which lets Vite fingerprint and
   hash the four faces. Only Geist Mono is imported here, and only for the
   keyboard-key chips, where a fixed advance is the point. */
import '@fontsource-variable/geist-mono'

import '@xyflow/react/dist/style.css'
import './styles.css'

import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
