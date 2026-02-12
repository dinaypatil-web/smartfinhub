import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Global error handler for debugging
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace;">
        <h1>Runtime Error</h1>
        <h3>${event.message}</h3>
        <pre>${event.error?.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
});

console.log("Main.tsx executing...");
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { EncryptionProvider } from "./contexts/EncryptionContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <EncryptionProvider>
        <App />
      </EncryptionProvider>
    </AppWrapper>
  </StrictMode>
);
