import { useCallback, useEffect, useRef, useState } from "react";
import "./AdminDashboard.css";
import { DEFAULT_TASK_REWARD } from "./lib/constants";
import {
  approveAssignmentStart,
  assignTask,
  confirmSignupPayment,
  createSubmissionFileUrl,
  createTask,
  deleteTask,
  deleteUserAccount,
  listClaims,
  listSignupRequests,
  listSubmissions,
  listTasksOverview,
  listUsersOverview,
  rejectSignupPayment,
  reviewSubmission,
  setUserBalance,
} from "./lib/taskPlatform";

const Icon = {
  overview: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  tasks: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  signups: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  close: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),
  clock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

function Confirm({ message, onConfirm, onCancel }) {
  return (
    <div className="ad-confirm-backdrop">
      <div className="ad-confirm-box">
        <p className="ad-confirm-msg">{message}</p>
        <div className="ad-confirm-actions">
          <button className="ad-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="ad-btn-danger-sm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="ad-toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ad-toast ad-toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="ad-toast-close" onClick={() => onDismiss(toast.id)}>
            <Icon.close />
          </button>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = (name || "?")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];
  const color = colors[initials.charCodeAt(0) % colors.length];

  return (
    <div
      className="ad-avatar"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}

function SectionHeader({ title, action, actionLabel = "Refresh" }) {
  return (
    <div className="ad-section-header">
      <span className="ad-section-title">{title}</span>
      {action ? (
        <button className="ad-text-btn" onClick={action}>
          {actionLabel} <Icon.refresh />
        </button>
      ) : null}
    </div>
  );
}

function OverviewTab({ addToast }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState({});
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const rows = await listClaims();
      setClaims(Array.isArray(rows) ? rows : []);
    } catch (error) {
      addToast(error.message, "error");
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(assignmentId) {
    setLoading((current) => ({ ...current, [assignmentId]: true }));

    try {
      await approveAssignmentStart(assignmentId);
      addToast("Claim approved.", "success");
      await load();
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading((current) => ({ ...current, [assignmentId]: false }));
    }
  }

  const pending = claims.filter((claim) => claim.state === "claimed");

  return (
    <div className="ad-tab-content">
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
          <div className="ad-empty-text">All caught up</div>
          <div className="ad-empty-sub">No claims are waiting for approval.</div>
        </div>
      ) : (
        pending.map((claim) => (
          <div key={claim.assignment_id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={claim.user_name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{claim.user_name}</div>
                <div className="ad-card-sub">{claim.user_email}</div>
              </div>
            </div>
            <div className="ad-card-task-name">{claim.task_title}</div>
            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">Task #{claim.task_id}</span>
              {claim.task_due_date ? (
                <span className="ad-pill ad-pill-gray">Due {claim.task_due_date}</span>
              ) : null}
            </div>
            <div className="ad-action-row">
              <button
                className="ad-btn-approve"
                disabled={loading[claim.assignment_id]}
                onClick={() =>
                  setConfirm({
                    message: `Approve "${claim.user_name}" to start "${claim.task_title}"?`,
                    onConfirm: () => {
                      setConfirm(null);
                      void handleApprove(claim.assignment_id);
                    },
                  })
                }
              >
                <Icon.check /> {loading[claim.assignment_id] ? "Approving..." : "Approve start"}
              </button>
            </div>
          </div>
        ))
      )}

      {confirm ? <Confirm {...confirm} onCancel={() => setConfirm(null)} /> : null}
    </div>
  );
}

function TasksTab({ addToast }) {
  const [view, setView] = useState("list");
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    estimated_minutes: "",
    reward_amount: String(DEFAULT_TASK_REWARD),
  });

  const loadTasks = useCallback(async () => {
    try {
      const rows = await listTasksOverview();
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (error) {
      addToast(error.message, "error");
    }
  }, [addToast]);

  const loadSubmissionsForTask = useCallback(
    async (taskId = null) => {
      try {
        const rows = await listSubmissions(taskId);
        setSubmissions(Array.isArray(rows) ? rows : []);
      } catch (error) {
        addToast(error.message, "error");
      }
    },
    [addToast],
  );

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleCreateTask() {
    if (!form.title.trim() || !form.description.trim()) {
      addToast("Title and description are required.", "error");
      return;
    }

    const rewardAmount = Number(form.reward_amount);

    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      addToast("Reward amount must be greater than zero.", "error");
      return;
    }

    setCreating(true);

    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.due_date || null,
        estimatedMinutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        rewardAmount,
      });
      addToast("Task created.", "success");
      setForm({
        title: "",
        description: "",
        due_date: "",
        estimated_minutes: "",
        reward_amount: String(DEFAULT_TASK_REWARD),
      });
      setView("list");
      await loadTasks();
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTask(taskId, title) {
    try {
      await deleteTask(taskId);
      addToast(`"${title}" deleted.`, "success");
      await loadTasks();
      if (view === "submissions") {
        setSelectedTask(null);
        setView("list");
      }
    } catch (error) {
      addToast(error.message, "error");
    }
  }

  async function handleReviewSubmission(submission, status) {
    try {
      await reviewSubmission(submission.submission_id, status);
      const rewardAmount = Number(submission.reward_amount || DEFAULT_TASK_REWARD);
      addToast(
        status === "approved"
          ? `Submission approved and $${rewardAmount.toFixed(2)} paid.`
          : "Submission rejected.",
        status === "approved" ? "success" : "warn",
      );
      await loadSubmissionsForTask(selectedTask?.id || null);
      await loadTasks();
    } catch (error) {
      addToast(error.message, "error");
    }
  }

  async function handleOpenFile(submissionId, filePath) {
    if (!filePath) return;

    setDownloadingId(submissionId);

    try {
      const url = await createSubmissionFileUrl(filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setDownloadingId(null);
    }
  }

  const pendingSubmissions = submissions.filter((item) => item.review_status === "pending");

  if (view === "create") {
    return (
      <div className="ad-tab-content">
        <button className="ad-back-btn" onClick={() => setView("list")}>
          Back to tasks
        </button>
        <div className="ad-form-card">
          <div className="ad-form-title">New task</div>
          <div className="ad-field">
            <label className="ad-label">Title</label>
            <input
              className="ad-input"
              placeholder="Write a product review"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="ad-field">
            <label className="ad-label">Description</label>
            <textarea
              className="ad-textarea"
              placeholder="Describe the task clearly."
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="ad-field-row">
            <div className="ad-field">
              <label className="ad-label">Due date</label>
              <input
                className="ad-input"
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, due_date: event.target.value }))
                }
              />
            </div>
            <div className="ad-field">
              <label className="ad-label">Est. minutes</label>
              <input
                className="ad-input"
                type="number"
                placeholder="20"
                value={form.estimated_minutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estimated_minutes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="ad-field">
              <label className="ad-label">Reward ($)</label>
              <input
                className="ad-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={String(DEFAULT_TASK_REWARD)}
                value={form.reward_amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reward_amount: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <button className="ad-btn-primary" disabled={creating} onClick={handleCreateTask}>
            {creating ? "Creating..." : (
              <>
                <Icon.plus /> Create task
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (view === "submissions") {
    const filtered = selectedTask
      ? submissions.filter((item) => item.task_id === selectedTask.id)
      : submissions;

    return (
      <div className="ad-tab-content">
        <button
          className="ad-back-btn"
          onClick={() => {
            setSelectedTask(null);
            setView("list");
          }}
        >
          Back to tasks
        </button>
        <SectionHeader
          title={selectedTask ? `"${selectedTask.title}" submissions` : "All submissions"}
          action={() => loadSubmissionsForTask(selectedTask?.id || null)}
        />

        {filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-text">No submissions yet</div>
          </div>
        ) : (
          filtered.map((submission) => (
            <div key={submission.assignment_id} className="ad-card">
              <div className="ad-card-row">
                <Avatar name={submission.user_name} />
                <div className="ad-card-info">
                  <div className="ad-card-title">{submission.user_name}</div>
                  <div className="ad-card-sub">{submission.user_email}</div>
                </div>
                <span
                  className={`ad-pill ${
                    submission.review_status === "approved"
                      ? "ad-pill-green"
                      : submission.review_status === "rejected"
                        ? "ad-pill-red"
                        : "ad-pill-amber"
                  }`}
                >
                  {submission.review_status || "pending"}
                </span>
              </div>

              {!selectedTask ? (
                <div className="ad-card-task-name">{submission.task_title}</div>
              ) : null}

              <div className="ad-meta-row">
                <span className="ad-pill ad-pill-amber">${Number(submission.reward_amount).toFixed(2)} reward</span>
                {submission.task_due_date ? (
                  <span className="ad-pill ad-pill-gray">Due {submission.task_due_date}</span>
                ) : null}
              </div>

              {submission.text ? (
                <div className="ad-submission-text">"{submission.text}"</div>
              ) : null}

              {submission.file_path ? (
                <button
                  className="ad-file-link"
                  onClick={() => void handleOpenFile(submission.submission_id, submission.file_path)}
                >
                  <Icon.download /> {downloadingId === submission.submission_id ? "Opening..." : "Open file"}
                </button>
              ) : null}

              {submission.submission_id && submission.review_status === "pending" ? (
                <div className="ad-action-row">
                  <button
                    className="ad-btn-approve"
                    onClick={() => void handleReviewSubmission(submission, "approved")}
                  >
                    <Icon.check /> Approve
                  </button>
                  <button
                    className="ad-btn-reject"
                    onClick={() => void handleReviewSubmission(submission, "rejected")}
                  >
                    <Icon.close /> Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="ad-tab-content">
      <div className="ad-toolbar">
        <button className="ad-btn-primary ad-btn-sm" onClick={() => setView("create")}>
          <Icon.plus /> New task
        </button>
        <button
          className="ad-btn-ghost ad-btn-sm"
          onClick={async () => {
            setSelectedTask(null);
            await loadSubmissionsForTask(null);
            setView("submissions");
          }}
        >
          View all submissions
          {pendingSubmissions.length > 0 ? (
            <span className="ad-inline-badge">{pendingSubmissions.length}</span>
          ) : null}
        </button>
      </div>

      <SectionHeader title="All tasks" action={loadTasks} />

      {tasks.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-text">No tasks yet</div>
          <button className="ad-btn-primary ad-btn-sm" style={{ marginTop: 12 }} onClick={() => setView("create")}>
            Create first task
          </button>
        </div>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="ad-card">
            <div className="ad-card-row" style={{ alignItems: "flex-start" }}>
              <div className="ad-card-info" style={{ flex: 1 }}>
                <div className="ad-card-title">{task.title}</div>
                <div className="ad-card-sub">
                  {task.description?.slice(0, 80)}
                  {task.description?.length > 80 ? "..." : ""}
                </div>
              </div>
              <span className={`ad-pill ${task.status === "open" ? "ad-pill-green" : "ad-pill-gray"}`}>
                {task.status}
              </span>
            </div>

            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">#{task.id}</span>
              <span className="ad-pill ad-pill-amber">${Number(task.reward_amount).toFixed(2)} reward</span>
              {task.due_date ? <span className="ad-pill ad-pill-gray">Due {task.due_date}</span> : null}
              {task.estimated_minutes ? (
                <span className="ad-pill ad-pill-gray">
                  <Icon.clock /> {task.estimated_minutes}m
                </span>
              ) : null}
              <span className="ad-pill ad-pill-amber">{task.claim_count} claimed</span>
            </div>

            {task.claimers ? <div className="ad-claimers">Claimers: {task.claimers}</div> : null}

            <div className="ad-action-row">
              <button
                className="ad-btn-ghost ad-btn-sm"
                onClick={async () => {
                  setSelectedTask(task);
                  await loadSubmissionsForTask(task.id);
                  setView("submissions");
                }}
              >
                View submissions
              </button>
              <button
                className="ad-btn-danger-sm"
                onClick={() =>
                  setConfirm({
                    message: `Delete "${task.title}"? This cannot be undone.`,
                    onConfirm: () => {
                      setConfirm(null);
                      void handleDeleteTask(task.id, task.title);
                    },
                  })
                }
              >
                <Icon.trash />
              </button>
            </div>
          </div>
        ))
      )}

      {confirm ? <Confirm {...confirm} onCancel={() => setConfirm(null)} /> : null}
    </div>
  );
}

function UsersTab({ addToast }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editBalance, setEditBalance] = useState({});
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const rows = await listUsersOverview();
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (error) {
      addToast(error.message, "error");
    }
  }, [addToast]);

  const loadTasks = useCallback(async () => {
    try {
      const rows = await listTasksOverview();
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (error) {
      addToast(error.message, "error");
    }
  }, [addToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleDeleteUser(userId, name) {
    try {
      await deleteUserAccount(userId);
      addToast(`${name} deleted.`, "success");
      await loadUsers();
    } catch (error) {
      addToast(error.message, "error");
    }
  }

  async function handleSetBalance(userId, amount) {
    try {
      await setUserBalance(userId, amount || 0);
      addToast("Balance updated.", "success");
      setEditBalance((current) => ({ ...current, [userId]: "" }));
      await loadUsers();
    } catch (error) {
      addToast(error.message, "error");
    }
  }

  async function handleAssignTask() {
    if (!assignTaskId || !assignUserId) {
      addToast("Choose both a task and a user.", "error");
      return;
    }

    setAssigning(true);

    try {
      await assignTask(Number(assignTaskId), assignUserId);
      addToast("Task assigned.", "success");
      setAssignTaskId("");
      setAssignUserId("");
      setShowAssign(false);
      await Promise.all([loadUsers(), loadTasks()]);
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setAssigning(false);
    }
  }

  const assignableTasks = tasks.filter((task) => task.status === "open" && task.claim_count === 0);
  const assignableUsers = users.filter((user) => user.account_status !== "rejected");

  return (
    <div className="ad-tab-content">
      <button
        className="ad-btn-ghost ad-btn-sm"
        onClick={async () => {
          const next = !showAssign;
          setShowAssign(next);
          if (next) {
            await loadTasks();
          }
        }}
      >
        {showAssign ? "Hide assign panel" : "Assign task to user"}
      </button>

      {showAssign ? (
        <div className="ad-form-card">
          <div className="ad-form-title">Assign task</div>
          <div className="ad-field">
            <label className="ad-label">Task</label>
            <select
              className="ad-select"
              value={assignTaskId}
              onChange={(event) => setAssignTaskId(event.target.value)}
            >
              <option value="">Select a task</option>
              {assignableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  #{task.id} - {task.title} (${Number(task.reward_amount).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="ad-field">
            <label className="ad-label">User</label>
            <select
              className="ad-select"
              value={assignUserId}
              onChange={(event) => setAssignUserId(event.target.value)}
            >
              <option value="">Select a user</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.phone || user.email})
                </option>
              ))}
            </select>
          </div>
          <button className="ad-btn-primary" disabled={assigning} onClick={handleAssignTask}>
            {assigning ? "Assigning..." : "Assign"}
          </button>
        </div>
      ) : null}

      <SectionHeader title={`Users (${users.length})`} action={loadUsers} />

      {users.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-text">No users yet</div>
        </div>
      ) : (
        users.map((user) => (
          <div key={user.id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={user.name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{user.name}</div>
                <div className="ad-card-sub">{user.email}</div>
                {user.phone ? <div className="ad-card-meta-note">{user.phone}</div> : null}
              </div>
              <div className="ad-balance-display">${Number(user.balance).toFixed(2)}</div>
            </div>

            <div className="ad-meta-row">
              {user.phone ? <span className="ad-pill ad-pill-gray">Phone {user.phone}</span> : null}
              <span className="ad-pill ad-pill-gray">Claimed: {user.tasks_claimed}</span>
              <span className="ad-pill ad-pill-gray">Submitted: {user.tasks_submitted}</span>
              <span className="ad-pill ad-pill-gray">Done: {user.tasks_completed}</span>
              <span
                className={`ad-pill ${
                  user.account_status === "active"
                    ? "ad-pill-green"
                    : user.account_status === "rejected"
                      ? "ad-pill-red"
                      : "ad-pill-amber"
                }`}
              >
                {user.account_status}
              </span>
            </div>

            <div className="ad-balance-row">
              <input
                className="ad-input ad-input-sm"
                type="number"
                placeholder={`Set balance (currently $${Number(user.balance).toFixed(2)})`}
                value={editBalance[user.id] ?? ""}
                onChange={(event) =>
                  setEditBalance((current) => ({
                    ...current,
                    [user.id]: event.target.value,
                  }))
                }
              />
              <button
                className="ad-btn-ghost ad-btn-sm"
                onClick={() => void handleSetBalance(user.id, editBalance[user.id] ?? 0)}
              >
                Set
              </button>
            </div>

            <div className="ad-action-row">
              <button
                className="ad-btn-danger-sm"
                onClick={() =>
                  setConfirm({
                    message: `Delete ${user.name}? Their account and app data will be removed.`,
                    onConfirm: () => {
                      setConfirm(null);
                      void handleDeleteUser(user.id, user.name);
                    },
                  })
                }
              >
                <Icon.trash /> Delete user
              </button>
            </div>
          </div>
        ))
      )}

      {confirm ? <Confirm {...confirm} onCancel={() => setConfirm(null)} /> : null}
    </div>
  );
}

function SignupsTab({ addToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState({});

  const load = useCallback(async () => {
    try {
      const rows = await listSignupRequests();
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (error) {
      addToast(error.message, "error");
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDecision(paymentId, action) {
    setLoading((current) => ({ ...current, [paymentId]: action }));

    try {
      if (action === "confirm") {
        await confirmSignupPayment(paymentId);
        addToast("Payment confirmed and account activated.", "success");
      } else {
        await rejectSignupPayment(paymentId, "Rejected by admin");
        addToast("Payment rejected.", "warn");
      }
      await load();
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading((current) => ({ ...current, [paymentId]: null }));
    }
  }

  const pending = requests.filter((request) => request.payment_status === "pending");
  const confirmedCount = requests.filter((request) => request.payment_status === "confirmed").length;

  return (
    <div className="ad-tab-content">
      <div className="ad-summary-grid">
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-amber">{pending.length}</div>
          <div className="ad-summary-lbl">Pending</div>
        </div>
        <div className="ad-summary-card">
          <div className="ad-summary-num ad-green">{confirmedCount}</div>
          <div className="ad-summary-lbl">Confirmed</div>
        </div>
      </div>

      <SectionHeader title="Payment requests" action={load} />

      {requests.length === 0 ? (
        <div className="ad-empty">
          <div className="ad-empty-text">No signup requests</div>
        </div>
      ) : (
        requests.map((request) => (
          <div key={request.id} className="ad-card">
            <div className="ad-card-row">
              <Avatar name={request.name} />
              <div className="ad-card-info">
                <div className="ad-card-title">{request.name}</div>
                <div className="ad-card-sub">{request.email}</div>
              </div>
              <span
                className={`ad-pill ${
                  request.payment_status === "confirmed"
                    ? "ad-pill-green"
                    : request.payment_status === "rejected"
                      ? "ad-pill-red"
                      : "ad-pill-amber"
                }`}
              >
                {request.payment_status || "pending"}
              </span>
            </div>

            <div className="ad-meta-row">
              <span className="ad-pill ad-pill-gray">{request.phone}</span>
              <span className="ad-pill ad-pill-gray">KES {request.amount}</span>
            </div>

            <div className="ad-mpesa-block">
              <span className="ad-mpesa-label">M-Pesa code</span>
              <span className="ad-mpesa-code">{request.mpesa_code || "-"}</span>
            </div>

            {request.payment_status === "pending" ? (
              <div className="ad-action-row">
                <button
                  className="ad-btn-approve"
                  disabled={loading[request.payment_id] === "confirm"}
                  onClick={() => void handleDecision(request.payment_id, "confirm")}
                >
                  <Icon.check /> {loading[request.payment_id] === "confirm" ? "Confirming..." : "Confirm payment"}
                </button>
                <button
                  className="ad-btn-reject"
                  disabled={loading[request.payment_id] === "reject"}
                  onClick={() => void handleDecision(request.payment_id, "reject")}
                >
                  <Icon.close /> Reject
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard({ me, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const addToast = useCallback((message, type = "info") => {
    const id = toastId.current + 1;
    toastId.current = id;

    setToasts((current) => [{ id, message, type }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", renderIcon: () => <Icon.overview /> },
    { id: "tasks", label: "Tasks", renderIcon: () => <Icon.tasks /> },
    { id: "users", label: "Users", renderIcon: () => <Icon.users /> },
    { id: "signups", label: "Signups", renderIcon: () => <Icon.signups /> },
  ];

  return (
    <div className="ad-root">
      <div className="ad-phone">
        <div className="ad-statusbar">
          <span className="ad-time">Admin</span>
          <svg width="15" height="10" viewBox="0 0 15 10" fill="rgba(255,255,255,.5)">
            <rect x="0" y="4" width="3" height="6" rx=".5" />
            <rect x="4" y="2.5" width="3" height="7.5" rx=".5" />
            <rect x="8" y="1" width="3" height="9" rx=".5" />
            <rect x="12" y="0" width="3" height="10" rx=".5" />
          </svg>
        </div>

        <div className="ad-topnav">
          <div>
            <div className="ad-topnav-title">TaskHive Admin</div>
            <div className="ad-topnav-sub">{me?.name}</div>
            <div className="ad-topnav-meta">{me?.phone || "No phone saved on this admin account"}</div>
          </div>
          <button className="ad-logout-btn" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>

        <Toast toasts={toasts} onDismiss={dismissToast} />

        <div className="ad-body">
          {tab === "overview" ? <OverviewTab addToast={addToast} /> : null}
          {tab === "tasks" ? <TasksTab addToast={addToast} /> : null}
          {tab === "users" ? <UsersTab addToast={addToast} /> : null}
          {tab === "signups" ? <SignupsTab addToast={addToast} /> : null}
        </div>

        <div className="ad-bottomnav">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`ad-tabbtn ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.renderIcon()}
              <span className="ad-tabbtn-label">{item.label}</span>
              {tab === item.id ? <div className="ad-tabbtn-indicator" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
