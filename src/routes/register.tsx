import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Mail, Lock, ArrowRight, Loader2, User, Smile } from "lucide-react";
import { authService } from "@/lib/services/authService";
import { EmojiPickerPopover } from "@/components/EmojiPickerPopover";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Telegrok" },
      { name: "description", content: "Create your Telegrok account and pick a username with an emoji." },
      { property: "og:title", content: "Create account — Telegrok" },
      { property: "og:description", content: "Create your Telegrok account and pick a username with an emoji." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const [emoji, setEmoji] = useState(""); 
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

const [error, setError] = useState("");

const submit = async (e: React.FormEvent) => {
  e.preventDefault();

  setError("");

  if (pwd !== pwd2) {
    setError("Passwords do not match");
    return;
  }

  try {
    setLoading(true);

    const response = await authService.register({
      username: `${emoji} ${name}`.trim(),
      email,
      password: pwd,
      confirmPassword: pwd2,
      displayName: name,
    });

    nav({ to: "/login" });

  } catch (err: any) {

    console.error(err);

    setError(
      err?.message ||
      "Registration failed. Please try again."
    );

  } finally {
    setLoading(false);
  }
};



  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute -top-40 -right-40 size-125 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-125 rounded-full bg-[#2b5278]/40 blur-3xl" />
      </div>

      <div className="glass rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a username — drop an emoji in it 
          </p>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl bg-card/60 border border-border p-3 mb-4 flex items-center gap-3">
          <div className="size-12 rounded-full bg-linear-to-br from-primary to-[#2b5278] grid place-items-center text-2xl">
            {emoji}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Live preview
            </div>
            <div className="text-lg font-semibold truncate">
              {emoji} {name || "Your name"}
            </div>
          </div>
        </div>

{error && (
  <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
    {error}
  </div>
)}

        <form onSubmit={submit} className="space-y-3">
          {/* Username with integrated emoji picker */}
          <label className="block relative">
            <span className="text-xs font-medium text-muted-foreground pl-1">Username</span>
            <div className="mt-1 relative">
              <button
                type="button"
                onClick={() => setShowPicker((s) => !s)}
                className="absolute left-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-xl hover:bg-accent transition text-lg"
                title="Pick an emoji"
              >
                {emoji || <Smile className="size-4" />}
              </button>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vaibhav"
                required
                className="w-full h-12 pl-14 pr-12 rounded-2xl bg-input/60 border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition text-sm"
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
            {showPicker && (
              <div className="absolute z-30 mt-2 left-0">
                <EmojiPickerPopover
                  onSelect={(e) => setEmoji(e)}
                  onClose={() => setShowPicker(false)}
                />
              </div>
            )}
            {/* <div className="mt-2 flex gap-1.5 flex-wrap">
              {["🚀", "🔥", "🎮", "🐱", "🌸", "⚡", "🎧", "🎓"].map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`size-8 rounded-xl grid place-items-center text-base hover:bg-accent transition border ${
                    emoji === e ? "border-primary bg-primary/10" : "border-transparent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div> */}
          </label>

          <Field icon={Mail} label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required />
          <Field icon={Lock} label="Password" value={pwd} onChange={setPwd} placeholder="••••••••" type="password" required />
          <Field
            icon={Lock}
            label="Confirm password"
            value={pwd2}
            onChange={setPwd2}
            placeholder="••••••••"
            type="password"
            required
          />
          {pwd && pwd2 && pwd !== pwd2 && (
            <p className="text-xs text-destructive pl-1">Passwords don't match.</p>
          )}

          <button
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition shadow-elegant disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>Create account <ArrowRight className="size-4" /></>}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/" className="text-primary hover:underline font-medium">
            Sign in
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
