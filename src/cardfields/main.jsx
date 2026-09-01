import React from "react";
import ReactDOM from "react-dom/client";
import CardFieldsPopup from "./CardFieldsPopup.jsx";

/* global TrelloPowerUp */
const t = TrelloPowerUp.iframe();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CardFieldsPopup t={t} />
  </React.StrictMode>
);
