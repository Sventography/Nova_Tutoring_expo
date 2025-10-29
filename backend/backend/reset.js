const express = require('express')
const bcrypt = require('bcryptjs')
const router = express.Router()
const users = []

router.post('/register', async (req, res) => {
  const { email, password, confirm } = req.body
  if (password !== confirm) return res.status(400).json({ error: 'Passwords do not match' })
  const hashed = await bcrypt.hash(password, 10)
  users.push({ email, password: hashed })
  res.json({ ok: true })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ ok: true })
})

module.exports = router
