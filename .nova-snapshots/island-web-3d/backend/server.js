require('dotenv').config();
const express = require('express');
const cors = require('cors');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const { z } = require('zod');
const db = require('./db');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirm: z.string()
}).refine(v => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });

app.post('/api/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'email_in_use' });

  const hash = await argon2.hash(password);
  const user = { id: nanoid(), email, created_at: Date.now(), password_hash: hash };
  db.prepare('INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)')
    .run(user.id, user.email, user.password_hash, user.created_at);

  res.json({ token: sign(user), user: { id: user.id, email: user.email } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

app.post('/api/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid' });

  const { email, password } = parsed.data;
  const row = db.prepare('SELECT id,email,password_hash FROM users WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await argon2.verify(row.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  res.json({ token: sign(row), user: { id: row.id, email: row.email } });
});

app.get('/api/me', auth, (req, res) => {
  const row = db.prepare('SELECT id,email,created_at FROM users WHERE id = ?').get(req.user.sub);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ user: row });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log('auth api on :' + port));
