const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { z } = require("zod");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "dev_secret_change_me"; // change in production

// --- Files ---
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage });

// --- DB ---
const db = new Database("app.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date TEXT,
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  state TEXT NOT NULL DEFAULT 'assigned' CHECK(state IN ('assigned','claimed','submitted','reviewed','completed')),
  UNIQUE(task_id, user_id),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL UNIQUE,
  text TEXT,
  file_path TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
  feedback TEXT,
  FOREIGN KEY(assignment_id) REFERENCES assignments(id)
);
CREATE TABLE IF NOT EXISTS signup_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registration_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signup_request_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 100,
  mpesa_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  FOREIGN KEY(signup_request_id) REFERENCES signup_requests(id) ON DELETE CASCADE
);
`);

// Wallets table: per-user balance
db.prepare(`
  CREATE TABLE IF NOT EXISTS wallets (
    user_id INTEGER PRIMARY KEY,
    balance REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();

// Withdrawals table: requests created by users, approved/rejected by admin
db.prepare(`
  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();
// --- Auth helpers ---
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// --- Schemas ---
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).default("user"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- Routes ---
app.get("/", (_, res) => res.json({ ok: true }));



app.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { name, email, password } = parsed.data;

 
  try {
    const stmt = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    const info = stmt.run(name, email.toLowerCase(), await bcrypt.hash(password, 10), "user");
    return res.json({ id: info.lastInsertRowid });
  } catch {
    return res.status(400).json({ error: "Email already exists" });
  }
});

const signupRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(6),
  mpesa_code: z.string().min(8).max(20),
  amount: z.number().optional(),
  channel: z.enum(["sms", "email"]).optional(),
});

app.post("/auth/signup-request", async (req, res) => {
  const parsed = signupRequestSchema.safeParse({
    ...req.body,
    amount: req.body?.amount ? Number(req.body.amount) : 100,
    mpesa_code: String(req.body?.mpesa_code || "").toUpperCase().trim(),
  });

  if (!parsed.success) return res.status(400).json(parsed.error);

  const { name, email, phone, password, channel, mpesa_code, amount } = parsed.data;

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existingUser) return res.status(400).json({ error: "Email already registered" });

  const existingReq = db
    .prepare("SELECT id FROM signup_requests WHERE email = ? AND status != 'completed'")
    .get(email.toLowerCase());
  if (existingReq) return res.status(400).json({ error: "Pending signup request exists" });

  const existingCode = db
    .prepare("SELECT id FROM registration_payments WHERE mpesa_code = ?")
    .get(mpesa_code);
  if (existingCode) return res.status(400).json({ error: "This M-Pesa code has already been used" });

  const ch = channel === "email" ? "email" : "sms";
  const password_hash = await bcrypt.hash(password, 10);

  try {
    const reqInfo = db.prepare(`
      INSERT INTO signup_requests (name, email, phone, password_hash, channel, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(name, email.toLowerCase(), phone, password_hash, ch);

    db.prepare(`
      INSERT INTO registration_payments (signup_request_id, phone, amount, mpesa_code, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(reqInfo.lastInsertRowid, phone, amount || 100, mpesa_code);

    return res.json({
      ok: true,
      message: "Signup request submitted. Awaiting admin payment confirmation."
    });
  } catch (e) {
    return res.status(500).json({ error: "Could not create signup request" });
  }
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { email, password } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Admin: list signup requests (non-completed)
app.get("/admin/signup-requests", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT
      sr.id,
      sr.name,
      sr.email,
      sr.phone,
      sr.channel,
      sr.status,
      sr.created_at,
      rp.id AS payment_id,
      rp.amount,
      rp.mpesa_code,
      rp.status AS payment_status,
      rp.admin_note,
      rp.confirmed_at
    FROM signup_requests sr
    LEFT JOIN registration_payments rp ON rp.signup_request_id = sr.id
    WHERE sr.status != 'completed'
    ORDER BY sr.created_at DESC
  `).all();

  res.json(rows);
});

app.post("/admin/payments/:id/confirm", authRequired, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);

  const payment = db.prepare(`
    SELECT rp.*, sr.name, sr.email, sr.phone, sr.password_hash, sr.channel, sr.status as signup_status
    FROM registration_payments rp
    JOIN signup_requests sr ON sr.id = rp.signup_request_id
    WHERE rp.id = ?
  `).get(id);

  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.status === "confirmed") return res.status(400).json({ error: "Payment already confirmed" });

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(payment.email.toLowerCase());
  if (existingUser) return res.status(400).json({ error: "User already exists" });

  try {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `).run(payment.name, payment.email.toLowerCase(), payment.password_hash);

    db.prepare(`
      UPDATE registration_payments
      SET status = 'confirmed', confirmed_at = datetime('now')
      WHERE id = ?
    `).run(id);

    db.prepare(`
      UPDATE signup_requests
      SET status = 'completed'
      WHERE id = ?
    `).run(payment.signup_request_id);

    res.json({ ok: true, message: "Payment confirmed and user account created" });
  } catch (e) {
    res.status(500).json({ error: "Could not confirm payment and create user" });
  }
});

app.post("/admin/payments/:id/reject", authRequired, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const note = String(req.body?.note || "").trim();

  const payment = db.prepare("SELECT * FROM registration_payments WHERE id = ?").get(id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  db.prepare(`
    UPDATE registration_payments
    SET status = 'rejected', admin_note = ?
    WHERE id = ?
  `).run(note || null, id);

  res.json({ ok: true, message: "Payment rejected" });
});

// Admin: delete a task (and related assignments/submissions)
app.delete("/tasks/:taskId", authRequired, requireRole("admin"), (req, res) => {
  const taskId = Number(req.params.taskId);

  const t = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!t) return res.status(404).json({ error: "Task not found" });

  // delete submissions for assignments of this task
  db.prepare(`
    DELETE FROM submissions
    WHERE assignment_id IN (SELECT id FROM assignments WHERE task_id = ?)
  `).run(taskId);

  // delete assignments for this task
  db.prepare(`DELETE FROM assignments WHERE task_id = ?`).run(taskId);

  // delete the task
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);

  res.json({ ok: true });
});



// Admin: create task
app.post("/tasks", authRequired, requireRole("admin"), (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().min(2),
    due_date: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { title, description, due_date } = parsed.data;
  const info = db
    .prepare("INSERT INTO tasks (title, description, due_date, created_by) VALUES (?, ?, ?, ?)")
    .run(title, description, due_date || null, req.user.id);

  res.json({ id: info.lastInsertRowid });
});

// Admin: list users
app.get("/users", authRequired, requireRole("admin"), (req, res) => {
  const users = db.prepare("SELECT id, name, email, role FROM users ORDER BY id DESC").all();
  res.json(users);
});

// Admin: list all tasks (so admin can pick task IDs easily)
app.get("/tasks", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, description, due_date, status, created_at
    FROM tasks
    ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

// Admin: assign task to user
app.post("/tasks/:taskId/assign", authRequired, requireRole("admin"), (req, res) => {
  const taskId = Number(req.params.taskId);
  const schema = z.object({ user_id: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  try {
    const info = db
      .prepare("INSERT INTO assignments (task_id, user_id) VALUES (?, ?)")
      .run(taskId, parsed.data.user_id);
    res.json({ assignment_id: info.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "Already assigned" });
  }
});

// User: see my tasks
app.get("/tasks/mine", authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT 
      a.id as assignment_id,
      a.state,
      t.id as task_id,
      t.title,
      t.description,
      t.due_date,
      t.status,
      s.review_status as review_status,
      s.feedback as feedback
    FROM assignments a
    JOIN tasks t ON t.id = a.task_id
    LEFT JOIN submissions s ON s.assignment_id = a.id
    WHERE a.user_id = ?
    ORDER BY a.assigned_at DESC
  `).all(req.user.id);

  res.json(rows);
});

// User: submit work
app.post(
  "/assignments/:assignmentId/submit",
  authRequired,
  upload.single("file"),
  (req, res) => {
    const assignmentId = Number(req.params.assignmentId);
    const assignment = db.prepare("SELECT * FROM assignments WHERE id = ?").get(assignmentId);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const text = (req.body.text || "").toString();
    const file_path = req.file ? req.file.filename : null;

    const existing = db.prepare("SELECT * FROM submissions WHERE assignment_id = ?").get(assignmentId);
    if (existing) {
      db.prepare(
        "UPDATE submissions SET text = ?, file_path = ?, submitted_at = datetime('now'), review_status = 'pending', feedback = NULL WHERE assignment_id = ?"
      ).run(text, file_path, assignmentId);
    } else {
      db.prepare("INSERT INTO submissions (assignment_id, text, file_path) VALUES (?, ?, ?)")
        .run(assignmentId, text, file_path);
    }

    db.prepare("UPDATE assignments SET state = 'submitted' WHERE id = ?").run(assignmentId);

    res.json({ ok: true });
  }
);

// Admin: view submissions
app.get("/tasks/:taskId/submissions", authRequired, requireRole("admin"), (req, res) => {
  const taskId = Number(req.params.taskId);
  const rows = db.prepare(`
    SELECT 
      s.id as submission_id,
      s.text,
      s.file_path,
      s.submitted_at,
      s.review_status,
      s.feedback,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      a.id as assignment_id
    FROM assignments a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN submissions s ON s.assignment_id = a.id
    WHERE a.task_id = ?
    ORDER BY a.assigned_at DESC
  `).all(taskId);

  res.json(rows);
});

// Admin: view ALL submissions (no task selection)
app.get("/submissions", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      s.id as submission_id,
      s.text,
      s.file_path,
      s.submitted_at,
      s.review_status,
      s.feedback,
      t.id as task_id,
      t.title as task_title,
      t.due_date as task_due_date,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      a.id as assignment_id,
      a.state as assignment_state
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN tasks t ON t.id = a.task_id
    JOIN users u ON u.id = a.user_id
    ORDER BY s.submitted_at DESC
  `).all();

  res.json(rows);
});

// Admin: review submission
app.post("/submissions/:submissionId/review", authRequired, requireRole("admin"), (req, res) => {
  const submissionId = Number(req.params.submissionId);

  const schema = z.object({
    review_status: z.enum(["approved", "rejected"]),
    feedback: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  // Fetch submission + assignment + user BEFORE updating
  const joined = db.prepare(`
    SELECT 
      s.id as submission_id,
      s.review_status as prev_status,
      a.id as assignment_id,
      a.user_id
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.id = ?
  `).get(submissionId);

  if (!joined) return res.status(404).json({ error: "Submission not found" });

  // Update submission status + feedback
  db.prepare("UPDATE submissions SET review_status = ?, feedback = ? WHERE id = ?")
    .run(parsed.data.review_status, parsed.data.feedback || null, submissionId);

  if (parsed.data.review_status === "approved") {
    // mark completed
    db.prepare("UPDATE assignments SET state = 'completed' WHERE id = ?")
      .run(joined.assignment_id);

    // ensure wallet exists
    db.prepare(`
      INSERT INTO wallets (user_id, balance)
      VALUES (?, 0)
      ON CONFLICT(user_id) DO NOTHING
    `).run(joined.user_id);

    // pay only once
    if (joined.prev_status !== "approved") {
      db.prepare("UPDATE wallets SET balance = balance + 1.75 WHERE user_id = ?")
        .run(joined.user_id);
    }
  }

  if (parsed.data.review_status === "rejected") {
    db.prepare("UPDATE assignments SET state = 'assigned' WHERE id = ?")
      .run(joined.assignment_id);
  }

  return res.json({ ok: true, review_status: parsed.data.review_status });
});

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));



function cleanupAssignments() {
  const now = Date.now();

  // 1️⃣ delete submissions linked to reviewed assignments
  db.prepare(`
    DELETE FROM submissions
    WHERE assignment_id IN (
      SELECT id FROM assignments WHERE state = 'reviewed'
    )
  `).run();

  // 2️⃣ delete reviewed assignments
  db.prepare(`DELETE FROM assignments WHERE state = 'reviewed'`).run();

  // 3️⃣ delete submissions of expired assignments
  db.prepare(`
    DELETE FROM submissions
    WHERE assignment_id IN (
      SELECT id FROM assignments
      WHERE due_date IS NOT NULL
      AND due_date != ''
      AND strftime('%s', due_date) * 1000 < ?
    )
  `).run(now);

  // 4️⃣ delete expired assignments
  db.prepare(`
    DELETE FROM assignments
    WHERE due_date IS NOT NULL
    AND due_date != ''
    AND strftime('%s', due_date) * 1000 < ?
  `).run(now);
}



// User: see available (open) tasks not yet assigned to me
// User: see available (open) tasks not yet claimed/assigned by anyone
app.get("/tasks/available", authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.title, t.description, t.due_date, t.status, t.created_at
    FROM tasks t
    WHERE t.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM assignments a WHERE a.task_id = t.id
      )
    ORDER BY t.created_at DESC
  `).all();

  res.json(rows);
});

// User: claim a task (creates an assignment for me)
app.post("/tasks/:taskId/claim", authRequired, (req, res) => {
  const taskId = Number(req.params.taskId);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status !== "open") return res.status(400).json({ error: "Task is not open" });

  // If task already has ANY assignment (claimed/assigned/submitted/etc), block claim
  const existing = db.prepare("SELECT id, state FROM assignments WHERE task_id = ?").get(taskId);
  if (existing) {
    return res.status(409).json({ error: "Already claimed/assigned" });
  }

  const info = db
    .prepare("INSERT INTO assignments (task_id, user_id, state) VALUES (?, ?, 'claimed')")
    .run(taskId, req.user.id);

  return res.json({ assignment_id: info.lastInsertRowid });
});

// Admin: approve a claimed assignment to start (sets state -> 'assigned')
app.post("/assignments/:id/approve-start", authRequired, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const a = db.prepare("SELECT * FROM assignments WHERE id = ?").get(id);
  if (!a) return res.status(404).json({ error: "Assignment not found" });
  if (a.state !== "claimed") return res.status(400).json({ error: "Not in claimed state" });

  db.prepare("UPDATE assignments SET state = 'assigned' WHERE id = ?").run(id);
  res.json({ ok: true });
});

// Admin: list claimed tasks waiting approval to start
app.get("/admin/claims", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT
      a.id as assignment_id,
      a.task_id,
      a.user_id,
      a.assigned_at,
      a.state,
      t.title as task_title,
      t.due_date as task_due_date,
      u.name as user_name,
      u.email as user_email
    FROM assignments a
    JOIN tasks t ON t.id = a.task_id
    JOIN users u ON u.id = a.user_id
    WHERE a.state = 'claimed'
    ORDER BY a.assigned_at DESC
  `).all();

  res.json(rows);
});

// User: my stats and wallet balance
app.get("/me/stats", authRequired, (req, res) => {
  const userId = req.user.id;

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN state IN ('claimed','assigned','submitted','reviewed','completed') THEN 1 ELSE 0 END) AS claimed,
      SUM(CASE WHEN state = 'assigned' THEN 1 ELSE 0 END) AS approved_to_start,
      SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM assignments
    WHERE user_id = ?
  `).get(userId);

  const w = db.prepare("SELECT balance FROM wallets WHERE user_id = ?").get(userId);
  res.json({
    claimed: counts?.claimed || 0,
    approved_to_start: counts?.approved_to_start || 0,
    completed: counts?.completed || 0,
    balance: w?.balance || 0,
  });
});

// User: request withdrawal (unlocks at $35)
app.post("/withdraw", authRequired, (req, res) => {
  const userId = req.user.id;
  const w = db.prepare("SELECT balance FROM wallets WHERE user_id = ?").get(userId);
  const balance = w?.balance || 0;

  if (balance < 35) return res.status(400).json({ error: "Withdraw unlocks at $35" });

  db.prepare("INSERT INTO withdrawals (user_id, amount) VALUES (?, ?)").run(userId, balance);
  db.prepare("UPDATE wallets SET balance = 0 WHERE user_id = ?").run(userId);

  res.json({ ok: true, amount: balance });
});

app.get("/admin/users-overview", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id, u.name, u.email,
      (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id) AS tasks_claimed,
      (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.state = 'submitted') AS tasks_submitted,
      (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.state = 'completed') AS tasks_completed,
      COALESCE((SELECT balance FROM wallets w WHERE w.user_id = u.id), 0) AS balance
    FROM users u
    WHERE u.role = 'user'
    ORDER BY u.id DESC
  `).all();

  res.json(rows);
});



app.delete("/admin/users/:id", authRequired, requireRole("admin"), (req, res) => {
  const userId = Number(req.params.id);

  db.prepare(`
    DELETE FROM submissions
    WHERE assignment_id IN (SELECT id FROM assignments WHERE user_id = ?)
  `).run(userId);

  db.prepare(`DELETE FROM assignments WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM wallets WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM withdrawals WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'user'`).run(userId);

  res.json({ ok: true });
});

app.post("/admin/users/:id/set-balance", authRequired, requireRole("admin"), (req, res) => {
  const userId = Number(req.params.id);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "Invalid amount" });

  db.prepare(`INSERT INTO wallets (user_id, balance) VALUES (?, 0) ON CONFLICT(user_id) DO NOTHING`).run(userId);
  db.prepare(`UPDATE wallets SET balance = ? WHERE user_id = ?`).run(amount, userId);

  res.json({ ok: true });
});


app.get("/admin/tasks-overview", authRequired, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT
      t.id, t.title, t.description, t.due_date, t.status, t.created_at,
      COUNT(a.id) AS claim_count,
      COALESCE(GROUP_CONCAT(u.email, ', '), '') AS claimers
    FROM tasks t
    LEFT JOIN assignments a ON a.task_id = t.id
    LEFT JOIN users u ON u.id = a.user_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();

  return res.json(rows);
});


const PORT = 4000; app.listen(4000, () => console.log("API running on http://localhost:4000"));
