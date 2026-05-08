import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AuthScreen from "./AuthScreen";
import UserDashboard from "./UserDashboard";
import { hasSupabaseEnv } from "./lib/supabase";
import {
  getAuthenticatedUser,
  getCurrentSession,
  onAuthStateChange,
  signInWithPassword,
  signOutUser,
  signUpUser,
} from "./lib/taskPlatform";

function FullScreenState({ title, body }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#09090f",
        color: "#f3f4f6",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          background: "#111118",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "24px",
          display: "grid",
          gap: "10px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>{title}</h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    if (!hasSupabaseEnv) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    async function syncSession(session) {
      if (!active) return;

      if (!session?.user) {
        setMe(null);
        setLoading(false);
        return;
      }

      try {
        const nextUser = await getAuthenticatedUser(session.user);

        if (!active) return;
        setMe(nextUser);
        setNotice("");
      } catch (error) {
        if (!active) return;
        setMe(null);
        setNotice(error.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function bootstrap() {
      try {
        const session = await getCurrentSession();
        await syncSession(session);
      } catch (error) {
        if (!active) return;
        setNotice(error.message);
        setLoading(false);
      }
    }

    void bootstrap();

    const subscription = onAuthStateChange((_, session) => {
      window.setTimeout(() => {
        void syncSession(session);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(values) {
    const nextUser = await signInWithPassword(values);
    setMe(nextUser);
    setNotice("");
  }

  async function handleRegister(values) {
    const result = await signUpUser(values);

    if (result.signedIn && result.user) {
      const nextUser = await getAuthenticatedUser(result.user);
      setMe(nextUser);
    }

    setNotice("");
    return result;
  }

  async function handleLogout() {
    await signOutUser();
    setMe(null);
  }

  if (!hasSupabaseEnv) {
    return (
      <FullScreenState
        title="Supabase setup required"
        body="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to web/.env.local, then run the SQL file in web/supabase/schema.sql."
      />
    );
  }

  if (loading) {
    return null;
  }

  if (!me) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} notice={notice} />;
  }

  if (me.role === "admin") {
    return <AdminDashboard me={me} onLogout={handleLogout} />;
  }

  return <UserDashboard me={me} onLogout={handleLogout} />;
}
