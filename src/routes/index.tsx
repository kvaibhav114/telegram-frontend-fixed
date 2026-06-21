import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Phone,
  Video,
  Users,
  Bell,
  FileText,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 size-125 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-125 rounded-full bg-[#2b5278]/40 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-linear-to-br from-primary to-[#2b5278] grid place-items-center shadow-elegant">
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-white"
              fill="currentColor"
            >
              <path d="M9.78 17.5l.36-3.95L18.4 6.8c.32-.29-.07-.43-.5-.17l-10.4 6.56-4.49-1.42c-.97-.3-.98-.97.21-1.44L20.6 3.86c.81-.34 1.58.2 1.27 1.43l-3.06 14.4c-.21 1-.81 1.24-1.64.77l-4.53-3.34-2.18 2.12c-.25.25-.46.46-.95.46z" />
            </svg>
          </div>

          <span className="font-bold text-xl tracking-tight">
            Telegrok
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">
            Features
          </a>
          <a href="#preview" className="hover:text-foreground transition">
            Preview
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl hover:bg-accent transition"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Connect
              <span className="text-primary"> Instantly.</span>
              <br />
              Chat Without Limits.
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Real-time messaging, group conversations,
              voice calls, video calls, reactions,
              notifications and file sharing —
              all in one place.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:brightness-110 transition"
              >
                Get Started
                <ArrowRight className="size-4" />
              </Link>

              <Link
                to="/login"
                className="px-6 py-3 rounded-2xl border border-border hover:bg-accent transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Telegram Preview */}
          <div
            id="preview"
            className="glass rounded-3xl p-4 shadow-elegant"
          >
            <div className="flex h-130 overflow-hidden rounded-2xl border border-border">

              {/* Sidebar */}
              <div className="w-[35%] bg-sidebar border-r border-border p-3">
                <div className="space-y-3">

                  {["Rahul", "Priya", "Spring Team"].map((name, i) => (
                    <div
                      key={name}
                      className={`p-3 rounded-2xl ${
                        i === 0 ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      <div className="font-medium truncate">
                        {name}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        Last message...
                      </div>
                    </div>
                  ))}

                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-background">

                <div className="h-16 border-b border-border flex items-center px-4 font-medium">
                  Rahul
                </div>

                <div className="flex-1 p-4 space-y-4">

                  <div className="max-w-[70%] rounded-2xl bg-accent p-3">
                    Hey, how's the project going?
                  </div>

                  <div className="ml-auto max-w-[70%] rounded-2xl bg-primary text-primary-foreground p-3">
                    Pretty good! Voice calls are working
                  </div>

                  <div className="max-w-[70%] rounded-2xl bg-accent p-3">
                    Nice! Let's finish chat integration next.
                  </div>

                </div>

                <div className="p-4 border-t border-border">
                  <div className="h-11 rounded-2xl bg-input" />
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-6 pb-24"
      >
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          <FeatureCard
            icon={<MessageCircle className="size-6" />}
            title="Real-Time Messaging"
            desc="Instant messaging with read receipts and typing indicators."
          />

          <FeatureCard
            icon={<Phone className="size-6" />}
            title="Voice Calls"
            desc="High quality one-to-one voice conversations."
          />

          <FeatureCard
            icon={<Video className="size-6" />}
            title="Video Calls"
            desc="Peer-to-peer video calling experience."
          />

          <FeatureCard
            icon={<Users className="size-6" />}
            title="Group Chats"
            desc="Create teams, communities and discussion groups."
          />

          <FeatureCard
            icon={<FileText className="size-6" />}
            title="File Sharing"
            desc="Send documents, images, videos and voice notes."
          />

          <FeatureCard
            icon={<Bell className="size-6" />}
            title="Notifications"
            desc="Never miss a message, reaction or mention."
          />

        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="glass rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-bold">
            Ready to Start Messaging?
          </h2>

          <p className="text-muted-foreground mt-3">
            Create an account and start chatting in seconds.
          </p>

          <Link
            to="/register"
            className="inline-flex mt-6 items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-elegant"
          >
            Create Account
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-3xl p-6 hover:scale-[1.02] transition">
      <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        {icon}
      </div>

      <h3 className="font-semibold text-lg">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground mt-2">
        {desc}
      </p>
    </div>
  );
}
