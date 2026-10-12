require('dotenv').config()

const cors = require('cors')
const express = require('express')
const multer = require('multer')
const { requireAdmin, requireUser } = require('./auth')

const app = express()

// Hosts such as Render sit behind a proxy; this keeps client IPs correct for rate limiting
app.set('trust proxy', 1)
app.disable('x-powered-by')

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, ''))
app.use(cors({ origin: origins, exposedHeaders: ['Content-Disposition'] }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/admin', requireUser, requireAdmin, require('./routes/admin'))
app.use('/api', requireUser, require('./routes/receipts'))

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE'
    return res.status(400).json({ error: tooBig ? 'The image is larger than 8 MB.' : 'Could not read the upload.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

const port = Number(process.env.PORT) || 4000
app.listen(port, () => console.log(`Resit backend listening on port ${port}`))
