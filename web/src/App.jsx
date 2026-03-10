import "./App.css";
import { useEffect, useState } from "react";

const API = "https://task-platform-api.onrender.com";

async function apiFetch(token, path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : (data?.error || "Request failed"));
  }

  return data;
}

export default function App() {
  const [mode, setMode] = useState("login"); // login | register | admin | user
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");
  const [claimingIds, setClaimingIds] = useState({});

  //user profile and auth
   const [showProfile, setShowProfile] = useState(false);


  // User data
  const [myTasks, setMyTasks] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [stats, setStats] = useState({ claimed: 0, approved_to_start: 0, completed: 0, balance: 0 });
  const myTaskIds = new Set(myTasks.map(t => t.task_id)); // tasks the user already has
const filteredAvailable = availableTasks.filter(t => !myTaskIds.has(t.id));

  // Admin data
  const [users, setUsers] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [createdTaskId, setCreatedTaskId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [signupRequests, setSignupRequests] = useState([]);
  const [claims, setClaims] = useState([]);
  const [usersOverview, setUsersOverview] = useState([]);
const [tasksOverview, setTasksOverview] = useState([]);

async function adminConfirmPayment(paymentId) {
  try {
    setMsg("");
    await apiFetch(token, `/admin/payments/${paymentId}/confirm`, {
      method: "POST",
      body: "{}",
    });
    setMsg("Payment confirmed.");
    await adminLoadSignupRequests();
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminRejectPayment(paymentId) {
  try {
    setMsg("");
    await apiFetch(token, `/admin/payments/${paymentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ note: "Rejected by admin" }),
    });
    setMsg("Payment rejected.");
    await adminLoadSignupRequests();
  } catch (err) {
    setMsg(err.message);
  }
}


async function adminLoadTasksOverview() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/admin/tasks-overview");
    setTasksOverview(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setTasksOverview([]);
  }
}

async function adminLoadUsersOverview() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/admin/users-overview");
    setUsersOverview(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setUsersOverview([]);
  }
}

async function adminDeleteUser(userId) {
  try {
    setMsg("");
    await apiFetch(token, `/admin/users/${userId}`, { method: "DELETE" });
    setMsg("User deleted.");
    await adminLoadUsersOverview();
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminSetBalance(userId, amount) {
  try {
    setMsg("");
    await apiFetch(token, `/admin/users/${userId}/set-balance`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    setMsg("Balance updated.");
    await adminLoadUsersOverview();
  } catch (err) {
    setMsg(err.message);
  }
}

 async function loadAdminTasks(tok = token) {
  try {
    setMsg("");
    const data = await apiFetch(tok, "/tasks");
    setAllTasks(Array.isArray(data) ? data : []);
  } catch (e) {
    setMsg(e.message);
    setAllTasks([]);
  }
}


async function register(e) {
  e.preventDefault();
  setMsg("");

  try {
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());

    body.mpesa_code = String(body.mpesa_code || "").toUpperCase().trim();
    body.amount = Number(body.amount || 100);

    await apiFetch("", "/auth/signup-request", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setMsg("Signup request submitted. Wait for admin to confirm your payment.");
    setMode("login");
  } catch (err) {
    setMsg(err.message);
  }
}

async function requestSignup(e) {
  e.preventDefault();
  setMsg("");

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  body.mpesa_code = String(body.mpesa_code || "").toUpperCase().trim();
  body.amount = Number(body.amount || 100);

  try {
    await apiFetch("", "/auth/signup-request", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setMsg("Signup request submitted! Wait for admin to confirm your payment.");
  } catch (err) {
    setMsg(err.message);
  }
}

async function login(e) {
  e.preventDefault();
  setMsg("");

  try {
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());

    const data = await apiFetch("", "/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setToken(data.token);
    setMe(data.user);
    setMode(data.user.role === "admin" ? "admin" : "user");

   if (data.user.role === "admin") {
  loadAdminTasks(data.token);
  adminLoadSignupRequests(data.token);
}
  } catch (err) {
    setMsg(err.message);
  }
}

  function logout() {
    setToken("");
    setMe(null);
    setMyTasks([]);
    setUsers([]);
    setSubmissions([]);
    setMode("login");
    setMsg("Logged out.");
  }

 async function loadMyTasks() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/tasks/mine");
    setMyTasks(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setMyTasks([]);
  }
}

async function loadAvailableTasks() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/tasks/available"); // apiFetch already returns JSON
    setAvailableTasks(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setAvailableTasks([]);
  }
}

async function claimTask(taskId) {
  try {
    setMsg("");
    setClaimingIds((prev) => ({ ...prev, [taskId]: true })); // disable instantly

    await apiFetch(token, `/tasks/${taskId}/claim`, {
      method: "POST",
      body: "{}",
    });

    setMsg("Task claimed! Waiting admin approval ⏳");

    // Refresh both lists so UI matches backend
    await loadMyTasks();
    await loadAvailableTasks();
  } catch (err) {
    // Friendly message for the known case
    if (String(err.message).includes("Already claimed/assigned")) {
      setMsg("That task was already claimed. Refreshing list…");
      await loadAvailableTasks();
    } else {
      setMsg("Claim failed: " + err.message);
    }
  } finally {
    setClaimingIds((prev) => ({ ...prev, [taskId]: false }));
  }
}

  async function submitWork(assignmentId) {
    setMsg("");
    const pick = document.createElement("input");
    pick.type = "file";
    pick.onchange = async () => {
      const file = pick.files?.[0] || null;
      const form = new FormData();
      form.append("text", "");
      if (file) form.append("file", file);

      const res = await fetch(API + `/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data?.error || "Submit failed");
      setMsg("Submitted!");
      loadMyTasks();
    };
    pick.click();
  }

 async function adminLoadUsers() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/users");
    setUsers(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setUsers([]);
  }
}

 async function adminLoadSignupRequests(tok = token) {
  try {
    setMsg("");
    const data = await apiFetch(tok, "/admin/signup-requests");
    setSignupRequests(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
  }
}



 async function adminCreateTask() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: taskTitle,
        description: taskDesc,
        due_date: taskDue || undefined,
      }),
    });

    setCreatedTaskId(String(data.id));
    setMsg(`Task created! Task ID: ${data.id}`);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDue("");
    await loadAdminTasks();
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminAssignTask() {
  try {
    setMsg("");
    const data = await apiFetch(token, `/tasks/${createdTaskId}/assign`, {
      method: "POST",
      body: JSON.stringify({ user_id: Number(assignUserId) }),
    });
    setMsg(`Assigned! assignment_id = ${data.assignment_id}`);
  } catch (err) {
    setMsg(err.message);
  }
}

 async function adminLoadAllSubmissions() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/submissions");
    setSubmissions(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setSubmissions([]);
  }
}

async function adminLoadClaims() {
  try {
    setMsg("");
    const data = await apiFetch(token, "/admin/claims");
    setClaims(Array.isArray(data) ? data : []);
  } catch (err) {
    setMsg(err.message);
    setClaims([]);
  }
}

async function adminApproveStart(assignmentId) {
  try {
    setMsg("");
    await apiFetch(token, `/assignments/${assignmentId}/approve-start`, {
      method: "POST",
      body: "{}",
    });
    setMsg("Approved to start!");
    await adminLoadClaims();
    await loadAdminTasks();
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminDeleteTask(taskId) {
  try {
    setMsg("");
    await apiFetch(token, `/tasks/${taskId}`, { method: "DELETE" });
    setMsg("Task deleted.");
    await loadAdminTasks();
    await adminLoadAllSubmissions();
    await adminLoadClaims();
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminLoadSubmissions() {
  try {
    setMsg("");
    const data = await apiFetch(token, `/tasks/${createdTaskId}/submissions`);
    setSubmissions(data);
  } catch (err) {
    setMsg(err.message);
  }
}

async function adminReview(submissionId, status) {
  try {
    setMsg("");

    await apiFetch(token, `/submissions/${submissionId}/review`, {
      method: "POST",
      body: JSON.stringify({ review_status: status }),
    });

    setMsg(status === "approved" ? "Approved ✅" : "Rejected ❌");
    await adminLoadAllSubmissions();
  } catch (err) {
    setMsg(err.message);
  }
}

useEffect(() => {
  if (mode === "user" && token) {
    loadStats();
    loadMyTasks();
    loadAvailableTasks();

    // Auto‑refresh stats every 10 seconds while on user dashboard
    const interval = setInterval(() => {
      loadStats();
    }, 10000);

    return () => clearInterval(interval); // Cleanup on unmount
  }

  if (mode === "admin" && token) {
    loadAdminTasks();
    adminLoadClaims();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mode, token]);

async function loadStats() {
  try {
    const data = await apiFetch(token, "/me/stats");
    setStats(data || { claimed: 0, approved_to_start: 0, completed: 0, balance: 0 });
  } catch (err) {
    setMsg(err.message);
  }
}

 async function withdraw() {
  try {
    const data = await apiFetch(token, "/withdraw", { method: "POST", body: "{}" });
    setMsg(`Withdraw requested: $${data.amount}`);
    await loadStats();
  } catch (err) {
    setMsg(err.message);
  }
}

  // UI components
if (mode === "register") {
  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          Task Platform <span className="badge">Signup</span>
        </div>
      </div>

      <div className="card grid" style={{ maxWidth: 420 }}>
        <h1 className="h1">Create Account</h1>
        <form onSubmit={register} className="grid">
          <input className="input" name="name" placeholder="Full name" required />
          <input className="input" name="email" type="email" placeholder="Email" required />
         <input className="input" name="phone" type="phone" placeholder="07xxxxxxxx" required />

<input
  className="input"
  name="mpesa_code"
  placeholder="M-Pesa confirmation code"
  required
  onChange={(e) => {
    e.target.value = e.target.value.toUpperCase();
  }}
/>


          <input className="input" name="password" type="password" placeholder="Password (min 6)" required />
            <input className="input" name="amount" type="number" placeholder="Amount paid (KES)" required />
        
        <div className="agreementBox">
  <h3>User Agreement</h3>

  <div className="agreementScroll">
    <p>
      By creating an account on this platform, you agree to use the system
      honestly and responsibly. All tasks must be completed with original
      work and according to the instructions provided.
    </p>

    <p>
      Submitting copied, automated, or fraudulent work may lead to task
      rejection, account suspension, or permanent removal from the platform.
    </p>

    <p>
      All work submitted by users is reviewed by platform administrators
      before approval. Earnings are only credited after successful review.
    </p>

    <p>
      Withdrawal requests may be processed once the required balance is
      reached. The platform reserves the right to investigate suspicious
      activity before processing payments.
    </p>

    <p>
      By checking the agreement box below and creating an account, you
      confirm that you accept these terms and the platform rules whether
      or not you have read the entire agreement.
    </p>
  </div>
</div>

<label className="agreeCheck">
  <input type="checkbox" required />
  <span>I agree to the User Agreement and platform rules.</span>
</label>

       <button className="btn" type="submit">Sign Up</button>
        </form>

        <button className="btn2" type="button" onClick={() => setMode("login")}>
          Back to login
        </button>

        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}


 if (mode === "login") {
  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          Task Platform 
        </div>
        
      </div>

      <div className="card grid" style={{ maxWidth: 420 }}>
        <h1 className="h1">Welcome back 👋</h1>
        <p className="p">Login to continue</p>

        <form onSubmit={login} className="grid">
          <input className="input" name="email" type="email" placeholder="Email" required />
          <input className="input" name="password" type="password" placeholder="Password" required />

          <button className="btn" type="submit">Login</button>
          <button className="btn2" type="button" onClick={() => setMode("register")}>
            Create account
          </button>
        </form>

        {msg && <div className="msg">{msg}</div>}
      </div>
    </div>
  );
}

  if (mode === "user") {
  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          My Tasks <span className="badge">User</span>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <span className="badge">
            <b>{me?.name}</b>
          </span>
          <button className="btn2" onClick={logout}>Logout</button>
          <button className="btn2" onClick={() => setShowProfile(!showProfile)}>
  {showProfile ? "Hide Profile" : "Profile"}
</button>
        </div>
      </div>
      {showProfile && (
  <div className="card grid" style={{ marginTop: 12 }}>
    <h2 className="h2">My Profile</h2>

    <div className="task">
      <div className="taskTitle">{me?.name || "-"}</div>
      <div className="taskMeta">
        <span className="pill">Email: {me?.email || "-"}</span>
        
      </div>
    </div>
  </div>
)}

<div className="card grid" style={{ marginTop: 12 }}>
  <h2 className="h2">My Progress</h2>
  <div className="taskMeta">
    <span className="pill">Claimed: {stats.claimed}</span>
    <span className="pill">Approved to start: {stats.approved_to_start}</span>
    <span className="pill">Completed: {stats.completed}</span>
    <span className="pill">Balance: ${Number(stats.balance).toFixed(2)}</span>
  </div>

  {/* Manual refresh button */}
  <div className="row">
    <button className="btn2" onClick={loadStats}>Refresh stats</button>
    <button className="btn" disabled={stats.balance < 35} onClick={withdraw}>
      Withdraw (min $35)
    </button>
  </div>
</div>

      <div className="card grid">
        <div className="row">
          <button className="btn" onClick={loadMyTasks}>Refresh tasks</button>
          
        </div>

        {msg && <div className="msg">{msg}</div>}

        {myTasks.length === 0 && (
  <p className="p">No tasks assigned yet.</p>
)}

{/* AVAILABLE TASKS SECTION — PASTE BELOW */}
<div className="card grid" style={{ marginTop: 12 }}>
  <div className="row">
    <h2 className="h2" style={{ margin: 0 }}>Available Tasks</h2>
    <button className="btn2" onClick={loadAvailableTasks}>Load available</button>
  </div>

  {availableTasks.length === 0 ? (
    <p className="p">No available tasks right now.</p>
  ) : (
    <div style={{ maxHeight: 520, overflowY: "auto" }}>
      <div className="taskGrid">
        {filteredAvailable.map((t) => (
          <div key={t.id} className="task">
            <div className="taskTitle">{t.title}</div>
            <div className="taskMeta">
              <span className="pill">Task #{t.id}</span>
              <span className="pill">Due: {t.due_date || "-"}</span>
            </div>
            <div className="p">{t.description}</div>


<button
  className="btn"
  disabled={!!claimingIds[t.id] || myTaskIds.has(t.id)}
  onClick={() => claimTask(t.id)}
>
  {claimingIds[t.id] ? "Claiming..." : "Claim task"}
</button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

        <div className="taskGrid">
        {myTasks.map((t) => {
          const pillClass =
            t.state === "submitted"
              ? "pill submitted"
              : t.state === "reviewed"
              ? "pill reviewed"
              : "pill open";

          return (
            <div key={t.assignment_id} className="task">
              <div className="taskTitle">{t.title}</div>

              <div className="taskMeta">
                <span className={pillClass}>{t.state}</span>

                <span className="pill">Task #{t.task_id}</span>
                <span className="pill">Due: {t.due_date || "-"}</span>
              </div>

              

              <div className="p">{t.description}</div>

              <div className="row">
                {t.state === "submitted" || t.state === "reviewed" || t.state === "completed" ? (
  <span className="badge">Already submitted ✅</span>
) : t.state === "claimed" ? (
  <span className="badge">Waiting admin approval ⏳</span>
) : (
  <button className="btn" onClick={() => submitWork(t.assignment_id)}>
    Submit work
  </button>
)}
              </div>
            </div>
          );
        })}
      </div>  
      </div>
    </div>
  );
}

  // ADMIN DASHBOARD UI
return (
  <div className="container">
    <div className="nav">
      <div className="brand">
        Admin Dashboard <span className="badge">Tasks</span>
      </div>
      <button className="btn2" onClick={logout}>Logout</button>
    </div>

    <div className="grid2">

      {/* USERS OVERVIEW */}
<div className="card grid" style={{ gridColumn: "1 / -1" }}>
  <h2 className="h2">Users Overview</h2>
  <button className="btn" onClick={adminLoadUsersOverview}>Load users overview</button>

  {usersOverview.map(u => (
    <div key={u.id} className="task">
      <div className="taskTitle">{u.name}</div>
      <div className="taskMeta">
        <span className="pill">Email: {u.email}</span>
        <span className="pill">Claimed: {u.tasks_claimed}</span>
        <span className="pill">Submitted: {u.tasks_submitted}</span>
        <span className="pill">Completed: {u.tasks_completed}</span>
        <span className="pill">Balance: ${Number(u.balance).toFixed(2)}</span>
      </div>

      <div className="row">
        <button className="btn2" onClick={() => adminSetBalance(u.id, 0)}>Reset balance</button>
        <button className="btn2" onClick={() => adminDeleteUser(u.id)}>Delete user</button>
      </div>
    </div>
  ))}
</div>

      {/* CREATE TASK */}
      <div className="card grid">
        <h2 className="h2">Create Task</h2>

        <input
          className="input"
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          placeholder="Task title"
        />

        <textarea
          className="textarea"
          value={taskDesc}
          onChange={e => setTaskDesc(e.target.value)}
          placeholder="Task description"
        />

        <input
          className="input"
          value={taskDue}
          onChange={e => setTaskDue(e.target.value)}
          placeholder="Due date (YYYY-MM-DD)"
        />

        <button className="btn" onClick={adminCreateTask}>
          Create Task
        </button>
      </div>

     {/* ASSIGN TASK */}
<div className="card grid">
  <h2 className="h2">Assign Task</h2>

  <div className="row">
    <button className="btn2" onClick={adminLoadUsers}>
      Load users
    </button>
  </div>

  <div className="row">
  <button className="btn2" onClick={loadAdminTasks}>Load tasks</button>
</div>

<select
  className="select"
  value={createdTaskId}
  onChange={(e) => setCreatedTaskId(e.target.value)}
>
  <option value="">Select task</option>
  {allTasks.map((t) => (
    <option key={t.id} value={t.id}>
      #{t.id} — {t.title}
    </option>
  ))}
</select>

  <select
    className="select"
    value={assignUserId}
    onChange={(e) => setAssignUserId(e.target.value)}
  >
    <option value="">Select user</option>
    {users.map((u) => (
      <option key={u.id} value={u.id}>
        {u.name} (ID {u.id})
      </option>
    ))}
  </select>

        <button className="btn" onClick={adminAssignTask}>
          Assign Task
        </button>
      </div>

      {/* SIGNUP PAYMENT REQUESTS */}
<div className="card grid" style={{ gridColumn: "1 / -1" }}>
  <h2 className="h2">Signup Payment Requests</h2>

  <div className="row">
    <button className="btn" onClick={adminLoadSignupRequests}>
      Load payment requests
    </button>
  </div>

  {signupRequests.length === 0 ? (
    <p className="p">No pending requests.</p>
  ) : (
    signupRequests.map((r) => (
      <div key={r.id} className="task">
        <div className="taskTitle">{r.name}</div>

        <div className="taskMeta">
          <span className="pill">#{r.id}</span>
          <span className="pill">Email: {r.email}</span>
          <span className="pill">Phone: {r.phone}</span>
          <span className="pill">Channel: {r.channel}</span>
          <span className="pill">Status: {r.status}</span>
        </div>

        <div className="taskMeta">
          <span className="pill">Amount: KES {r.amount || "-"}</span>
          <span className="pill">M-Pesa Code: {r.mpesa_code || "-"}</span>
          <span className="pill">Payment: {r.payment_status || "pending"}</span>
        </div>

        <div className="row">
          <button className="btn2" onClick={() => adminConfirmPayment(r.payment_id)}>
            Confirm payment
          </button>

          <button className="btn2" onClick={() => adminRejectPayment(r.payment_id)}>
            Reject payment
          </button>
        </div>
      </div>
    ))
  )}
</div>

      {/* CLAIM APPROVALS */}
<div className="card grid" style={{ gridColumn: "1 / -1" }}>
  <h2 className="h2">Claim Approvals</h2>

  <div className="row">
    <button className="btn" onClick={adminLoadClaims}>Load claims</button>
  </div>

  {claims.length === 0 ? (
    <p className="p">No claimed tasks waiting approval.</p>
  ) : (
    <div className="taskGrid">
      {claims.map((c) => (
        <div key={c.assignment_id} className="task">
          <div className="taskTitle">{c.task_title}</div>
          <div className="taskMeta">
            <span className="pill">Task #{c.task_id}</span>
            <span className="pill">Assignment #{c.assignment_id}</span>
            <span className="pill">Due: {c.task_due_date || "-"}</span>
          </div>
          <div className="taskMeta">
            <span className="pill">User: {c.user_name}</span>
            <span className="pill">Email: {c.user_email}</span>
          </div>

          <button className="btn" onClick={() => adminApproveStart(c.assignment_id)}>
            Approve start
          </button>
        </div>
      ))}
    </div>
  )}
</div>

      {/* VIEW SUBMISSIONS */}
      <div className="card grid" style={{ gridColumn: "1 / -1" }}>
        <h2 className="h2">View Submissions</h2>

        <div className="grid">
  <select
    className="select"
    value={createdTaskId}
    onChange={(e) => setCreatedTaskId(e.target.value)}
  >
    <option value="">Select a task</option>
    {allTasks.map((t) => (
      <option key={t.id} value={t.id}>
        #{t.id} — {t.title}
      </option>
    ))}
  </select>

  <button className="btn" onClick={adminLoadAllSubmissions}>Load All Submissions

  </button>

    <button className="btn2" onClick={loadAdminTasks}>
      Reload tasks
    </button>
  </div>
</div>

        {submissions.map(s => (
          <div key={s.assignment_id} className="task">
            <div className="taskTitle">{s.user_name}</div>
            <div className="taskMeta">Email: {s.user_email}</div>
            <div className="taskMeta">Task: <b>{s.task_title}</b> (#{s.task_id})</div>
            <div className="taskMeta">
  Status: <b>{s.review_status || "pending"}</b>
</div>
            <div>Text: {s.text || "No text submitted"}</div>

            {s.file_path && (
              <a href={`${API}/uploads/${s.file_path}`} target="_blank">
                Download File
              </a>
            )}

            {s.submission_id && (
  <div className="row">
    <button className="btn" onClick={() => adminReview(s.submission_id,"approved")}>
      Approve
    </button>
    <button className="btn2" onClick={() => adminReview(s.submission_id,"rejected")}>
      Reject
    </button>
  </div>
)}
          </div>
        ))}
      </div>

      {/* TASKS OVERVIEW */}
<div className="card grid" style={{ gridColumn: "1 / -1" }}>
  <h2 className="h2">Tasks Overview</h2>
  <button className="btn" onClick={adminLoadTasksOverview}>Load tasks overview</button>

  <div className="taskGrid">
    {tasksOverview.map(t => (
      <div key={t.id} className="task">
        <div className="taskTitle">{t.title}</div>
        <div className="taskMeta">
          <span className="pill">#{t.id}</span>
          <span className="pill">Due: {t.due_date || "-"}</span>
          <span className="pill">Claims: {t.claim_count}</span>
        </div>
        <div className="p">{t.description}</div>
        <div className="taskMeta">Claimers: {t.claimers || "None"}</div>

        <button className="btn2" onClick={() => adminDeleteTask(t.id)}>Delete task</button>
      </div>
    ))}
  </div>
</div>

    </div>
    
);
  


function TopBar({ me, onLogout }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
         <b>{me?.name}</b> ({me?.role})
      </div>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}





const wrap = { maxWidth: 850, margin: "30px auto", fontFamily: "Arial", padding: 12 };
const card = { display: "grid", gap: 10, padding: 14, border: "1px solid #ddd", borderRadius: 12 };
const taskCard = { padding: 14, border: "1px solid #ddd", borderRadius: 12, marginTop: 12, display: "grid", gap: 8 };
const msgStyle = { color: "crimson" };
}
