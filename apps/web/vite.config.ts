import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const STARTED_AT = new Date().toISOString()

/** Body returned by `GET /health` on the dev/preview server. */
function healthBody(mode: string): string {
  return JSON.stringify({
    status: 'ok',
    service: 'idea-flow-web',
    mode,
    startedAt: STARTED_AT,
  })
}

/**
 * `GET /health` on the dev server.
 *
 * The api answers `/health` (compose healthcheck + the "stack is ready" signal
 * described in infra/README.md) and the prod nginx config answers `/healthz`.
 * This plugin gives the dev server the same shape, so `curl :5173/health`
 * behaves like `curl :3000/health` while the frontend is smoke tested on its
 * own. Dev/preview only: in prod the static server owns /healthz.
 */
function healthEndpoint(): Plugin {
  const middleware: Connect.NextHandleFunction = (_req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(healthBody('development'))
  }

  return {
    name: 'idea-flow:health',
    configureServer(server) {
      server.middlewares.use('/health', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/health', middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), healthEndpoint()],

  server: {
    // containers must be reachable from outside, so never 127.0.0.1
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      // node_modules lives in a named volume (compose), which some file
      // watchers either miss or, worse, rescan on every save
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },

  build: {
    outDir: 'dist',
    target: 'es2022',
    // source maps are denied by nginx in prod anyway, and a public map hands
    // the whole graph logic to anyone who asks
    sourcemap: false,
    rollupOptions: {
      output: {
        /**
         * The canvas engine and React barely change between deploys, so they
         * are split out: the app chunk can be replaced on every release while
         * the browser keeps the parts it already has.
         *
         * `@xyflow` is matched before `react` on purpose — the package name
         * contains the word.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@xyflow') || id.includes('zustand')) return 'flow'
          if (id.includes('react')) return 'react'
          return undefined
        },
      },
    },
  },
})
