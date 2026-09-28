import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createPartyData } from "./data/create-party-data";
import "./styles.css";

const partyData = createPartyData();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App partyData={partyData} />
  </StrictMode>,
);
