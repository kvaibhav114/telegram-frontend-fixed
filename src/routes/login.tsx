import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { authService } from "@/lib/services/authService";
import { setAuthToken, getAuthToken } from "@/lib/api/apiClient";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Telegrok" },
      { name: "description", content: "Sign in to Telegrok to message friends, groups, and call." },
      { property: "og:title", content: "Sign in — Telegrok" },
      { property: "og:description", content: "Sign in to Telegrok to message friends, groups, and call." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);

   useEffect(() => {
    if (getAuthToken()) setAuthToken(null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login({ email, password });
      nav({ to: "/chat" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center px-4">
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute -top-40 -left-40 size-125 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-125 rounded-full bg-[#2b5278]/40 blur-3xl" />
      </div>

      <div className="glass rounded-3xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-16 rounded-3xl bg-linear-to-br from-primary to-[#2b5278] grid place-items-center shadow-elegant mb-3">
            <svg viewBox="0 0 24 24" className="size-8 text-white" fill="currentColor">
              <path d="M9.78 17.5l.36-3.95L18.4 6.8c.32-.29-.07-.43-.5-.17l-10.4 6.56-4.49-1.42c-.97-.3-.98-.97.21-1.44L20.6 3.86c.81-.34 1.58.2 1.27 1.43l-3.06 14.4c-.21 1-.81 1.24-1.64.77l-4.53-3.34-2.18 2.12c-.25.25-.46.46-.95.46z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Telegrok</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fast, secure messaging — sign in to continue
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field
            icon={Mail}
            label="Username or email"
            value={email}
            onChange={setEmail}
            placeholder="vaibhav or you@email.com"
            type="text"
            required
          />
          <Field
            icon={Lock}
            label="Password"
            value={password}
            onChange={setP}
            placeholder="••••••••"
            type="password"
            required
          />
          <button
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition shadow-elegant disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="size-4" /></>}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          New here?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground pl-1">{label}</span>
      <div className="mt-1 relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-10 pr-3 rounded-2xl bg-input/60 border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition text-sm"
        />
      </div>
    </label>
  );
}
