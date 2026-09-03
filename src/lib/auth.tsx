import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { apiGet, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";

export interface User {
  id: string;
  username: string;
  role: "farmer" | "operator" | "government" | "super_admin";
  centreId: string | null;
}
const AuthContext = createContext<User | null>(null);
export function workspaceFor(user: User) {
  return user.role === "farmer"
    ? { to: "/farmer" as const }
    : {
        to: "/admin/$section" as const,
        params: { section: user.role === "operator" ? "queue" : "dashboard" },
      };
}
export function useAuth() {
  const user = useContext(AuthContext);
  if (!user) throw new Error("Sign in required");
  return user;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    let mounted = true;
    const expire = () => {
      sessionStorage.removeItem("kisansetu-session");
      client.clear();
      setUser(null);
    };
    window.addEventListener("session-expired", expire);
    if (sessionStorage.getItem("kisansetu-session")) {
      void apiGet<User>("/api/auth/me")
        .then((u) => {
          if (mounted) setUser(u);
        })
        .catch(() => {
          if (mounted) setError("Session unavailable. Please sign in again.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      mounted = false;
      window.removeEventListener("session-expired", expire);
    };
  }, [client]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ user: User; token: string }>(
        `/api/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.get("username"),
            password: form.get("password"),
            ...(register ? { name: form.get("name"), mobile: form.get("mobile") } : {}),
          }),
        },
      );
      sessionStorage.setItem("kisansetu-session", result.token);
      client.clear();
      setUser(result.user);
      if (result.user.role === "farmer") void navigate({ to: "/farmer" });
      else
        void navigate({
          to: "/admin/$section",
          params: { section: result.user.role === "operator" ? "queue" : "dashboard" },
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    setPending(true);
    setError("");
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      sessionStorage.removeItem("kisansetu-session");
      client.clear();
      setUser(null);
    } catch {
      setError("Could not sign out. Please retry.");
    } finally {
      setPending(false);
    }
  }
  if (loading)
    return (
      <p role="status" className="p-8">
        Checking session…
      </p>
    );
  if (!user)
    return (
      <main className="mx-auto max-w-md space-y-4 p-8">
        <Link to="/" className="text-sm font-semibold text-primary">
          ← MandiSetu presentation home
        </Link>
        <h1 className="text-2xl font-bold">
          MandiSetu ·{" "}
          {register
            ? "Create farmer account"
            : path.startsWith("/admin") || path === "/operator"
              ? "Government / Mandi sign in"
              : "Farmer sign in"}
        </h1>
        <form onSubmit={submit} className="space-y-4">
          {register && (
            <>
              <label className="block">
                Full name
                <input
                  name="name"
                  required
                  maxLength={100}
                  className="block w-full rounded border p-2"
                />
              </label>
              <label className="block">
                Mobile number (optional)
                <input
                  name="mobile"
                  inputMode="tel"
                  pattern="\+?[0-9][0-9 -]{7,17}"
                  className="block w-full rounded border p-2"
                />
              </label>
            </>
          )}
          <label className="block">
            Username
            <input
              name="username"
              required
              minLength={3}
              maxLength={80}
              pattern="[a-zA-Z0-9_.-]+"
              autoComplete="username"
              className="block w-full rounded border p-2"
            />
          </label>
          <label className="block">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              className="block w-full rounded border p-2"
            />
          </label>
          <p className="text-sm">Use a password of at least 12 characters.</p>
          <Button type="submit" disabled={pending}>
            {pending ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        <Button
          variant="link"
          disabled={pending}
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Already registered? Sign in" : "Create a farmer account"}
        </Button>
      </main>
    );
  const allowed =
    user.role === "operator"
      ? path === "/operator" || path === "/" || /^\/admin\/(mandis|queue|slots)\/?$/.test(path)
      : user.role === "farmer"
        ? path === "/" || path === "/farmer" || path.startsWith("/farmer/")
        : path === "/" || path.startsWith("/admin/") || path === "/admin" || path === "/operator";
  if (
    (path.startsWith("/farmer") && user.role !== "farmer") ||
    ((path.startsWith("/admin") || path.startsWith("/government")) && user.role === "farmer")
  ) {
    const workspace = workspaceFor(user);
    return (
      <main className="space-y-4 p-8">
        <p>This account does not have access to this workspace.</p>
        <Link {...workspace}>Open your workspace</Link>
      </main>
    );
  }
  return (
    <AuthContext.Provider value={user}>
      <div className="flex items-center justify-end gap-3 border-b p-2 text-sm">
        <Link to="/" className="font-semibold text-primary">
          Presentation home
        </Link>
        <span>
          {user.username} · {user.role}
        </span>
        <Button variant="outline" disabled={pending} onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {allowed ? (
        <div key={user.id}>{children}</div>
      ) : (
        <div className="p-8">
          <p>This workspace is not available for your account.</p>
          <Button
            onClick={() =>
              user.role === "farmer"
                ? void navigate({ to: "/farmer" })
                : void navigate({
                    to: "/admin/$section",
                    params: { section: user.role === "operator" ? "queue" : "dashboard" },
                  })
            }
          >
            Open my workspace
          </Button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
