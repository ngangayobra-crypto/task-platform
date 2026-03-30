import { useState, useEffect, useCallback } from "react";
import "./AdminDashboard.css";

const API = "https://task-platform-api.onrender.com";

async function apiFetch(token, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof data === "string" ? data : (data?.error || "Request failed"));
  return data;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const Icon = {
  overview: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  tasks: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  signups: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      <line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  ),
  clock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
};

// ── Confirm dialog ─────────────────────────────────────────────────────────
function Confirm({ message, onConfirm, onCancel }) {
  return (
    <div className="ad-confirm-backdrop">
      <div className="ad-confirm-box">
        <p className="ad-confirm-msg">{message}</p>
        <div className="ad-confirm-actions">
          <button className="ad-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="ad-btn-danger-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="ad-toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`ad-toast ad-toast-${t.type}`}>
          <span>{t.message}</span>
          <button className="ad-toast-close" onClick={() => onDismiss(t.id)}><Icon.x /></button>
        </div>
      ))}
    </div>
  );
}

// ── Avatar initials ────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#7c3aed","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const color  = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className="ad-avatar" style={{ width: size, height: size, background: color + "22", color, border: `1px solid ${color}44`, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ count }) {
  if (!count) return null;
  return <span className="ad-nav-badge">{count > 99 ? "99+" : count}</span>;
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title, action, actionLabel }) {
  return (
    <div className="ad-section-header">
      <span className="ad-section-title">{title}</span>
      {action && (
        <button className="ad-text-btn" onClick={action}>{actionLabel || "Refresh"} <Icon.refresh /></button>
      )}
    </div>
  );
}

// ── OVERVIEW TAB ───────────────────────────────────────────────────────────
function OverviewTab({ token, addToast }) {
  const [claims, setClaims]         = useState([]);
  const [loading, setLoading]       = useState({});
  const [confirm, setConfirm]       = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(token, "/admin/claims");
      setClaims(Array.isArray(data) ? data : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function approveStart(id) {
    setLoading(p => ({ ...p, [id]: true }));
    try {
      await apiFetch(token, `/assignments/${id}/approve-start`, { method: "POST", body: "{}" });
      addToast("Approved to start ✓", "success");
      void load();
    } catch (e) { addToast(e.message, "error"); }
    finally { setLoading(p => ({ ...p, [id]: false })); }
  }

  const pending = claims.filter(c => c.state === "claimed");

  return (
    <div className="ad-tab-content">
      {/* Summary cards */}
      <div className="ad-summary-grid">
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-amber">{pending.length}</div>
          <div className="ad-summary-lbl">Pending claims</div>
        </div>
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-purple">{claims.length}</div>
          <div className="ad-summary-lbl">Total claims</div>
        </div>
      </div>

      <SectionHeader title="Pending approvals" action={load} />

      {pending.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-icon">✅</div>
          <div className="ad-empty-text">All caught up</div>
          <div className="ad-empty-sub">No claims waiting for approval.</div>
        </div>
      ) : (
        pending.map(c => (
          <div key={c.assignment_id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={c.user_name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{c.user_name}</div>
                <div className="ad-card-sub">{c.user_email}</div>
              </div>
            </div>
            <div className="ad-card-task-name">{c.task_title}</div>
            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">Task #{c.task_id}</span>
              {c.task_due_date && <span className="ad-pill ad-pill-gray">Due {c.task_due_date}</span>}
            </div>
            <div className="ad-action-row">
              <button
                className="ad-btn-approve"
                disabled={loading[c.assignment_id]}
                onClick={() => setConfirm({ message: `Approve "${c.user_name}" to start "${c.task_title}"?`, onConfirm: () => { setConfirm(null); approveStart(c.assignment_id); } })}
              >
                <Icon.check /> {loading[c.assignment_id] ? "Approving…" : "Approve start"}
              </button>
            </div>
          </div>
        ))
      )}

      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── TASKS TAB ──────────────────────────────────────────────────────────────
function TasksTab({ token, addToast }) {
  const [view, setView]           = useState("list"); // list | create | submissions
  const [tasks, setTasks]         = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating]   = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [form, setForm]           = useState({ title: "", description: "", due_date: "", estimated_minutes: "" });

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiFetch(token, "/admin/tasks-overview");
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await apiFetch(token, "/submissions");
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function createTask() {
    if (!form.title || !form.description) return addToast("Title and description required", "error");
    setCreating(true);
    try {
      await apiFetch(token, "/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          due_date: form.due_date || undefined,
          estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : undefined,
        }),
      });
      addToast("Task created ✓", "success");
      setForm({ title: "", description: "", due_date: "", estimated_minutes: "" });
      setView("list");
      void loadTasks();
    } catch (e) { addToast(e.message, "error"); }
    finally { setCreating(false); }
  }

  async function deleteTask(taskId, title) {
    try {
      await apiFetch(token, `/tasks/${taskId}`, { method: "DELETE" });
      addToast(`"${title}" deleted`, "success");
      void loadTasks();
      if (view === "submissions") setView("list");
    } catch (e) { addToast(e.message, "error"); }
  }

  async function reviewSubmission(submissionId, status) {
    try {
      await apiFetch(token, `/submissions/${submissionId}/review`, {
        method: "POST",
        body: JSON.stringify({ review_status: status }),
      });
      addToast(status === "approved" ? "Approved ✓ — $1.75 paid" : "Rejected", status === "approved" ? "success" : "warn");
      void loadSubmissions();
    } catch (e) { addToast(e.message, "error"); }
  }

  const pendingSubmissions = submissions.filter(s => s.review_status === "pending");

  // Create form
  if (view === "create") {
    return (
      <div className="ad-tab-content">
        <button className="ad-back-btn" onClick={() => setView("list")}>← Back to tasks</button>
        <div className="ad-form-card">
          <div className="ad-form-title">New task</div>
          <div className="ad-field">
            <label className="ad-label">Title</label>
            <input className="ad-input" placeholder="e.g. Write a product review" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="ad-field">
            <label className="ad-label">Description</label>
            <textarea className="ad-textarea" placeholder="Describe what the user needs to do…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="ad-field-row">
            <div className="ad-field">
              <label className="ad-label">Due date</label>
              <input className="ad-input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="ad-field">
              <label className="ad-label">Est. minutes</label>
              <input className="ad-input" type="number" placeholder="e.g. 20" value={form.estimated_minutes} onChange={e => setForm(p => ({ ...p, estimated_minutes: e.target.value }))} />
            </div>
          </div>
          <button className="ad-btn-primary" disabled={creating} onClick={createTask}>
            {creating ? "Creating…" : <><Icon.plus /> Create task</>}
          </button>
        </div>
      </div>
    );
  }

  // Submissions view
  if (view === "submissions") {
    const taskSubs = selectedTask ? submissions.filter(s => s.task_id === selectedTask.id) : submissions;
    return (
      <div className="ad-tab-content">
        <button className="ad-back-btn" onClick={() => { setView("list"); setSelectedTask(null); }}>← Back to tasks</button>
        <SectionHeader title={selectedTask ? `"${selectedTask.title}"` : "All submissions"} action={loadSubmissions} />
        {taskSubs.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon">📭</div>
            <div className="ad-empty-text">No submissions yet</div>
          </div>
        ) : (
          taskSubs.map(s => (
            <div key={s.assignment_id} className="ad-card">
              <div className="ad-card-row">
                <Avatar name={s.user_name} />
                <div className="ad-card-info">
                  <div className="ad-card-title">{s.user_name}</div>
                  <div className="ad-card-sub">{s.user_email}</div>
                </div>
                <span className={`ad-pill ${s.review_status === "approved" ? "ad-pill-green" : s.review_status === "rejected" ? "ad-pill-red" : "ad-pill-amber"}`}>
                  {s.review_status || "pending"}
                </span>
              </div>
              {!selectedTask && <div className="ad-card-task-name">{s.task_title}</div>}
              {s.text && <div className="ad-submission-text">"{s.text}"</div>}
              {s.file_path && (
                <a className="ad-file-link" href={`${API}/uploads/${s.file_path}`} target="_blank" rel="noreferrer">
                  <Icon.download /> Download file
                </a>
              )}
              {s.submission_id && s.review_status === "pending" && (
                <div className="ad-action-row">
                  <button className="ad-btn-approve" onClick={() => reviewSubmission(s.submission_id, "approved")}>
                    <Icon.check /> Approve
                  </button>
                  <button className="ad-btn-reject" onClick={() => reviewSubmission(s.submission_id, "rejected")}>
                    <Icon.x /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Task list
  return (
    <div className="ad-tab-content">
      <div className="ad-toolbar">
        <button className="ad-btn-primary ad-btn-sm" onClick={() => setView("create")}>
          <Icon.plus /> New task
        </button>
        <button className="ad-btn-ghost ad-btn-sm" onClick={() => { void loadSubmissions(); setView("submissions"); setSelectedTask(null); }}>
          View all submissions {pendingSubmissions.length > 0 && <span className="ad-inline-badge">{pendingSubmissions.length}</span>}
        </button>
      </div>

      <SectionHeader title="All tasks" action={loadTasks} />

      {tasks.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-icon">📋</div>
          <div className="ad-empty-text">No tasks yet</div>
          <button className="ad-btn-primary ad-btn-sm" style={{ marginTop: 12 }} onClick={() => setView("create")}>Create first task</button>
        </div>
      ) : (
        tasks.map(t => (
          <div key={t.id} className="ad-card">
            <div className="ad-card-row" style={{ alignItems: "flex-start" }}>
              <div className="ad-card-info" style={{ flex: 1 }}>
                <div className="ad-card-title">{t.title}</div>
                <div className="ad-card-sub">{t.description?.slice(0, 80)}{t.description?.length > 80 ? "…" : ""}</div>
              </div>
              <span className={`ad-pill ${t.status === "open" ? "ad-pill-green" : "ad-pill-gray"}`}>{t.status}</span>
            </div>
            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">#{t.id}</span>
              {t.due_date && <span className="ad-pill ad-pill-gray">Due {t.due_date}</span>}
              {t.estimated_minutes && <span className="ad-pill ad-pill-gray"><Icon.clock /> {t.estimated_minutes}m</span>}
              <span className="ad-pill ad-pill-amber">{t.claim_count} claimed</span>
            </div>
            {t.claimers && <div className="ad-claimers">Claimers: {t.claimers}</div>}
            <div className="ad-action-row">
              <button className="ad-btn-ghost ad-btn-sm" onClick={() => { setSelectedTask(t); void loadSubmissions(); setView("submissions"); }}>
                View submissions
              </button>
              <button className="ad-btn-danger-sm" onClick={() => setConfirm({ message: `Delete "${t.title}"? This cannot be undone.`, onConfirm: () => { setConfirm(null); deleteTask(t.id, t.title); } })}>
                <Icon.trash />
              </button>
            </div>
          </div>
        ))
      )}
      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── USERS TAB ──────────────────────────────────────────────────────────────
function UsersTab({ token, addToast }) {
  const [users, setUsers]     = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editBal, setEditBal] = useState({}); // { [userId]: string }
  const [allUsers, setAllUsers] = useState([]); // for assign
  const [allTasks, setAllTasks] = useState([]);
  const [assignTaskId, setAssignTaskId]   = useState("");
  const [assignUserId, setAssignUserId]   = useState("");
  const [assigning, setAssigning]         = useState(false);
  const [showAssign, setShowAssign]       = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(token, "/admin/users-overview");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  const loadForAssign = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([
        apiFetch(token, "/users"),
        apiFetch(token, "/tasks"),
      ]);
      setAllUsers(Array.isArray(u) ? u : []);
      setAllTasks(Array.isArray(t) ? t : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function deleteUser(id, name) {
    try {
      await apiFetch(token, `/admin/users/${id}`, { method: "DELETE" });
      addToast(`${name} deleted`, "success");
      void load();
    } catch (e) { addToast(e.message, "error"); }
  }

  async function setBalance(id, amount) {
    try {
      await apiFetch(token, `/admin/users/${id}/set-balance`, { method: "POST", body: JSON.stringify({ amount: Number(amount) }) });
      addToast("Balance updated ✓", "success");
      setEditBal(p => ({ ...p, [id]: undefined }));
      void load();
    } catch (e) { addToast(e.message, "error"); }
  }

  async function assignTask() {
    if (!assignTaskId || !assignUserId) return addToast("Select task and user", "error");
    setAssigning(true);
    try {
      await apiFetch(token, `/tasks/${assignTaskId}/assign`, { method: "POST", body: JSON.stringify({ user_id: Number(assignUserId) }) });
      addToast("Task assigned ✓", "success");
      setAssignTaskId(""); setAssignUserId(""); setShowAssign(false);
    } catch (e) { addToast(e.message, "error"); }
    finally { setAssigning(false); }
  }

  return (
    <div className="ad-tab-content">
      {/* Assign task panel */}
      <button className="ad-btn-ghost ad-btn-sm" onClick={() => { setShowAssign(p => !p); if (!showAssign) loadForAssign(); }}>
        {showAssign ? "Hide assign panel" : "Assign task to user"}
      </button>

      {showAssign && (
        <div className="ad-form-card">
          <div className="ad-form-title">Assign task</div>
          <div className="ad-field">
            <label className="ad-label">Task</label>
            <select className="ad-select" value={assignTaskId} onChange={e => setAssignTaskId(e.target.value)}>
              <option value="">Select a task</option>
              {allTasks.map(t => <option key={t.id} value={t.id}>#{t.id} — {t.title}</option>)}
            </select>
          </div>
          <div className="ad-field">
            <label className="ad-label">User</label>
            <select className="ad-select" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
              <option value="">Select a user</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <button className="ad-btn-primary" disabled={assigning} onClick={assignTask}>
            {assigning ? "Assigning…" : "Assign"}
          </button>
        </div>
      )}

      <SectionHeader title={`Users (${users.length})`} action={load} />

      {users.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-icon">👤</div>
          <div className="ad-empty-text">No users yet</div>
        </div>
      ) : (
        users.map(u => (
          <div key={u.id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={u.name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{u.name}</div>
                <div className="ad-card-sub">{u.email}</div>
              </div>
              <div className="ad-balance-display">${Number(u.balance).toFixed(2)}</div>
            </div>

            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">Claimed: {u.tasks_claimed}</span>
              <span className="ad-pill ad-pill-gray">Done: {u.tasks_completed}</span>
            </div>

            {/* Inline balance editor */}
            <div className="ad-balance-row">
              <input
                className="ad-input ad-input-sm"
                type="number"
                placeholder={`Set balance (currently $${Number(u.balance).toFixed(2)})`}
                value={editBal[u.id] ?? ""}
                onChange={e => setEditBal(p => ({ ...p, [u.id]: e.target.value }))}
              />
              <button className="ad-btn-ghost ad-btn-sm" onClick={() => setBalance(u.id, editBal[u.id] ?? 0)}>
                Set
              </button>
            </div>

            <div className="ad-action-row">
              <button
                className="ad-btn-danger-sm"
                onClick={() => setConfirm({ message: `Delete ${u.name}? All their data will be removed.`, onConfirm: () => { setConfirm(null); deleteUser(u.id, u.name); } })}
              >
                <Icon.trash /> Delete user
              </button>
            </div>
          </div>
        ))
      )}
      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── SIGNUPS TAB ────────────────────────────────────────────────────────────
function SignupsTab({ token, addToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState({});

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(token, "/admin/signup-requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) { addToast(e.message, "error"); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function confirm(paymentId, action) {
    setLoading(p => ({ ...p, [paymentId]: action }));
    try {
      if (action === "confirm") {
        await apiFetch(token, `/admin/payments/${paymentId}/confirm`, { method: "POST", body: "{}" });
        addToast("Payment confirmed — user account created ✓", "success");
      } else {
        await apiFetch(token, `/admin/payments/${paymentId}/reject`, { method: "POST", body: JSON.stringify({ note: "Rejected by admin" }) });
        addToast("Payment rejected", "warn");
      }
      void load();
    } catch (e) { addToast(e.message, "error"); }
    finally { setLoading(p => ({ ...p, [paymentId]: null })); }
  }

  const pending = requests.filter(r => r.payment_status === "pending");
  const done    = requests.filter(r => r.payment_status !== "pending");

  return (
    <div className="ad-tab-content">
      <div className="ad-summary-grid">
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-amber">{pending.length}</div>
          <div className="ad-summary-lbl">Pending</div>
        </div>
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-green">{done.filter(r => r.payment_status === "confirmed").length}</div>
          <div className="ad-summary-lbl">Confirmed</div>
        </div>
      </div>

      <SectionHeader title="Payment requests" action={load} />

      {requests.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-icon">📬</div>
          <div className="ad-empty-text">No signup requests</div>
        </div>
      ) : (
        requests.map(r => (
          <div key={r.id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={r.name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{r.name}</div>
                <div className="ad-card-sub">{r.email}</div>
              </div>
              <span className={`ad-pill ${r.payment_status === "confirmed" ? "ad-pill-green" : r.payment_status === "rejected" ? "ad-pill-red" : "ad-pill-amber"}`}>
                {r.payment_status || "pending"}
              </span>
            </div>

            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">📱 {r.phone}</span>
              <span className="ad-pill ad-pill-gray">KES {r.amount}</span>
            </div>

            <div className="ad-mpesa-block">
              <span className="ad-mpesa-label">M-Pesa code</span>
              <span className="ad-mpesa-code">{r.mpesa_code || "—"}</span>
            </div>

            {r.payment_status === "pending" && (
              <div className="ad-action-row">
                <button
                  className="ad-btn-approve"
                  disabled={loading[r.payment_id] === "confirm"}
                  onClick={() => confirm(r.payment_id, "confirm")}
                >
                  <Icon.check /> {loading[r.payment_id] === "confirm" ? "Confirming…" : "Confirm payment"}
                </button>
                <button
                  className="ad-btn-reject"
                  disabled={loading[r.payment_id] === "reject"}
                  onClick={() => confirm(r.payment_id, "reject")}
                >
                  <Icon.x /> Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function AdminDashboard({ token, me, onLogout }) {
  const [tab, setTab]       = useState("overview");
  const [toasts, setToasts] = useState([]);
  const toastId             = { current: 0 };

  function addToast(message, type = "info") {
    const id = ++toastId.current;
    setToasts(p => [{ id, message, type }, ...p.slice(0, 3)]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }
  function dismissToast(id) { setToasts(p => p.filter(t => t.id !== id)); }

  const tabs = [
    { id: "overview", label: "Overview", Icon: Icon.overview },
    { id: "tasks",    label: "Tasks",    Icon: Icon.tasks    },
    { id: "users",    label: "Users",    Icon: Icon.users    },
    { id: "signups",  label: "Signups",  Icon: Icon.signups  },
  ];

  return (
    <div className="ad-root">
      <div className="ad-phone">

        {/* Status bar */}
        <div className="ad-statusbar">
          <span className="ad-time">9:41</span>
          <svg width="15" height="10" viewBox="0 0 15 10" fill="rgba(255,255,255,.5)">
            <rect x="0" y="4" width="3" height="6" rx=".5"/>
            <rect x="4" y="2.5" width="3" height="7.5" rx=".5"/>
            <rect x="8" y="1" width="3" height="9" rx=".5"/>
            <rect x="12" y="0" width="3" height="10" rx=".5"/>
          </svg>
        </div>

        {/* Top nav */}
        <div className="ad-topnav">
          <div>
            <div className="ad-topnav-title">Admin</div>
            <div className="ad-topnav-sub">{me?.name}</div>
          </div>
          <button className="ad-logout-btn" onClick={onLogout}>Sign out</button>
        </div>

        {/* Toasts */}
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {/* Body */}
        <div className="ad-body">
          {tab === "overview" && <OverviewTab token={token} addToast={addToast} />}
          {tab === "tasks"    && <TasksTab    token={token} addToast={addToast} />}
          {tab === "users"    && <UsersTab    token={token} addToast={addToast} />}
          {tab === "signups"  && <SignupsTab  token={token} addToast={addToast} />}
        </div>

        {/* Bottom nav */}
        <div className="ad-bottomnav">
          {tabs.map(({ id, label, Icon: TabIcon }) => (
            <button key={id} className={`ad-tabbtn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
              <TabIcon />
              <span className="ad-tabbtn-label">{label}</span>
              {tab === id && <div className="ad-tabbtn-indicator" />}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
