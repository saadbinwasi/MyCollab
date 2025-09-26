// Minimal Express backend with JWT auth and admin control
// Run: NODE_ENV=development node backend/index.js

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const helmet = require('helmet')

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const DATA_DIR = path.join(__dirname, 'data')
const USERS_PATH = path.join(DATA_DIR, 'users.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(USERS_PATH)) {
  fs.writeFileSync(USERS_PATH, JSON.stringify([] , null, 2))
}

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2))
}

function generateId() {
  return 'u_' + Math.random().toString(36).slice(2, 10)
}

// Seed an admin if no users exist
(function seedAdmin() {
  const users = readUsers()
  if (users.length === 0) {
    const email = 'admin@mycollab.local'
    const passwordHash = bcrypt.hashSync('admin123', 10)
    users.push({ id: generateId(), name: 'Admin', email, passwordHash, role: 'admin', createdAt: new Date().toISOString() })
    writeUsers(users)
    // eslint-disable-next-line no-console
    console.log('Seeded default admin: admin@mycollab.local / admin123')
  }
})()

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

function authRequired(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next()
  return res.status(403).json({ error: 'Forbidden' })
}

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'collabsys-backend', time: new Date().toISOString() })
})

// Auth: Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  const users = readUsers()
  const exists = users.find(u => u.email.toLowerCase() === String(email).toLowerCase())
  if (exists) return res.status(409).json({ error: 'Email is already registered' })

  const passwordHash = await bcrypt.hash(password, 10)
  const isFirstUser = users.length === 0
  const role = isFirstUser ? 'admin' : 'user'
  const user = { id: generateId(), name: name || email.split('@')[0], email, passwordHash, role, createdAt: new Date().toISOString() }
  users.push(user)
  writeUsers(users)

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } })
})

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  const users = readUsers()
  const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase())
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } })
})

// Me
app.get('/api/auth/me', authRequired, (req, res) => {
  const users = readUsers()
  const me = users.find(u => u.id === req.user.id)
  if (!me) return res.status(404).json({ error: 'User not found' })
  res.json({ user: { id: me.id, email: me.email, role: me.role, name: me.name } })
})

// Admin: list users
app.get('/api/admin/users', authRequired, adminOnly, (req, res) => {
  const users = readUsers()
  const safe = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }))
  res.json({ users: safe })
})

// Admin: promote/demote user role
app.post('/api/admin/users/:id/role', authRequired, adminOnly, (req, res) => {
  const { id } = req.params
  const { role } = req.body || {}
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users[idx].role = role
  writeUsers(users)
  res.json({ ok: true })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`)
})
