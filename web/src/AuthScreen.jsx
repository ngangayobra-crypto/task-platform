import { useState } from "react";
import "./AuthScreen.css";

const API = "https://task-platform-api.onrender.com";

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(API + path, { ...options, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof data === "string" ? data : (data?.error || "Request failed"));
  return data;
}

// ── Logo mark ──────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="2"  y="2"  width="11" height="11" rx="3" fill="white" opacity="0.95"/>
      <rect x="15" y="2"  width="11" height="11" rx="3" fill="white" opacity="0.40"/>
      <rect x="2"  y="15" width="11" height="11" rx="3" fill="white" opacity="0.40"/>
      <rect x="15" y="15" width="11" height="11" rx="3" fill="white" opacity="0.95"/>
    </svg>
  );
}

// ── Login view ─────────────────────────────────────────────────────────────
function LoginForm({ onLogin, onSwitch }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="as-form">
      <div className="as-field">
        <label className="as-label" htmlFor="login-email">Email</label>
        <input id="login-email" className="as-input" name="email" type="email"
          placeholder="you@example.com" autoComplete="email" required />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="login-pass">Password</label>
        <input id="login-pass" className="as-input" name="password" type="password"
          placeholder="••••••••" autoComplete="current-password" required />
      </div>

      {error && <div className="as-error">{error}</div>}

      <button className="as-btn" type="submit" disabled={loading}>
        {loading ? <span className="as-spinner" /> : null}
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="as-switch">
        No account?{" "}
        <button type="button" className="as-switch-link" onClick={onSwitch}>
          Create one
        </button>
      </p>
    </form>
  );
}

// ── Register view ──────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const [mpesa, setMpesa]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const form = e.target;
    const body = Object.fromEntries(new FormData(form).entries());
    body.mpesa_code = body.mpesa_code.toUpperCase().trim();
    body.amount     = Number(body.amount || 100);
    try {
      await apiFetch("/auth/signup-request", { method: "POST", body: JSON.stringify(body) });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="as-success-screen">
        <div className="as-success-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 16.5l4.5 4.5 7.5-9" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="as-success-title">Request submitted</h3>
        <p className="as-success-body">
          We're verifying your M-Pesa payment. Once confirmed, your account will be activated and you can sign in.
        </p>
        <button className="as-btn" type="button" onClick={onSwitch}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="as-form">
      <div className="as-field">
        <label className="as-label" htmlFor="reg-name">Full name</label>
        <input id="reg-name" className="as-input" name="name"
          placeholder="Jane Doe" autoComplete="name" required />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="reg-email">Email</label>
        <input id="reg-email" className="as-input" name="email" type="email"
          placeholder="you@example.com" autoComplete="email" required />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="reg-phone">Phone number</label>
        <input id="reg-phone" className="as-input" name="phone"
          placeholder="07xxxxxxxx" autoComplete="tel" required />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="reg-pass">Password</label>
        <input id="reg-pass" className="as-input" name="password" type="password"
          placeholder="Min 6 characters" autoComplete="new-password" required minLength={6} />
      </div>

      {/* M-Pesa section */}
      <div className="as-mpesa-section">
        <div className="as-mpesa-header">
          <span className="as-mpesa-label">Registration fee</span>
          <span className="as-mpesa-amount">KES 150\-</span>
        </div>
        <div className="as-mpesa-instruction">
          Send <strong>KES 150</strong> to pochi la biashara <strong>0111445540</strong><br/>
          then paste your confirmation code below.
        </div>
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="reg-mpesa">M-Pesa confirmation code</label>
        <input
          id="reg-mpesa"
          className="as-input as-input-mono"
          name="mpesa_code"
          placeholder="e.g. QJK3H8YT92"
          value={mpesa}
          onChange={e => setMpesa(e.target.value.toUpperCase().replace(/\s/g, ""))}
          required
          minLength={8}
          maxLength={20}
        />
      </div>

      

      <label className="as-agree">
        <input type="checkbox" required />
        <span>I agree to the platform rules and terms of service</span>
      </label>

      {error && <div className="as-error">{error}</div>}

      <button className="as-btn" type="submit" disabled={loading}>
        {loading ? <span className="as-spinner" /> : null}
        {loading ? "Submitting…" : "Submit request"}
      </button>

      <p className="as-note">
        Your account is activated after admin confirms your payment.
      </p>

      <p className="as-switch">
        Already have an account?{" "}
        <button type="button" className="as-switch-link" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Root component ─────────────────────────────────────────────────────────
export default function AuthScreen({ onLogin }) {
  const [view, setView] = useState("login"); // "login" | "register"

  return (
    <div className="as-root">
      <div className="as-phone">

        {/* Status bar */}
        <div className="as-statusbar">
        
          <div className="as-status-icons">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" opacity=".7">
              <rect x="0" y="4" width="3" height="6" rx="0.5"/>
              <rect x="4" y="2.5" width="3" height="7.5" rx="0.5"/>
              <rect x="8" y="1" width="3" height="9" rx="0.5"/>
              <rect x="12" y="0" width="3" height="10" rx="0.5"/>
            </svg>
            <svg width="16" height="10" viewBox="0 0 24 16" fill="none" opacity=".7">
              <rect x="1" y="1" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="3" width="14" height="10" rx="1.5" fill="currentColor"/>
              <path d="M22 5.5v5a2.5 2.5 0 000-5z" fill="currentColor"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="as-header">
          <div className="as-logo-ring">
            <LogoMark />
          </div>
          <div className="as-brand">TaskHive</div>
          <div className="as-tagline">Complete tasks · Earn rewards</div>
        </div>

        {/* Tab switcher */}
        <div className="as-tabs">
          <div className="as-tabs-track">
            <div
              className="as-tabs-thumb"
              style={{ transform: view === "register" ? "translateX(100%)" : "translateX(0)" }}
            />
            <button
              className={`as-tab ${view === "login" ? "as-tab-active" : ""}`}
              type="button"
              onClick={() => setView("login")}
            >
              Sign in
            </button>
            <button
              className={`as-tab ${view === "register" ? "as-tab-active" : ""}`}
              type="button"
              onClick={() => setView("register")}
            >
              Create account
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="as-body">
          {view === "login"
            ? <LoginForm onLogin={onLogin} onSwitch={() => setView("register")} />
            : <RegisterForm onSwitch={() => setView("login")} />
          }
        </div>

      </div>
    </div>
  );
}
