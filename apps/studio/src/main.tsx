import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import "./styles/globals.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Application root element is unavailable");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
