import { DEFAULT_TASK_REWARD, REGISTRATION_FEE, SUBMISSION_BUCKET } from "./constants";
import { supabase } from "./supabase";

function messageFromError(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  const rawMessage =
    typeof error === "string" ? error : error.message || error.error_description || fallback;
  const message = String(rawMessage);
  const lower = message.toLowerCase();

  if (lower.includes("email rate limit exceeded") || lower.includes("email rate exceeded")) {
    return "Supabase already sent a confirmation email for this address. Check the inbox or spam folder for that email, or wait a bit before trying again.";
  }

  if (lower.includes("email not confirmed")) {
    return "This account exists, but the email has not been confirmed yet. Open the confirmation email from Supabase, then sign in again.";
  }

  return message;
}

function throwIfError(error, fallback) {
  if (error) {
    throw new Error(messageFromError(error, fallback));
  }
}

function toInt(value) {
  return value == null ? null : Number(value);
}

function toMoney(value) {
  return value == null ? 0 : Number(value);
}

function normalizeReward(value) {
  const amount = toMoney(value);
  return amount > 0 ? amount : DEFAULT_TASK_REWARD;
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function mapAuthUser(user, profile) {
  return {
    id: user.id,
    name: profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    phone: profile?.phone || "",
    role: profile?.role || "user",
    account_status: profile?.account_status || "pending",
  };
}

async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  throwIfError(error, `Could not run "${fn}".`);
  return data;
}

async function rpcSingle(fn, args = {}) {
  const data = await rpc(fn, args);
  if (Array.isArray(data)) return data[0] || null;
  return data ?? null;
}

async function getRequiredAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  throwIfError(error, "Could not read the current user.");

  if (!user) {
    throw new Error("You need to sign in again.");
  }

  return user;
}

async function getCurrentProfile(userId, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, phone, role, account_status")
      .eq("id", userId)
      .maybeSingle();

    throwIfError(error, "Could not load your profile.");

    if (data) {
      return data;
    }

    if (attempt < retries) {
      await delay(250);
    }
  }

  throw new Error("Profile not found. Run the Supabase setup SQL before using the app.");
}

function normalizeAvailableTask(row) {
  return {
    ...row,
    id: toInt(row.id),
    estimated_minutes: toInt(row.estimated_minutes),
    reward_amount: normalizeReward(row.reward_amount),
  };
}

function normalizeMyTask(row) {
  return {
    ...row,
    assignment_id: toInt(row.assignment_id),
    task_id: toInt(row.task_id),
    estimated_minutes: toInt(row.estimated_minutes),
    reward_amount: normalizeReward(row.reward_amount),
  };
}

function normalizeSignupRequest(row) {
  return {
    ...row,
    id: toInt(row.id),
    payment_id: toInt(row.payment_id),
    amount: toMoney(row.amount),
  };
}

function normalizeClaim(row) {
  return {
    ...row,
    assignment_id: toInt(row.assignment_id),
    task_id: toInt(row.task_id),
  };
}

function normalizeSubmission(row) {
  return {
    ...row,
    submission_id: toInt(row.submission_id),
    assignment_id: toInt(row.assignment_id),
    task_id: toInt(row.task_id),
    reward_amount: normalizeReward(row.reward_amount),
  };
}

function normalizeTasksOverview(row) {
  return {
    ...row,
    id: toInt(row.id),
    estimated_minutes: toInt(row.estimated_minutes),
    claim_count: toInt(row.claim_count) || 0,
    reward_amount: normalizeReward(row.reward_amount),
  };
}

function normalizeUsersOverview(row) {
  return {
    ...row,
    phone: row.phone || "",
    tasks_claimed: toInt(row.tasks_claimed) || 0,
    tasks_submitted: toInt(row.tasks_submitted) || 0,
    tasks_completed: toInt(row.tasks_completed) || 0,
    balance: toMoney(row.balance),
    account_status: row.account_status || "pending",
  };
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  throwIfError(error, "Could not load the current session.");
  return session;
}

export function onAuthStateChange(handler) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    handler(event, session);
  });

  return subscription;
}

export async function getAuthenticatedUser(user) {
  const profile = await getCurrentProfile(user.id, 5);
  return mapAuthUser(user, profile);
}

export async function signUpUser({ name, email, phone, password }) {
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        name: trimmedName,
        phone: trimmedPhone,
      },
    },
  });

  throwIfError(error, "Could not create your account.");

  return {
    ...data,
    email: trimmedEmail,
    signedIn: Boolean(data.session && data.user),
    requiresEmailConfirmation: !data.session,
  };
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  throwIfError(error, "Could not sign you in.");

  if (!data.user) {
    throw new Error("Sign-in did not return a user.");
  }

  const profile = await getCurrentProfile(data.user.id);
  const me = mapAuthUser(data.user, profile);
  return me;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  throwIfError(error, "Could not sign out.");
}

export async function listAvailableTasks() {
  const data = await rpc("list_available_tasks");
  return (data || []).map(normalizeAvailableTask);
}

export async function listMyTasks() {
  const data = await rpc("list_my_tasks");
  return (data || []).map(normalizeMyTask);
}

export async function getMyStats() {
  const row = await rpcSingle("get_my_stats");

  return {
    claimed: toInt(row?.claimed) || 0,
    approved_to_start: toInt(row?.approved_to_start) || 0,
    completed: toInt(row?.completed) || 0,
    balance: toMoney(row?.balance),
  };
}

export async function getMyPaymentStatus() {
  const row = await rpcSingle("get_my_payment_status");

  if (!row) {
    return null;
  }

  return {
    payment_id: toInt(row.payment_id),
    amount: toMoney(row.amount || REGISTRATION_FEE),
    phone: row.phone || "",
    mpesa_code: row.mpesa_code || "",
    payment_status: row.payment_status || "pending",
    admin_note: row.admin_note || "",
    submitted_at: row.submitted_at || null,
    confirmed_at: row.confirmed_at || null,
  };
}

export async function submitMyRegistrationPayment({ phone, mpesaCode, amount = REGISTRATION_FEE }) {
  return rpcSingle("submit_my_registration_payment", {
    p_phone: phone.trim(),
    p_mpesa_code: mpesaCode.trim().toUpperCase(),
    p_amount: Number(amount) || REGISTRATION_FEE,
    p_channel: "sms",
  });
}

export async function claimTask(taskId) {
  const assignmentId = await rpcSingle("claim_task", { p_task_id: taskId });
  return toInt(assignmentId);
}

export async function requestWithdrawal() {
  const row = await rpcSingle("request_withdrawal");

  return {
    ok: Boolean(row?.ok),
    amount: toMoney(row?.amount),
  };
}

export async function createTask({ title, description, dueDate, estimatedMinutes, rewardAmount }) {
  const id = await rpcSingle("create_task", {
    p_title: title,
    p_description: description,
    p_due_date: dueDate || null,
    p_estimated_minutes: estimatedMinutes || null,
    p_reward_amount: Number(rewardAmount),
  });

  return toInt(id);
}

export async function assignTask(taskId, userId) {
  const assignmentId = await rpcSingle("assign_task", {
    p_task_id: taskId,
    p_user_id: userId,
  });

  return toInt(assignmentId);
}

export async function approveAssignmentStart(assignmentId) {
  return rpcSingle("approve_assignment_start", { p_assignment_id: assignmentId });
}

export async function deleteTask(taskId) {
  return rpcSingle("delete_task_record", { p_task_id: taskId });
}

export async function listClaims() {
  const data = await rpc("list_claims");
  return (data || []).map(normalizeClaim);
}

export async function listSignupRequests() {
  const data = await rpc("list_signup_requests");
  return (data || []).map(normalizeSignupRequest);
}

export async function confirmSignupPayment(paymentId) {
  return rpcSingle("confirm_signup_payment", { p_payment_id: paymentId });
}

export async function rejectSignupPayment(paymentId, note) {
  return rpcSingle("reject_signup_payment", {
    p_payment_id: paymentId,
    p_note: note || null,
  });
}

export async function listTasksOverview() {
  const data = await rpc("list_tasks_overview");
  return (data || []).map(normalizeTasksOverview);
}

export async function listUsersOverview() {
  const data = await rpc("list_users_overview");
  return (data || []).map(normalizeUsersOverview);
}

export async function deleteUserAccount(userId) {
  return rpcSingle("delete_user_account", { p_user_id: userId });
}

export async function setUserBalance(userId, amount) {
  return rpcSingle("set_user_balance", {
    p_user_id: userId,
    p_amount: Number(amount),
  });
}

export async function listSubmissions(taskId = null) {
  const data = await rpc("list_submissions", {
    p_task_id: taskId,
  });

  return (data || []).map(normalizeSubmission);
}

export async function reviewSubmission(submissionId, reviewStatus, feedback = null) {
  return rpcSingle("review_submission", {
    p_submission_id: submissionId,
    p_review_status: reviewStatus,
    p_feedback: feedback,
  });
}

export async function createSubmissionFileUrl(filePath) {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  throwIfError(error, "Could not create a temporary file link.");
  return data.signedUrl;
}

export async function submitAssignment(assignmentId, file) {
  const user = await getRequiredAuthUser();
  let filePath = null;

  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    filePath = `${user.id}/${assignmentId}-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(SUBMISSION_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    throwIfError(error, "Could not upload the submission file.");
  }

  return rpcSingle("submit_assignment", {
    p_assignment_id: assignmentId,
    p_text: null,
    p_file_path: filePath,
  });
}

export function formatError(error, fallback) {
  return messageFromError(error, fallback);
}
