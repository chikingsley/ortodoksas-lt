import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
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
    <ClerkProvider afterSignOutUrl="/" appearance={{ theme: shadcn }}>
      <App />
    </ClerkProvider>
  </StrictMode>
);
