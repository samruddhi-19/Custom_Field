import React from "react";
import ReactDOM from "react-dom/client";
import BoardFieldsPopup from "./BoardFieldsPopup.jsx";

/* global TrelloPowerUp */
let t = null;
try {
  if (typeof window !== "undefined" && window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === "function") {
    t = window.TrelloPowerUp.iframe();
  }
} catch {
  t = null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BoardFieldsPopup t={t} />
  </React.StrictMode>
);
