import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import BoardFieldsPopup from "./boardfields/BoardFieldsPopup.jsx";
import "./boardfields/boardfields.css";

function HostApp() {
  const [modalOpen, setModalOpen] = useState(true);

  // Mock Trello powerup object for standalone host preview
  const mockT = {
    get: async (_scope, _visibility, key, defaultVal) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
      } catch {
        return defaultVal;
      }
    },
    set: async (_scope, _visibility, key, val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
      return Promise.resolve();
    },
    closeModal: () => setModalOpen(false),
    closePopup: () => setModalOpen(false),
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0E1114",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#F7F8F9",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Simulated Trello Board Background */}
      <div style={{
        filter: modalOpen ? "brightness(0.28) blur(3px)" : "none",
        transition: "filter 0.3s ease",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        pointerEvents: modalOpen ? "none" : "auto",
      }}>
        {/* Trello Top Navigation Bar */}
        <header style={{
          height: 48,
          background: "rgba(29, 33, 37, 0.95)",
          borderBottom: "1px solid #282E33",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontWeight: 800, letterSpacing: -0.5, fontSize: 16, color: "#579DFF" }}>Trello</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#F7F8F9" }}>Product Roadmap &amp; Sprint Board</span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "6px 14px",
              background: "#7C5CFC",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Custom Fields Pro
          </button>
        </header>

        {/* Board Canvas Columns */}
        <div style={{
          flex: 1,
          display: "flex",
          gap: 16,
          padding: 20,
          overflowX: "auto",
        }}>
          {["Backlog", "In Progress", "In Review", "Done"].map((colTitle) => (
            <div
              key={colTitle}
              style={{
                width: 272,
                background: "#161A1D",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                border: "1px solid #282E33",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: "#9FADBC" }}>{colTitle}</span>
              <div style={{ background: "#22272B", borderRadius: 6, padding: "10px 12px", fontSize: 13, border: "1px solid #333C43" }}>
                Implement User Permissions
              </div>
              <div style={{ background: "#22272B", borderRadius: 6, padding: "10px 12px", fontSize: 13, border: "1px solid #333C43" }}>
                Design Sprint Planning Table
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Overlay matching Screenshot */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0, 0, 0, 0.72)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            width: "100%",
            maxWidth: 1020,
            height: "88vh",
            maxHeight: 680,
            background: "#1D2125",
            borderRadius: 12,
            border: "1px solid #333C43",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            <BoardFieldsPopup t={mockT} />
          </div>
        </div>
      )}

      {/* Standalone reopen pill if closed */}
      {!modalOpen && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124, 92, 252, 0.4)",
            }}
          >
            Open Custom Fields Pro
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HostApp />
  </React.StrictMode>
);
