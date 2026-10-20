import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthPanelProps = { onClose: () => void };

export default function AuthPanel({ onClose }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setNotice("Cloud sign-in is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } }
        });
        if (error) throw error;
        setNotice(data.session
          ? "Account created. You are signed in."
          : "Account created. Check your email to confirm the address, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setNotice("Welcome back, Wayfarer.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : "You have signed out.");
    setBusy(false);
  }

  return (
    <div className="help-overlay auth-overlay" role="dialog" aria-modal="true" aria-label="Account">
      <section className="help-card auth-card">
        <button className="icon-button close-help" onClick={onClose} aria-label="Close account panel">×</button>
        <span className="eyebrow">REALM ACCOUNT</span>
        <h2>{session ? "Your account" : mode === "login" ? "Welcome back." : "Join the realm."}</h2>
        {!supabase && <div className="auth-config-warning">Cloud authentication is not configured yet. You can still play the local prototype; add the two public Supabase environment variables to enable accounts.</div>}
        {session ? (
          <div className="signed-in">
            <div className="account-emblem">✦</div>
            <b>{session.user.user_metadata.display_name || session.user.email || "Wayfarer"}</b>
            <small>{session.user.email}</small>
            <p>Your Supabase session is active. Character saving and online multiplayer are separate systems and are not connected to this account yet.</p>
            <button className="auth-submit" onClick={() => void signOut()} disabled={busy}>{busy ? "Please wait…" : "Sign out"}</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {mode === "signup" && <label>Adventurer name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={20} required placeholder="Your in-game name" /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required placeholder="At least 6 characters" /></label>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
            <button className="auth-mode" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(""); }}>
              {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </form>
        )}
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <p className="auth-footnote">This form uses Supabase Auth when configured. It does not yet create or load a persistent game character.</p>
      </section>
    </div>
  );
}
