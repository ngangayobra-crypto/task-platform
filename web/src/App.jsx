import "./App.css";
import { useEffect, useState } from "react";
  // UI components
import AuthScreen from "./AuthScreen";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
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
    void loadStats();
    void loadMyTasks();
    void loadAvailableTasks();
    const interval = setInterval(() => { void loadStats(); }, 10000);
    return () => clearInterval(interval);
  }
  if (mode === "admin" && token) {
    void loadAdminTasks();
    void adminLoadClaims();
  }
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



// Then in your return, before the user/admin views:
if (mode === "login" || mode === "register") {
  return (
    <AuthScreen
      onLogin={(data) => {
        setToken(data.token);
        setMe(data.user);
        setMode(data.user.role === "admin" ? "admin" : "user");
        if (data.user.role === "admin") {
          loadAdminTasks(data.token);
          adminLoadSignupRequests(data.token);
        }
      }}
    />
  );

}

if (mode === "user") {
  return (
    <UserDashboard
      token={token}
      me={me}
      onLogout={logout}
    />
  );
}

  // ADMIN DASHBOARD UI
return (
  <AdminDashboard
    token={token}
    me={me}
    onLogout={logout}
  />
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
