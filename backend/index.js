require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const app  = express();
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// ── Auth middleware ───────────────────────────────────────────────────────────
// Call this on any route that requires a logged-in user
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'StudyBuddy API is running!' });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

// Register a new user
// POST /auth/register  { name, email, password }
app.post('/auth/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, username, email',
      [name, username, email, password_hash]
    );
    const user  = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
// POST /auth/login  { email, password }
app.post('/classes', requireAuth, async (req, res) => {
  const { course_code, name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO classes (course_code, name) VALUES ($1, $2) RETURNING *',
      [course_code, name ?? '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User routes ───────────────────────────────────────────────────────────────

// Get your own profile
// GET /users/me
app.get('/users/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update your own profile (name, preferences, schedule)
// PUT /users/me  { name?, preferences?, schedule? }
app.put('/users/me', requireAuth, async (req, res) => {
  const { name, preferences, schedule, classes } = req.body;
  console.log('Updating user:', { name, preferences, schedule, classes });
  try {
    const result = await pool.query(
      `UPDATE users SET
        name        = COALESCE($1, name),
        preferences = COALESCE($2::jsonb, preferences),
        schedule    = COALESCE($3::jsonb, schedule),
        classes     = COALESCE($4::jsonb, classes)
       WHERE id = $5
       RETURNING id, name, email, preferences, schedule, classes`,
      [
        name ?? null,
        preferences != null ? JSON.stringify(preferences) : null,
        schedule != null ? JSON.stringify(schedule) : null,
        classes != null ? JSON.stringify(classes) : null,
        req.user.id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get another student's profile (limited fields — no password etc.)
// GET /users/:id
app.get('/users/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Class routes ──────────────────────────────────────────────────────────────

// Get all available classes
// GET /classes
app.get('/classes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes ORDER BY course_code');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single class + its enrolled students
// GET /classes/:id
app.get('/classes/:id', requireAuth, async (req, res) => {
  try {
    const classResult = await pool.query('SELECT * FROM classes WHERE id = $1', [req.params.id]);
    if (!classResult.rows[0]) return res.status(404).json({ error: 'Class not found' });

    const studentsResult = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN enrollments e ON e.user_id = u.id
       WHERE e.class_id = $1`,
      [req.params.id]
    );
    res.json({ ...classResult.rows[0], students: studentsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new class
// POST /classes  { course_code, name, description }
app.post('/classes', requireAuth, async (req, res) => {
  const { course_code, name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO classes (course_code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [course_code, name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Enroll yourself in a class
// POST /enrollments  { class_id }
app.post('/enrollments', requireAuth, async (req, res) => {
  const { class_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO enrollments (user_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, class_id]
    );
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Drop a class
// DELETE /enrollments/:classId
app.delete('/enrollments/:classId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM enrollments WHERE user_id = $1 AND class_id = $2',
      [req.user.id, req.params.classId]
    );
    res.json({ message: 'Dropped successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Push / match routes ───────────────────────────────────────────────────────

// Push (express interest in) another student
// POST /pushes/:toUserId
app.post('/pushes/:toUserId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO pushes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.toUserId]
    );
    res.json({ message: 'Pushed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Un-push someone
// DELETE /pushes/:toUserId
app.delete('/pushes/:toUserId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM pushes WHERE from_user_id = $1 AND to_user_id = $2',
      [req.user.id, req.params.toUserId]
    );
    res.json({ message: 'Removed push' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get everyone you've pushed
// GET /pushes/sent
app.get('/pushes/sent', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN pushes p ON p.to_user_id = u.id
       WHERE p.from_user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get mutual matches (both users pushed each other)
// GET /pushes/matches
app.get('/pushes/matches', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN pushes p1 ON p1.to_user_id = u.id
       JOIN pushes p2 ON p2.from_user_id = u.id AND p2.to_user_id = $1
       WHERE p1.from_user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));