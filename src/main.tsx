(window as any).global = window;
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";
import "./styles.css";
import { ToastProvider } from "./hooks/useToast";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Missing root element with id="root"');
}

document.documentElement.lang = "en";
document.documentElement.classList.add("dark");
document.body.className = "dark bg-background text-foreground";

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>
);