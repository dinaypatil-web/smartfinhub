import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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
