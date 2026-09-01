import { useEffect, useLayoutEffect, useState } from "react";
import { getCurrentMember, NOT_AUTHORIZED } from "../lib/trelloApi.js";
import { clearToken } from "../lib/auth.js";
import { CheckIcon, SpinnerIcon } from "../ui/icons.jsx";
import "./settings.css";

export default function SettingsPopup({ t }) {
  const [status, setStatus] = useState("checking"); // checking | connected | error
  const [member, setMember] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const mem = await getCurrentMember(t);
        setMember(mem);
        setStatus("connected");
      } catch (e) {
        if (e.message === NOT_AUTHORIZED) return requireAuth();
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    t.sizeTo("#root").catch(() => {});
  }, [t, status]);

  useEffect(() => {
    const el = document.getElementById("root");
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      t.sizeTo("#root").catch(() => {});
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [t]);

  function requireAuth() {
    return t.popup({
      title: "Authorize Custom Fields",
      url: "./auth.html",
      height: 240,
    });
  }

  async function handleDisconnect() {
    await clearToken(t);
    requireAuth();
  }

  if (status === "checking") {
    return (
      <div className="cc-settings-root">
        <div className="cc-loading-state">
          <SpinnerIcon width={22} height={22} style={{ color: "#579DFF" }} />
          <p className="cc-hint-text">Checking connection…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="cc-settings-root">
        <div className="cc-error-state">
          <p className="cc-error-text">Couldn't verify your connection.</p>
          <button
            type="button"
            className="cc-btn-primary"
            onClick={requireAuth}
          >
            Reconnect Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-settings-root">
      <div className="cc-icon-badge">
        <CheckIcon width={24} height={24} strokeWidth={2.4} />
      </div>

      <h3 className="cc-title">You're connected</h3>
      <p className="cc-desc">
        Custom Fields is authorized
        {member?.fullName ? ` as ${member.fullName}` : ""} and active on this board.
      </p>

      <button
        type="button"
        onClick={() => t.closePopup()}
        className="cc-btn-primary"
      >
        Done
      </button>

      <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
        <button
          type="button"
          onClick={requireAuth}
          className="cc-link-subtle"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          className="cc-link-subtle"
          style={{ color: "#F87168" }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
