import { useState } from "react";
import "./AuthScreen.css";

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="2" y="2" width="11" height="11" rx="3" fill="white" opacity="0.95" />
      <rect x="15" y="2" width="11" height="11" rx="3" fill="white" opacity="0.4" />
      <rect x="2" y="15" width="11" height="11" rx="3" fill="white" opacity="0.4" />
      <rect x="15" y="15" width="11" height="11" rx="3" fill="white" opacity="0.95" />
    </svg>
  );
}

function Notice({ text }) {
  if (!text) return null;
  return <div className="as-error">{text}</div>;
}

function LoginForm({ onLogin, onSwitch, notice }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const body = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await onLogin(body);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="as-form">
      <Notice text={notice} />

      <div className="as-field">
        <label className="as-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="as-input"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className="as-input"
          name="password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          required
        />
      </div>

      <Notice text={error} />

      <button className="as-btn" type="submit" disabled={loading}>
        {loading ? <span className="as-spinner" /> : null}
        {loading ? "Signing in..." : "Sign in"}
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

function RegisterForm({ onRegister, onSwitch }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successBody, setSuccessBody] = useState("Your account was created.");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const result = await onRegister(values);

      if (result?.signedIn) {
        return;
      }

      setSuccessBody(
        result?.requiresEmailConfirmation
          ? "Email confirmation is still enabled in Supabase, so this account cannot sign in yet. Turn off Confirm email in your Supabase auth settings if you want instant signup and login."
          : "Your account was created. Sign in to continue and submit your M-Pesa payment details inside the app.",
      );
      setSuccess(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="as-success-screen">
        <div className="as-success-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 16.5l4.5 4.5 7.5-9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="as-success-title">Account created</h3>
        <p className="as-success-body">{successBody}</p>
        <button className="as-btn" type="button" onClick={onSwitch}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="as-form">
      <div className="as-field">
        <label className="as-label" htmlFor="register-name">
          Full name
        </label>
        <input
          id="register-name"
          className="as-input"
          name="name"
          placeholder="Jane Doe"
          autoComplete="name"
          required
        />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
          className="as-input"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="register-phone">
          Phone number
        </label>
        <input
          id="register-phone"
          className="as-input"
          name="phone"
          placeholder="07xxxxxxxx"
          autoComplete="tel"
          required
        />
      </div>

      <div className="as-field">
        <label className="as-label" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          className="as-input"
          name="password"
          type="password"
          placeholder="Min 6 characters"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <label className="as-agree">
        <input type="checkbox" required />
        <span>I agree to the platform rules.</span>
      </label>

      <Notice text={error} />

      <button className="as-btn" type="submit" disabled={loading}>
        {loading ? <span className="as-spinner" /> : null}
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="as-note">You'll submit your M-Pesa details after signing in.</p>

      <p className="as-switch">
        Already have an account?{" "}
        <button type="button" className="as-switch-link" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}

export default function AuthScreen({ onLogin, onRegister, notice }) {
  const [view, setView] = useState("login");

  return (
    <div className="as-root">
      <div className="as-phone">
        <div className="as-statusbar">
          <div className="as-status-icons">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" opacity=".7">
              <rect x="0" y="4" width="3" height="6" rx="0.5" />
              <rect x="4" y="2.5" width="3" height="7.5" rx="0.5" />
              <rect x="8" y="1" width="3" height="9" rx="0.5" />
              <rect x="12" y="0" width="3" height="10" rx="0.5" />
            </svg>
            <svg width="16" height="10" viewBox="0 0 24 16" fill="none" opacity=".7">
              <rect
                x="1"
                y="1"
                width="20"
                height="14"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect x="3" y="3" width="14" height="10" rx="1.5" fill="currentColor" />
              <path d="M22 5.5v5a2.5 2.5 0 000-5z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="as-header">
          <div className="as-logo-ring">
            <LogoMark />
          </div>
          <div className="as-brand">TaskHive</div>
          <div className="as-tagline">Complete tasks. Earn rewards.</div>
        </div>

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

        <div className="as-body">
          {view === "login" ? (
            <LoginForm onLogin={onLogin} onSwitch={() => setView("register")} notice={notice} />
          ) : (
            <RegisterForm onRegister={onRegister} onSwitch={() => setView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
