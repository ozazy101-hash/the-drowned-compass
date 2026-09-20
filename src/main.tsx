import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { inMemoryPartyData } from "./data/in-memory-party-data";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App partyData={inMemoryPartyData} />
  </StrictMode>,
);
