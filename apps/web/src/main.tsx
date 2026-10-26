import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./LandingPage";
import "./styles/global.css";
import "./styles/landing.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);
