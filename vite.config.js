import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Runs the files in /api as real serverless handlers during `vite dev`,
 * so the leaderboard works locally exactly like it does on Vercel.
 */
function serverlessApiDev() {
  return {
    name: 'flappy-serverless-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '/'
        if (!url.startsWith('/api/')) return next()
        const pathname = url.split('?')[0].split('#')[0]
        const name = pathname.slice('/api/'.length).replace(/\.js$/, '')
        if (!/^[a-z0-9-]+$/i.test(name)) return next()
        try {
          const file = fileURLToPath(new URL(`./api/${name}.js`, import.meta.url))
          const mod = await import(/* @vite-ignore */ `file://${file}?t=${Date.now()}`)
          if (typeof mod.default !== 'function') return next()
          await mod.default(req, res)
        } catch (err) {
          console.error('[api]', err)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal server error' }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serverlessApiDev()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // the sandbox preview is served from *.e2b.app
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: ['.e2b.app'] },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
})
