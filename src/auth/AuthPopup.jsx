import { useEffect, useRef, useState } from "react";
import {
  APP_NAME,
  AUTH_MESSAGE_SOURCE,
  buildAuthorizeUrl,
  saveToken,
} from "../lib/auth.js";
import { styles, successStyles } from "../lib/ui.js";
import { CheckIcon, SpinnerIcon } from "../ui/icons.jsx";

export default function AuthPopup({ t }) {
  const [status, setStatus] = useState("idle"); // idle | waiting | success | error
  const [manualToken, setManualToken] = useState("");
  const [showManual, setShowManual] = useState(false);
  const popupRef = useRef(null);

  // Listen for the token posted back by authorized.html once the member
  // approves access in the trello.com/1/authorize window.
  useEffect(() => {
    async function handleMessage(event) {
      // The token is a credential: only trust a message from our own origin.
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.source !== AUTH_MESSAGE_SOURCE) return;

      if (!event.data.token) {
        setStatus("error");
        return;
      }

      try {
        await saveToken(t, event.data.token);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically size the popup to content
  useEffect(() => {
    t.sizeTo("#root").catch(() => {});
  }, [t, status, showManual]);

  function handleAuthorize() {
    setStatus("waiting");
    const returnUrl = `${window.location.origin}/authorized.html`;
    popupRef.current = window.open(
      buildAuthorizeUrl(returnUrl),
      "trelloAuth",
      "width=520,height=720"
    );

    // If popup was blocked
    if (!popupRef.current) setStatus("error");
  }

  async function handleSaveManual() {
    if (!manualToken.trim()) return;
    try {
      await saveToken(t, manualToken.trim());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{ ...successStyles.wrapper, ...successStyles.centered }}>
        <div style={successStyles.iconCircle}>
          <CheckIcon width={24} height={24} />
        </div>
        <p style={successStyles.title}>You're connected</p>
        <p style={successStyles.body}>
          {APP_NAME} can now manage and display custom fields on this board.
        </p>
        <button
          type="button"
          onClick={() => t.closePopup()}
          style={successStyles.button}
        >
          Continue
        </button>
      </div>
    );
  }

  const copy = {
    idle: `Connect your Trello account so ${APP_NAME} can manage custom fields on this board.`,
    waiting: "Waiting for you to approve access in the popup window…",
    error: "Couldn't connect. Check that popups are allowed, or enter token below.",
  };

  return (
    <div style={styles.wrapper}>
      <p style={styles.body}>{copy[status]}</p>

      {status === "waiting" && (
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
          <SpinnerIcon width={24} height={24} style={{ color: "#579DFF" }} />
        </div>
      )}

      <button
        type="button"
        onClick={handleAuthorize}
        disabled={status === "waiting"}
        style={{
          ...styles.button,
          ...(status === "waiting" ? styles.buttonBusy : {}),
        }}
      >
        {status === "waiting" ? "Connecting…" : "Connect Trello Account"}
      </button>

      {status === "error" && (
        <button type="button" onClick={handleAuthorize} style={styles.subtleButton}>
          Try again
        </button>
      )}

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #333C43" }}>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          style={{ background: "none", border: "none", color: "#8C9BAB", fontSize: 11.5, cursor: "pointer", padding: 0 }}
        >
          {showManual ? "▲ Hide Direct Token" : "▼ Direct / Manual Token"}
        </button>

        {showManual && (
          <div style={{ marginTop: 8 }}>
            <input
              type="password"
              placeholder="Paste Trello user token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={handleSaveManual}
              style={{ ...styles.buttonSecondary, marginTop: 6, width: "100%" }}
            >
              Save Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
