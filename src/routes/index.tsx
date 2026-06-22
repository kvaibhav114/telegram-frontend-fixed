import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Phone, Video, Users, Bell, FileText, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-96 rounded-full bg-[#2b5278]/30 blur-3xl" />
      </div>

      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-primary grid place-items-center">
            <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="currentColor">
              <path d="M9.78 17.5l.36-3.95L18.4 6.8c.32-.29-.07-.43-.5-.17l-10.4 6.56-4.49-1.42c-.97-.3-.98-.97.21-1.44L20.6 3.86c.81-.34 1.58.2 1.27 1.43l-3.06 14.4c-.21 1-.81 1.24-1.64.77l-4.53-3.34-2.18 2.12c-.25.25-.46.46-.95.46z" />
            </svg>
          </div>
          <span className="font-bold text-lg">Telegrok</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 rounded-lg text-sm hover:bg-accent transition">Sign In</Link>
          <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign Up</Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Connect <span className="text-primary">Instantly.</span><br />Chat Without Limits.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg">
            Real-time messaging, groups, voice & video calls, notifications and file sharing — all in one place.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">
              Get Started <ArrowRight className="size-4" />
            </Link>
            <Link to="/login" className="px-5 py-2.5 rounded-lg border border-border hover:bg-accent text-sm">Sign In</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, title: "Real-Time Chat", desc: "Instant messaging with read receipts, typing indicators, and replies." },
            { icon: Phone, title: "Voice Calls", desc: "One-to-one voice calls with WebRTC." },
            { icon: Video, title: "Video Calls", desc: "Peer-to-peer video calling." },
            { icon: Users, title: "Groups & Channels", desc: "Create groups, manage members, pin messages." },
            { icon: FileText, title: "File Sharing", desc: "P2P file transfers with progress tracking." },
            { icon: Bell, title: "Notifications", desc: "Real-time notifications for messages, calls, and mentions." },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl bg-card/50 border border-border">
              <f.icon className="size-5 text-primary mb-2" />
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
