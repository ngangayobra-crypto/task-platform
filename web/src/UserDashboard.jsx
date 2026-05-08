import { useCallback, useEffect, useRef, useState } from "react";
import "./UserDashboard.css";
import { REGISTRATION_FEE, TASK_REWARD, WITHDRAW_MIN } from "./lib/constants";
import {
  claimTask,
  getMyPaymentStatus,
  getMyStats,
  listAvailableTasks,
  listMyTasks,
  requestWithdrawal,
  submitAssignment,
  submitMyRegistrationPayment,
} from "./lib/taskPlatform";

const Icon = {
  home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tasks: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  wallet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M16 3l-4 4-4-4" />
      <circle cx="17" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
  profile: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  clock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

function OnboardingCard({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to TaskHive",
      body: "Claim tasks posted by admins, submit your work, and earn money when your submissions are approved.",
    },
    {
      title: "How the flow works",
      body: "Claim an available task, wait for approval if needed, upload your work, and watch your wallet grow after review.",
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="ud-onboarding">
      <h3 className="ud-onboarding-title">{current.title}</h3>
      <p className="ud-onboarding-body">{current.body}</p>

      <div className="ud-onboarding-dots">
        {steps.map((_, index) => (
          <div key={index} className={`ud-onboarding-dot ${index === step ? "active" : ""}`} />
        ))}
      </div>

      <div className="ud-onboarding-actions">
        {step > 0 ? (
          <button className="ud-btn-ghost" onClick={() => setStep((value) => value - 1)}>
            Back
          </button>
        ) : null}
        <button className="ud-btn-primary" onClick={() => (isLast ? onDone() : setStep((value) => value + 1))}>
          {isLast ? "Browse tasks" : "Next"} {!isLast ? <Icon.arrow /> : null}
        </button>
      </div>
    </div>
  );
}

function NotificationBar({ notifications, onDismiss }) {
  if (!notifications.length) return null;

  const notification = notifications[0];

  return (
    <div className={`ud-notif ud-notif-${notification.type}`}>
      <Icon.bell />
      <span className="ud-notif-text">{notification.message}</span>
      <button className="ud-notif-close" onClick={() => onDismiss(notification.id)}>
        <Icon.close />
      </button>
    </div>
  );
}

function WalletCard({ balance, onWithdraw }) {
  const progress = Math.min((balance / WITHDRAW_MIN) * 100, 100);
  const canWithdraw = balance >= WITHDRAW_MIN;

  return (
    <div className="ud-wallet-card">
      <div className="ud-wallet-top">
        <div>
          <div className="ud-wallet-label">Available balance</div>
          <div className="ud-wallet-amount">${Number(balance).toFixed(2)}</div>
        </div>
        <button
          className={`ud-wallet-btn ${canWithdraw ? "ud-wallet-btn-active" : ""}`}
          onClick={onWithdraw}
          disabled={!canWithdraw}
        >
          Withdraw
        </button>
      </div>

      <div className="ud-wallet-progress-wrap">
        <div className="ud-wallet-progress-bg">
          <div className="ud-wallet-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ud-wallet-progress-label">
          {canWithdraw
            ? "Ready to withdraw."
            : `$${(WITHDRAW_MIN - balance).toFixed(2)} more to unlock withdrawals.`}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onClaim, onSubmit, claiming, mode }) {
  const stateLabel = {
    claimed: { text: "Pending approval", cls: "ud-pill-pending" },
    assigned: { text: "Active", cls: "ud-pill-active" },
    submitted: { text: "Under review", cls: "ud-pill-review" },
    completed: { text: "Completed", cls: "ud-pill-done" },
    reviewed: { text: "Reviewed", cls: "ud-pill-done" },
  };

  const pill =
    mode === "available"
      ? null
      : stateLabel[task.state] || { text: task.state, cls: "ud-pill-pending" };

  return (
    <div className="ud-task-card">
      <div className="ud-task-header">
        <span className="ud-task-title">{task.title}</span>
        {pill ? <span className={`ud-pill ${pill.cls}`}>{pill.text}</span> : null}
        {mode === "available" ? <span className="ud-pill ud-pill-earn">${TASK_REWARD.toFixed(2)}</span> : null}
      </div>

      <div className="ud-task-meta">
        {task.due_date ? <span>Due {task.due_date}</span> : null}
        {task.estimated_minutes ? (
          <span className="ud-task-time">
            <Icon.clock /> {task.estimated_minutes} min
          </span>
        ) : null}
      </div>

      {task.description ? <p className="ud-task-desc">{task.description}</p> : null}

      {task.review_status === "rejected" && task.feedback ? (
        <div className="ud-task-feedback">
          <span className="ud-task-feedback-label">Admin feedback:</span> {task.feedback}
        </div>
      ) : null}

      {mode === "available" ? (
        <button className="ud-btn-primary ud-btn-sm" disabled={claiming} onClick={onClaim}>
          {claiming ? "Claiming..." : "Claim task"}
        </button>
      ) : null}

      {mode === "mine" && task.state === "assigned" ? (
        <button className="ud-btn-primary ud-btn-sm" onClick={onSubmit}>
          Submit work
        </button>
      ) : null}

      {mode === "mine" && task.state === "claimed" ? (
        <div className="ud-task-waiting">Waiting for admin approval.</div>
      ) : null}

      {mode === "mine" && (task.state === "submitted" || task.state === "reviewed") ? (
        <div className="ud-task-waiting">Submitted and waiting for review.</div>
      ) : null}

      {mode === "mine" && task.state === "completed" ? (
        <div className="ud-task-done">Approved and paid.</div>
      ) : null}
    </div>
  );
}

function EarningsHistory({ tasks }) {
  const earned = tasks.filter((task) => task.state === "completed");

  if (!earned.length) {
    return (
      <div className="ud-empty">
        <div className="ud-empty-text">No earnings yet</div>
        <div className="ud-empty-sub">Complete approved tasks to build your earnings history.</div>
      </div>
    );
  }

  return (
    <div className="ud-earnings-list">
      {earned.map((task) => (
        <div key={task.assignment_id} className="ud-earnings-row">
          <div className="ud-earnings-info">
            <div className="ud-earnings-task">{task.title}</div>
            <div className="ud-earnings-date">Task #{task.task_id}</div>
          </div>
          <div className="ud-earnings-amount">+${TASK_REWARD.toFixed(2)}</div>
        </div>
      ))}
      <div className="ud-earnings-total">
        <span>Total earned</span>
        <span>${(earned.length * TASK_REWARD).toFixed(2)}</span>
      </div>
    </div>
  );
}

function PaymentGate({ me, paymentStatus, submitting, onSubmit, onLogout }) {
  const [phone, setPhone] = useState(() => paymentStatus?.phone || me?.phone || "");
  const [mpesaCode, setMpesaCode] = useState(() => paymentStatus?.mpesa_code || "");
  const [localError, setLocalError] = useState("");

  const status = paymentStatus?.payment_status || "missing";
  const isRejected = status === "rejected";
  const isPending = status === "pending";

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");

    try {
      await onSubmit({
        phone,
        mpesaCode,
      });
    } catch (error) {
      setLocalError(error.message);
    }
  }

  return (
    <div className="ud-root">
      <div className="ud-phone">
        <div className="ud-statusbar">
          <div className="ud-status-icons">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" opacity=".7">
              <rect x="0" y="4" width="3" height="6" rx=".5" />
              <rect x="4" y="2.5" width="3" height="7.5" rx=".5" />
              <rect x="8" y="1" width="3" height="9" rx=".5" />
              <rect x="12" y="0" width="3" height="10" rx=".5" />
            </svg>
          </div>
        </div>

        <div className="ud-topnav">
          <span className="ud-topnav-title">Complete setup</span>
          <div className="ud-topnav-right">
            <button className="ud-btn-ghost ud-btn-sm" onClick={() => void onLogout()}>
              Sign out
            </button>
          </div>
        </div>

        <div className="ud-body">
          <div className="ud-payment-shell">
            <div className="ud-payment-card">
              <div className="ud-payment-kicker">Required before using the app</div>
              <h2 className="ud-payment-title">Submit your M-Pesa payment</h2>
              <p className="ud-payment-body">
                Send KES {REGISTRATION_FEE} using M-Pesa, then submit the phone number and
                confirmation code here. Once the payment is confirmed, the rest of the app unlocks.
              </p>

              {isPending ? (
                <div className="ud-payment-status ud-payment-status-pending">
                  Payment submitted and waiting for admin confirmation.
                </div>
              ) : null}

              {isRejected ? (
                <div className="ud-payment-status ud-payment-status-rejected">
                  Payment was rejected{paymentStatus?.admin_note ? `: ${paymentStatus.admin_note}` : "."}
                </div>
              ) : null}

              {localError ? (
                <div className="ud-payment-status ud-payment-status-rejected">{localError}</div>
              ) : null}

              <form className="ud-payment-form" onSubmit={handleSubmit}>
                <label className="ud-payment-label" htmlFor="payment-phone">
                  M-Pesa phone number
                </label>
                <input
                  id="payment-phone"
                  className="ud-payment-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="07xxxxxxxx"
                  required
                />

                <label className="ud-payment-label" htmlFor="payment-code">
                  M-Pesa confirmation code
                </label>
                <input
                  id="payment-code"
                  className="ud-payment-input ud-payment-input-mono"
                  value={mpesaCode}
                  onChange={(event) => setMpesaCode(event.target.value.toUpperCase().replace(/\s/g, ""))}
                  placeholder="QJK3H8YT92"
                  minLength={8}
                  maxLength={20}
                  required
                />

                <button className="ud-btn-primary" type="submit" disabled={submitting}>
                  {submitting
                    ? "Saving payment..."
                    : isPending
                      ? "Update payment details"
                      : isRejected
                        ? "Resubmit payment"
                        : "Submit payment"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard({ me, onLogout }) {
  const [tab, setTab] = useState("home");
  const [taskTab, setTaskTab] = useState("available");
  const [myTasks, setMyTasks] = useState([]);
  const [available, setAvailable] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [stats, setStats] = useState({
    claimed: 0,
    approved_to_start: 0,
    completed: 0,
    balance: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [claimingIds, setClaimingIds] = useState({});
  const [search, setSearch] = useState("");
  const [filterTime, setFilterTime] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const previousTaskStates = useRef({});
  const notificationId = useRef(0);

  const addNotification = useCallback((message, type = "info") => {
    const id = notificationId.current + 1;
    notificationId.current = id;
    setNotifications((current) => [{ id, message, type }, ...current].slice(0, 5));
    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const detectChanges = useCallback(
    (nextTasks) => {
      const previous = previousTaskStates.current;

      nextTasks.forEach((task) => {
        const previousState = previous[task.assignment_id];

        if (!previousState) {
          previous[task.assignment_id] = task.state;
          return;
        }

        if (previousState === "claimed" && task.state === "assigned") {
          addNotification(`"${task.title}" was approved. You can start now.`, "success");
        }

        if (previousState === "submitted" && task.state === "completed") {
          addNotification(`"${task.title}" was approved and paid.`, "success");
        }

        if (previousState === "submitted" && task.state === "assigned") {
          addNotification(`"${task.title}" needs changes. Check the admin feedback and resubmit.`, "warn");
        }

        previous[task.assignment_id] = task.state;
      });

      previousTaskStates.current = previous;
    },
    [addNotification],
  );

  const loadPaymentStatus = useCallback(async () => {
    try {
      const nextStatus = await getMyPaymentStatus();
      setPaymentStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const paymentConfirmed = paymentStatus?.payment_status === "confirmed";

  const loadMyTasks = useCallback(async () => {
    try {
      const rows = await listMyTasks();
      const nextTasks = Array.isArray(rows) ? rows : [];
      detectChanges(nextTasks);
      setMyTasks(nextTasks);
    } catch (error) {
      console.error(error);
    }
  }, [detectChanges]);

  const loadAvailable = useCallback(async () => {
    try {
      const rows = await listAvailableTasks();
      setAvailable(Array.isArray(rows) ? rows : []);
      setTasksLoaded(true);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const nextStats = await getMyStats();
      setStats(nextStats);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadPaymentStatus();
  }, [loadPaymentStatus]);

  useEffect(() => {
    if (paymentConfirmed) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadPaymentStatus();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadPaymentStatus, paymentConfirmed]);

  useEffect(() => {
    if (!paymentConfirmed) {
      setMyTasks([]);
      setAvailable([]);
      setStats({
        claimed: 0,
        approved_to_start: 0,
        completed: 0,
        balance: 0,
      });
      setTasksLoaded(false);
      return undefined;
    }

    void loadMyTasks();
    void loadAvailable();
    void loadStats();

    const intervalId = window.setInterval(() => {
      void loadMyTasks();
      void loadStats();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadAvailable, loadMyTasks, loadStats, paymentConfirmed]);

  useEffect(() => {
    if (paymentConfirmed && tasksLoaded && myTasks.length === 0 && available.length >= 0) {
      const seen = window.localStorage.getItem("th_onboarding_done");
      if (!seen) {
        setShowOnboarding(true);
      }
    }
  }, [available.length, myTasks.length, paymentConfirmed, tasksLoaded]);

  async function handlePaymentSubmit(values) {
    setSubmittingPayment(true);

    try {
      await submitMyRegistrationPayment(values);
      const nextStatus = await loadPaymentStatus();

      if (nextStatus?.payment_status === "confirmed") {
        addNotification("Payment confirmed. The app is now unlocked.", "success");
      } else {
        addNotification("Payment details submitted. Waiting for admin confirmation.", "info");
      }
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleClaimTask(taskId) {
    setClaimingIds((current) => ({ ...current, [taskId]: true }));

    try {
      await claimTask(taskId);
      addNotification("Task claimed. Waiting for admin approval.", "info");
      await Promise.all([loadMyTasks(), loadAvailable(), loadStats()]);
      setTaskTab("mine");
    } catch (error) {
      addNotification(error.message, "warn");
      await loadAvailable();
    } finally {
      setClaimingIds((current) => ({ ...current, [taskId]: false }));
    }
  }

  async function handleSubmitWork(assignmentId) {
    const picker = document.createElement("input");
    picker.type = "file";

    picker.onchange = async () => {
      const file = picker.files?.[0] || null;

      try {
        await submitAssignment(assignmentId, file);
        addNotification("Work submitted. It is now waiting for review.", "info");
        await Promise.all([loadMyTasks(), loadStats()]);
      } catch (error) {
        addNotification(error.message, "warn");
      }
    };

    picker.click();
  }

  async function handleWithdraw() {
    try {
      const result = await requestWithdrawal();
      addNotification(`Withdrawal of $${result.amount.toFixed(2)} requested.`, "success");
      await loadStats();
    } catch (error) {
      addNotification(error.message, "warn");
    }
  }

  function finishOnboarding() {
    window.localStorage.setItem("th_onboarding_done", "1");
    setShowOnboarding(false);
    setTab("tasks");
    setTaskTab("available");
  }

  if (!paymentConfirmed) {
    return (
      <PaymentGate
        key={`${paymentStatus?.id || "new"}:${paymentStatus?.updated_at || paymentStatus?.created_at || me?.id || "user"}`}
        me={me}
        paymentStatus={paymentStatus}
        submitting={submittingPayment}
        onSubmit={handlePaymentSubmit}
        onLogout={onLogout}
      />
    );
  }

  const myTaskIds = new Set(myTasks.map((task) => task.task_id));
  const filteredAvailable = available
    .filter((task) => !myTaskIds.has(task.id))
    .filter(
      (task) =>
        !search ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((task) => !filterTime || (task.estimated_minutes && task.estimated_minutes <= filterTime));

  function HomeTab() {
    return (
      <div className="ud-tab-content">
        <div className="ud-greeting">
          <span className="ud-greeting-name">Hey, {me?.name?.split(" ")[0] || "there"}</span>
          <span className="ud-greeting-sub">Here is your overview</span>
        </div>

        {showOnboarding ? <OnboardingCard onDone={finishOnboarding} /> : null}

        <WalletCard balance={stats.balance} onWithdraw={handleWithdraw} />

        <div className="ud-stats-row">
          <div className="ud-stat">
            <div className="ud-stat-num">{stats.claimed}</div>
            <div className="ud-stat-lbl">Claimed</div>
          </div>
          <div className="ud-stat-divider" />
          <div className="ud-stat">
            <div className="ud-stat-num">{stats.approved_to_start}</div>
            <div className="ud-stat-lbl">Active</div>
          </div>
          <div className="ud-stat-divider" />
          <div className="ud-stat">
            <div className="ud-stat-num">{stats.completed}</div>
            <div className="ud-stat-lbl">Done</div>
          </div>
        </div>

        {myTasks.length > 0 ? (
          <div className="ud-section">
            <div className="ud-section-header">
              <span className="ud-section-title">Recent tasks</span>
              <button className="ud-text-btn" onClick={() => setTab("tasks")}>
                See all
              </button>
            </div>
            {myTasks.slice(0, 2).map((task) => (
              <TaskCard
                key={task.assignment_id}
                task={task}
                mode="mine"
                onSubmit={() => void handleSubmitWork(task.assignment_id)}
              />
            ))}
          </div>
        ) : null}

        {myTasks.length === 0 && !showOnboarding ? (
          <div className="ud-empty">
            <div className="ud-empty-text">No tasks yet</div>
            <div className="ud-empty-sub">Head to the Tasks tab to claim your first task.</div>
            <button className="ud-btn-primary" style={{ marginTop: 12 }} onClick={() => setTab("tasks")}>
              Browse tasks
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function TasksTab() {
    return (
      <div className="ud-tab-content">
        <div className="ud-subtabs">
          <button
            className={`ud-subtab ${taskTab === "available" ? "active" : ""}`}
            onClick={() => setTaskTab("available")}
          >
            Available
            {available.filter((task) => !myTaskIds.has(task.id)).length > 0 ? (
              <span className="ud-subtab-badge">{available.filter((task) => !myTaskIds.has(task.id)).length}</span>
            ) : null}
          </button>
          <button className={`ud-subtab ${taskTab === "mine" ? "active" : ""}`} onClick={() => setTaskTab("mine")}>
            My tasks
            {myTasks.length > 0 ? <span className="ud-subtab-badge">{myTasks.length}</span> : null}
          </button>
        </div>

        {taskTab === "available" ? (
          <>
            <div className="ud-search-wrap">
              <Icon.search />
              <input
                className="ud-search"
                placeholder="Search tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search ? (
                <button className="ud-search-clear" onClick={() => setSearch("")}>
                  <Icon.close />
                </button>
              ) : null}
            </div>

            <div className="ud-filters">
              <span className="ud-filter-label">Est. time:</span>
              {[15, 30, 60].map((minutes) => (
                <button
                  key={minutes}
                  className={`ud-chip ${filterTime === minutes ? "active" : ""}`}
                  onClick={() => setFilterTime(filterTime === minutes ? null : minutes)}
                >
                  {"<="} {minutes}m
                </button>
              ))}
              {filterTime ? (
                <button className="ud-chip-clear" onClick={() => setFilterTime(null)}>
                  Clear
                </button>
              ) : null}
            </div>

            {filteredAvailable.length === 0 ? (
              <div className="ud-empty">
                <div className="ud-empty-text">{search || filterTime ? "No matches" : "No tasks available"}</div>
                <div className="ud-empty-sub">
                  {search || filterTime
                    ? "Try a different search or remove a filter."
                    : "Check back soon. New tasks show up here automatically."}
                </div>
              </div>
            ) : (
              filteredAvailable.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="available"
                  claiming={Boolean(claimingIds[task.id])}
                  onClaim={() => void handleClaimTask(task.id)}
                />
              ))
            )}
          </>
        ) : null}

        {taskTab === "mine" ? (
          <>
            {myTasks.length === 0 ? (
              <div className="ud-empty">
                <div className="ud-empty-text">No tasks claimed yet</div>
                <button className="ud-btn-primary" style={{ marginTop: 12 }} onClick={() => setTaskTab("available")}>
                  Browse available
                </button>
              </div>
            ) : (
              myTasks.map((task) => (
                <TaskCard
                  key={task.assignment_id}
                  task={task}
                  mode="mine"
                  onSubmit={() => void handleSubmitWork(task.assignment_id)}
                />
              ))
            )}
          </>
        ) : null}
      </div>
    );
  }

  function WalletTab() {
    return (
      <div className="ud-tab-content">
        <WalletCard balance={stats.balance} onWithdraw={handleWithdraw} />

        <div className="ud-section">
          <div className="ud-section-header">
            <span className="ud-section-title">Earnings history</span>
            <span className="ud-section-sub">
              $
              {(myTasks.filter((task) => task.state === "completed").length * TASK_REWARD).toFixed(2)} total
            </span>
          </div>
          <EarningsHistory tasks={myTasks} />
        </div>
      </div>
    );
  }

  function ProfileTab() {
    const initials = (me?.name || "U")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="ud-tab-content">
        <div className="ud-profile-card">
          <div className="ud-profile-avatar">{initials}</div>
          <div className="ud-profile-name">{me?.name}</div>
          <div className="ud-profile-email">{me?.email}</div>
        </div>

        <div className="ud-profile-stats">
          <div className="ud-pstat">
            <div className="ud-pstat-num">{stats.completed}</div>
            <div className="ud-pstat-lbl">Tasks completed</div>
          </div>
          <div className="ud-pstat">
            <div className="ud-pstat-num">${(stats.completed * TASK_REWARD).toFixed(2)}</div>
            <div className="ud-pstat-lbl">Total earned</div>
          </div>
        </div>

        <button className="ud-btn-danger" onClick={() => void onLogout()}>
          Sign out
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "home", label: "Home", renderIcon: () => <Icon.home /> },
    { id: "tasks", label: "Tasks", renderIcon: () => <Icon.tasks /> },
    { id: "wallet", label: "Wallet", renderIcon: () => <Icon.wallet /> },
    { id: "profile", label: "Profile", renderIcon: () => <Icon.profile /> },
  ];

  return (
    <div className="ud-root">
      <div className="ud-phone">
        <div className="ud-statusbar">
          <div className="ud-status-icons">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" opacity=".7">
              <rect x="0" y="4" width="3" height="6" rx=".5" />
              <rect x="4" y="2.5" width="3" height="7.5" rx=".5" />
              <rect x="8" y="1" width="3" height="9" rx=".5" />
              <rect x="12" y="0" width="3" height="10" rx=".5" />
            </svg>
          </div>
        </div>

        <div className="ud-topnav">
          <span className="ud-topnav-title">{tabs.find((item) => item.id === tab)?.label}</span>
          <div className="ud-topnav-right">
            {notifications.length > 0 ? (
              <div className="ud-notif-badge">
                <Icon.bell />
                <span className="ud-notif-dot" />
              </div>
            ) : null}
          </div>
        </div>

        <NotificationBar notifications={notifications} onDismiss={dismissNotification} />

        <div className="ud-body">
          {tab === "home" ? <HomeTab /> : null}
          {tab === "tasks" ? <TasksTab /> : null}
          {tab === "wallet" ? <WalletTab /> : null}
          {tab === "profile" ? <ProfileTab /> : null}
        </div>

        <div className="ud-bottomnav">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`ud-tabbtn ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.renderIcon()}
              <span className="ud-tabbtn-label">{item.label}</span>
              {tab === item.id ? <div className="ud-tabbtn-indicator" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
