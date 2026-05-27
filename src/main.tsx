import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { App } from "./App";
import { UpdateNotification } from "@/components/feature/UpdateNotification";

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <App />
    <UpdateNotification />
  </StrictMode>,
);
