if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'StudyBuddy API is running!' });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

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

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User routes ───────────────────────────────────────────────────────────────

app.get('/users/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes, assignment_style, campus_frequency, meeting_preference, living_situation FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/me', requireAuth, async (req, res) => {
  const { name, preferences, schedule, classes, assignment_style, campus_frequency, meeting_preference, living_situation } = req.body;
  console.log('Updating user:', { name, preferences, schedule, classes });
  try {
    const result = await pool.query(
      `UPDATE users SET
        name               = COALESCE($1, name),
        preferences        = COALESCE($2::jsonb, preferences),
        schedule           = COALESCE($3::jsonb, schedule),
        classes            = COALESCE($4::jsonb, classes),
        assignment_style   = COALESCE($5, assignment_style),
        campus_frequency   = COALESCE($6, campus_frequency),
        meeting_preference = COALESCE($7, meeting_preference),
        living_situation   = COALESCE($8, living_situation)
      WHERE id = $9
      RETURNING id, name, email, preferences, schedule, classes, assignment_style, campus_frequency, meeting_preference, living_situation`,
      [
        name ?? null,
        preferences != null ? JSON.stringify(preferences) : null,
        schedule != null ? JSON.stringify(schedule) : null,
        classes != null ? JSON.stringify(classes) : null,
        assignment_style ?? null,
        campus_frequency ?? null,
        meeting_preference ?? null,
        living_situation ?? null,
        req.user.id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes, assignment_style, campus_frequency, meeting_preference, living_situation FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Class routes ──────────────────────────────────────────────────────────────

app.get('/classes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes ORDER BY course_code');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// !! Must be before /classes/:id !!
app.get('/classes/by-name/:name', requireAuth, async (req, res) => {
  try {
    const classResult = await pool.query(
      `SELECT id FROM classes WHERE course_code = $1 OR name = $1 OR CONCAT(course_code, ' - ', name) = $1`,
      [req.params.name]
    );
    if (!classResult.rows[0]) return res.json({ students: [] });
    const students = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN enrollments e ON e.user_id = u.id
       WHERE e.class_id = $1`,
      [classResult.rows[0].id]
    );
    res.json({ students: students.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ── Enrollment routes ─────────────────────────────────────────────────────────

app.get('/enrollments/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT class_id FROM enrollments WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Get your enrolled classes
// GET /enrollments/me
app.get('/enrollments/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.* FROM classes c
       JOIN enrollments e ON e.class_id = c.id
       WHERE e.user_id = $1
       ORDER BY c.course_code`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Get push status between you and another user
// GET /pushes/status/:userId
app.get('/pushes/status/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if you pushed them
    const sentResult = await pool.query(
      'SELECT * FROM pushes WHERE from_user_id = $1 AND to_user_id = $2',
      [req.user.id, userId]
    );

    // Check if they pushed you back
    const receivedResult = await pool.query(
      'SELECT * FROM pushes WHERE from_user_id = $1 AND to_user_id = $2',
      [userId, req.user.id]
    );

    const pushed   = sentResult.rows.length > 0;
    const received = receivedResult.rows.length > 0;

    if (pushed && received) return res.json({ status: 'matched' });
    if (pushed)             return res.json({ status: 'pushed' });
    return res.json({ status: 'unmatched' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// !! Must be before /pushes/:toUserId !!
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

app.get('/pushes/received', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN pushes p ON p.from_user_id = u.id
       WHERE p.to_user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// !! Must be before /pushes/:toUserId !!
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

// ── Thread routes ─────────────────────────────────────────────────────────────

// Get threads for a class (with top comment + slap count)
// GET /classes/:id/threads
app.get('/classes/:id/threads', requireAuth, async (req, res) => {
  try {
    const threads = await pool.query(
      `SELECT t.*, u.name as author_name,
        COUNT(DISTINCT s.id) as slap_count,
        (SELECT body FROM comments WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1) as top_comment,
        (SELECT name FROM users WHERE id = (SELECT user_id FROM comments WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1)) as top_comment_author,
        (SELECT COUNT(*) FROM comments WHERE thread_id = t.id) as comment_count
       FROM threads t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN slaps s ON s.thread_id = t.id
       WHERE t.class_id = $1
       GROUP BY t.id, u.name
       ORDER BY t.created_at DESC`,
      [req.params.id]
    );
    res.json(threads.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a thread
// POST /classes/:id/threads  { title, body }
app.post('/classes/:id/threads', requireAuth, async (req, res) => {
  const { title, body } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO threads (class_id, user_id, title, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, title, body]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single thread + all comments
// GET /threads/:id
app.get('/threads/:id', requireAuth, async (req, res) => {
  try {
    const thread = await pool.query(
      `SELECT t.*, u.name as author_name,
        COUNT(DISTINCT s.id) as slap_count,
        EXISTS(SELECT 1 FROM slaps WHERE thread_id = t.id AND user_id = $2) as slapped
       FROM threads t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN slaps s ON s.thread_id = t.id
       WHERE t.id = $1
       GROUP BY t.id, u.name`,
      [req.params.id, req.user.id]
    );
    if (!thread.rows[0]) return res.status(404).json({ error: 'Thread not found' });

    const comments = await pool.query(
      `SELECT c.*, u.name as author_name,
        COUNT(DISTINCT s.id) as slap_count,
        EXISTS(SELECT 1 FROM slaps WHERE comment_id = c.id AND user_id = $2) as slapped
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN slaps s ON s.comment_id = c.id
       WHERE c.thread_id = $1
       GROUP BY c.id, u.name
       ORDER BY c.created_at ASC`,
      [req.params.id, req.user.id]
    );

    res.json({ ...thread.rows[0], comments: comments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a comment to a thread
// POST /threads/:id/comments  { body }
app.post('/threads/:id/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO comments (thread_id, user_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, body]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Slap a thread
// POST /threads/:id/slap
app.post('/threads/:id/slap', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO slaps (user_id, thread_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Slapped!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unslap a thread
// DELETE /threads/:id/slap
app.delete('/threads/:id/slap', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM slaps WHERE user_id = $1 AND thread_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Unslapped!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Slap a comment
// POST /comments/:id/slap
app.post('/comments/:id/slap', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO slaps (user_id, comment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Slapped!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unslap a comment
// DELETE /comments/:id/slap
app.delete('/comments/:id/slap', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM slaps WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Unslapped!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
console.log('ENV VARS:', {
  hasDB: !!process.env.DATABASE_URL,
  hasJWT: !!process.env.JWT_SECRET,
  port: process.env.PORT
});
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));