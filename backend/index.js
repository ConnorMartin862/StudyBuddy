if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
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
app.set('trust proxy', 1);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use(limiter);

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

app.get('/test-email', requireAuth, async (req, res) => {
  try {
    const result = await resend.emails.send({
      from: 'StudyBuddy <onboarding@resend.dev>',
      to: 'studybuddy.support.team@gmail.com',
      subject: 'Test from Railway',
      html: '<p>Test email from Railway</p>',
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/auth/login', loginLimiter, async (req, res) => {
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

// ── Search routes ─────────────────────────────────────────────────────────────

app.get('/users/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.id, u.name, u.username,
        similarity(u.name, $1) as name_sim,
        similarity(u.username, $1) as user_sim,
        GREATEST(similarity(u.name, $1), similarity(u.username, $1)) as best_sim,
        EXISTS(SELECT 1 FROM pushes WHERE from_user_id = $2 AND to_user_id = u.id) as i_pushed,
        EXISTS(SELECT 1 FROM pushes WHERE from_user_id = u.id AND to_user_id = $2) as they_pushed
      FROM users u
      WHERE u.id != $2
        AND GREATEST(similarity(u.name, $1), similarity(u.username, $1)) > 0.15
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $2 AND blocked_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = u.id AND blocked_id = $2)
      ORDER BY best_sim DESC
      LIMIT 20
    `, [q, req.user.id]);

    const results = rows.map(r => ({
      id: r.id,
      name: r.name,
      username: r.username,
      status: (r.i_pushed && r.they_pushed) ? 'matched'
            : r.i_pushed ? 'pushed'
            : r.they_pushed ? 'incoming'
            : 'unmatched'
    }));

    // Sort: matched first, then incoming, then pushed, then unmatched
    const order = { matched: 0, incoming: 1, pushed: 2, unmatched: 3 };    results.sort((a, b) => order[a.status] - order[b.status]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User routes ───────────────────────────────────────────────────────────────

app.get('/users/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes, sleep_preference, assignment_style, campus_frequency, meeting_preference, living_situation FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/me', requireAuth, async (req, res) => {
  const { name, preferences, schedule, classes, sleep_preference, assignment_style, campus_frequency, meeting_preference, living_situation } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        name               = COALESCE($1, name),
        preferences        = COALESCE($2::jsonb, preferences),
        schedule           = COALESCE($3::jsonb, schedule),
        classes            = COALESCE($4::jsonb, classes),
        sleep_preference   = COALESCE($5, sleep_preference),
        assignment_style   = COALESCE($6, assignment_style),
        campus_frequency   = COALESCE($7, campus_frequency),
        meeting_preference = COALESCE($8, meeting_preference),
        living_situation   = COALESCE($9, living_situation)
       WHERE id = $10
       RETURNING id, name, email, preferences, schedule, classes, sleep_preference, assignment_style, campus_frequency, meeting_preference, living_situation`,
      [
        name ?? null,
        preferences != null ? JSON.stringify(preferences) : null,
        schedule != null ? JSON.stringify(schedule) : null,
        classes != null ? JSON.stringify(classes) : null,
        sleep_preference ?? null,
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

app.put('/users/push-token', requireAuth, async (req, res) => {
  const { push_token } = req.body;
  try {
    await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [push_token, req.user.id]);
    res.json({ message: 'Token saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, preferences, schedule, classes, sleep_preference, assignment_style, campus_frequency, meeting_preference, living_situation FROM users WHERE id = $1',
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
       WHERE e.class_id = $1
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $2 AND blocked_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = u.id AND blocked_id = $2)`,
      [req.params.id, req.user.id]
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

app.post('/pushes/:toUserId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO pushes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.toUserId]
    );

    // Get sender name and recipient push token
    const senderResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const senderName = senderResult.rows[0]?.name;
    const recipientResult = await pool.query('SELECT push_token FROM users WHERE id = $1', [req.params.toUserId]);
    const pushToken = recipientResult.rows[0]?.push_token;

    // Check if this is a mutual match
    const matchCheck = await pool.query(
      'SELECT * FROM pushes WHERE from_user_id = $1 AND to_user_id = $2',
      [req.params.toUserId, req.user.id]
    );
    const isMatch = matchCheck.rows.length > 0;

    if (pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pushToken,
          title: isMatch ? '🎉 New Match!' : '👋 New Study Request',
          body: isMatch
            ? `You and ${senderName} are now matched!`
            : `${senderName} wants to study with you!`,
          sound: 'default',
        }),
      });
    }

    res.json({ message: 'Pushed successfully' });
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

// ── Compatibility routes ──────────────────────────────────────────────────────

function scorePreference(a, b, extremes, middle) {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if ((a === extremes[0] && b === extremes[1]) ||
      (a === extremes[1] && b === extremes[0])) return 0.0;
  if ((a === middle && (b === extremes[0] || b === extremes[1])) ||
      (b === middle && (a === extremes[0] || a === extremes[1]))) return 0.5;
  return 0;
}

function computeScore(userA, userB) {
  const scheduleA = userA.schedule ?? [];
  const scheduleB = userB.schedule ?? [];

  const greenA = scheduleA.filter(b => b.color === 'green');
  let scheduleScore = 0;
  if (greenA.length > 0) {
    const overlap = greenA.filter(a =>
      scheduleB.some(b => b.color === 'green' && b.day === a.day && b.hour === a.hour)
    ).length;
    scheduleScore = overlap / greenA.length;
  }

  const classesA = userA.classes ?? [];
  const classesB = userB.classes ?? [];
  const sharedClasses = classesA.filter(c => classesB.includes(c)).length;
  const classScore = sharedClasses >= 2 ? 0.15 : sharedClasses === 1 ? 0.10 : 0;

  const prefWeight = sharedClasses >= 2 ? 0.05 : 0.06;

  const prefTotal = (
    scorePreference(userA.sleep_preference,   userB.sleep_preference,   ['morning', 'night_owl'],       'neither') +
    scorePreference(userA.assignment_style,   userB.assignment_style,   ['first_thing', 'procrastinate'], 'middle') +
    scorePreference(userA.campus_frequency,   userB.campus_frequency,   ['always', 'rarely'],            'classes_only') +
    scorePreference(userA.meeting_preference, userB.meeting_preference, ['in_person', 'online'],         'both') +
    scorePreference(userA.living_situation,   userB.living_situation,   ['off_campus', 'on_campus_north'], 'on_campus_central')
  ) * prefWeight;

  return (0.6 * scheduleScore) + classScore + prefTotal;
}

async function computeAndStoreCompatibility(userAId, userBId) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1 OR id = $2',
    [userAId, userBId]
  );
  const userA = rows.find(r => r.id === userAId);
  const userB = rows.find(r => r.id === userBId);
  if (!userA || !userB) return;

  const scoreAB = computeScore(userA, userB);
  const scoreBA = computeScore(userB, userA);

  await pool.query(`
    INSERT INTO compatibility (user_a_id, user_b_id, score, computed_at)
    VALUES ($1, $2, $3, NOW()), ($2, $1, $4, NOW())
    ON CONFLICT (user_a_id, user_b_id) DO UPDATE
      SET score = EXCLUDED.score, computed_at = NOW()
  `, [userAId, userBId, scoreAB, scoreBA]);
}

app.post('/compatibility/compute', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query('SELECT id FROM users WHERE id != $1', [userId]);
    await Promise.all(rows.map(r => computeAndStoreCompatibility(userId, r.id)));
    res.json({ message: `Computed ${rows.length} compatibility scores` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute compatibility' });
  }
});

app.get('/compatibility', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.user_b_id, c.score, u.name, u.username
      FROM compatibility c
      JOIN users u ON u.id = c.user_b_id
      WHERE c.user_a_id = $1
      ORDER BY c.score DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── Message routes ────────────────────────────────────────────────────────────

// Get most recent message timestamp for each matched user
app.get('/messages/recent', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END as other_user_id,
        MAX(created_at) as last_message_at
       FROM messages
       WHERE from_user_id = $1 OR to_user_id = $1
       GROUP BY other_user_id`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/messages/:userId', requireAuth, async (req, res) => {
  const { body } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO messages (from_user_id, to_user_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, req.params.userId, body]
    );

    // Send push notification to recipient
    const recipientResult = await pool.query(
      'SELECT push_token, name FROM users WHERE id = $1', [req.params.userId]
    );
    const recipient = recipientResult.rows[0];
    const senderResult = await pool.query(
      'SELECT name FROM users WHERE id = $1', [req.user.id]
    );
    const senderName = senderResult.rows[0]?.name;

    if (recipient?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.push_token,
          title: senderName,
          body: body,
          sound: 'default',
        }),
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/messages/:userId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name as from_name FROM messages m
       JOIN users u ON u.id = m.from_user_id
       WHERE (m.from_user_id = $1 AND m.to_user_id = $2)
          OR (m.from_user_id = $2 AND m.to_user_id = $1)
       ORDER BY m.created_at ASC`,
      [req.user.id, req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recommendations ───────────────────────────────────────────────────────────

app.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user's classes
    const meResult = await pool.query('SELECT classes FROM users WHERE id = $1', [userId]);
    const myClasses = meResult.rows[0]?.classes ?? [];

    if (myClasses.length === 0) return res.json([]);

    // Get all users who share at least one class, excluding already pushed/matched
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.username, c.score
      FROM users u
      JOIN compatibility c ON c.user_a_id = $1 AND c.user_b_id = u.id
      WHERE u.id != $1
        AND u.classes IS NOT NULL
        AND u.classes::jsonb ?| $2
        AND NOT EXISTS (
          SELECT 1 FROM pushes 
          WHERE from_user_id = $1 AND to_user_id = u.id
        )
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = u.id AND blocked_id = $1)
      ORDER BY c.score DESC
    `, [userId, myClasses]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ── Blocking Users ────────────────────────────────────────────────────────────

app.post('/blocks/:userId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.userId]
    );
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/blocks/:userId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.id, req.params.userId]
    );
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/blocks', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT blocked_id FROM blocks WHERE blocker_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reporting Users ───────────────────────────────────────────────────────────

app.post('/reports/:userId', requireAuth, async (req, res) => {
  const { reason } = req.body;
  console.log('Report endpoint hit, reason:', reason, 'reported:', req.params.userId);
  try {
    await pool.query(
      'INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)',
      [req.user.id, req.params.userId, reason]
    );
    console.log('Report saved to DB');

    const reporterResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const reportedResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.params.userId]);
    const reporter = reporterResult.rows[0];
    const reported = reportedResult.rows[0];
    console.log('Reporter:', reporter?.name, 'Reported:', reported?.name);

    try {
      const emailResult = await resend.emails.send({
        from: 'StudyBuddy <onboarding@resend.dev>',
        to: 'studybuddy.support.team@gmail.com',
        subject: 'New User Report Submitted',
        html: `
          <h2>New Report Submitted</h2>
          <p><strong>Reporter:</strong> ${reporter.name} (${reporter.email})</p>
          <p><strong>Reported User:</strong> ${reported.name} (${reported.email})</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
      });
      console.log('Resend result:', JSON.stringify(emailResult));
    } catch (emailErr) {
      console.error('Resend error:', JSON.stringify(emailErr));
    }

    res.json({ message: 'Report submitted' });
  } catch (err) {
    console.error('Report endpoint error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Account ────────────────────────────────────────────────────────────

app.delete('/users/me', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
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