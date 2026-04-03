import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-semibold text-zinc-100">
        Gas Town Dashboard
      </h1>
    </div>
  </StrictMode>
);
