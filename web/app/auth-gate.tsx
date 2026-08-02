"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "forgot" | "recovery";

export function AuthGate({
  children,
}: {
  children: (user: User, signOut: () => Promise<void>) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      } else if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Hasło musi mieć co najmniej 8 znaków.");
        }
        if (password !== confirmPassword) {
          throw new Error("Podane hasła nie są takie same.");
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Sprawdź skrzynkę e-mail i potwierdź założenie konta.");
        }
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: window.location.origin },
        );
        if (authError) throw authError;
        setMessage("Wysłaliśmy wiadomość z linkiem do ustawienia nowego hasła.");
      } else {
        if (password.length < 8) {
          throw new Error("Nowe hasło musi mieć co najmniej 8 znaków.");
        }
        if (password !== confirmPassword) {
          throw new Error("Podane hasła nie są takie same.");
        }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Hasło zostało zmienione. Możesz korzystać z aplikacji.");
        setMode("signin");
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    changeMode("signin");
  };

  if (loading) {
    return (
      <main className="auth-loading" aria-label="Ładowanie aplikacji">
        <span className="auth-loader" />
      </main>
    );
  }

  if (user && mode !== "recovery") return <>{children(user, signOut)}</>;

  const copy = authCopy[mode];

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="AkuCheckHome">
        <div className="auth-brand">
          <span className="auth-brand-mark">A</span>
          <span>
            <strong>AkuCheck</strong>
            <small>Home</small>
          </span>
        </div>
        <div className="auth-story-copy">
          <p className="eyebrow auth-eyebrow">CODZIENNA CHWILA DLA SIEBIE</p>
          <h1>Zauważaj zmiany.<br />Dzień po dniu.</h1>
          <p>
            Prywatna przestrzeń do codziennej obserwacji samopoczucia,
            regeneracji i wyników 12 pulsów.
          </p>
        </div>
        <p className="auth-privacy">Twoje dane zdrowotne pozostają w tej przeglądarce, w osobnym magazynie dla konta.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">A</span>
            <strong>AkuCheckHome</strong>
          </div>
          <p className="eyebrow green">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p className="auth-intro">{copy.description}</p>
          <p className="auth-local-note">
            Dane wpisów pozostają na tym urządzeniu i w tej przeglądarce. Nie synchronizują się między urządzeniami.
          </p>

          <form onSubmit={submit} className="auth-form">
            {mode !== "recovery" && (
              <label>
                Adres e-mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="twoj@email.pl"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {mode === "recovery" ? "Nowe hasło" : "Hasło"}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Co najmniej 8 znaków"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
              </label>
            )}
            {(mode === "signup" || mode === "recovery") && (
              <label>
                Powtórz hasło
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Wpisz hasło ponownie"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            )}

            {error && <p className="auth-message error" role="alert">{error}</p>}
            {message && <p className="auth-message success" role="status">{message}</p>}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Proszę czekać…" : copy.submit}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-links">
            {mode === "signin" && (
              <>
                <button type="button" onClick={() => changeMode("forgot")}>Nie pamiętam hasła</button>
                <p>Nie masz jeszcze konta? <button type="button" onClick={() => changeMode("signup")}>Załóż konto</button></p>
              </>
            )}
            {mode !== "signin" && mode !== "recovery" && (
              <button type="button" onClick={() => changeMode("signin")}>← Wróć do logowania</button>
            )}
          </div>
        </div>
        <p className="auth-disclaimer">AkuCheckHome wspiera obserwację zdrowia, ale nie zastępuje konsultacji medycznej.</p>
      </section>
    </main>
  );
}

const authCopy: Record<AuthMode, { eyebrow: string; title: string; description: string; submit: string }> = {
  signin: {
    eyebrow: "WITAJ PONOWNIE",
    title: "Zaloguj się",
    description: "Wróć do swoich codziennych obserwacji.",
    submit: "Zaloguj",
  },
  signup: {
    eyebrow: "NOWE KONTO",
    title: "Załóż konto",
    description: "Utwórz prywatną przestrzeń dla swoich codziennych wpisów.",
    submit: "Załóż konto",
  },
  forgot: {
    eyebrow: "ODZYSKIWANIE DOSTĘPU",
    title: "Zresetuj hasło",
    description: "Podaj adres e-mail. Wyślemy na niego bezpieczny link do zmiany hasła.",
    submit: "Wyślij link",
  },
  recovery: {
    eyebrow: "NOWE HASŁO",
    title: "Ustaw nowe hasło",
    description: "Wprowadź nowe hasło do swojego konta.",
    submit: "Zapisz nowe hasło",
  },
};

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Nie udało się wykonać tej operacji.";
  if (/Invalid login credentials/i.test(message)) return "Nieprawidłowy adres e-mail lub hasło.";
  if (/User already registered/i.test(message)) return "Konto z tym adresem e-mail już istnieje.";
  if (/Email rate limit exceeded/i.test(message)) return "Wysłano zbyt wiele wiadomości. Spróbuj ponownie za chwilę.";
  return message;
}
