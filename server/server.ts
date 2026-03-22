import './env.js'
import express from 'express'
import cors from 'cors'
import missionRoutes from './routes/mission.routes.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/api/missions', missionRoutes)

// L’UI React est servie par Vite (port 3000 par défaut) — ce serveur n’expose pas de page d’accueil.
app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mindflow API</title></head>
<body>
  <p>Ce port est l’API Express (routes <code>/api/*</code>, <code>/health</code>).</p>
  <p>Ouvre l’app : <a href="http://localhost:3000">http://localhost:3000</a> (Vite).</p>
</body></html>`)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
