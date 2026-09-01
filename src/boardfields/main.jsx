import React from "react";
import ReactDOM from "react-dom/client";
import BoardFieldsPopup from "./BoardFieldsPopup.jsx";

/* global TrelloPowerUp */
const t = TrelloPowerUp.iframe();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BoardFieldsPopup t={t} />
  </React.StrictMode>
);
