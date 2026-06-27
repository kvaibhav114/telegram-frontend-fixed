import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const value: ToastCtx = {
    toast: add,
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
  };

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur text-sm animate-in slide-in-from-right-5 fade-in duration-200",
                t.type === "success" && "bg-green-500/10 border-green-500/30 text-green-400",
                t.type === "error" && "bg-destructive/10 border-destructive/30 text-destructive",
                t.type === "info" && "bg-primary/10 border-primary/30 text-primary",
              )}>
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 min-w-0">{t.message}</span>
              <button onClick={() => remove(t.id)} className="size-5 grid place-items-center rounded hover:bg-white/10 shrink-0">
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be inside ToastProvider");
  return v;
}