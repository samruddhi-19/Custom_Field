import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import BoardFieldsPopup from "./boardfields/BoardFieldsPopup.jsx";
import "./boardfields/boardfields.css";
import { SparkleIcon } from "./ui/icons.jsx";

const INITIAL_BOARD_SCHEMA = [
  {
    id: "fld_priority",
    name: "Priority Level",
    type: "dropdown",
    description: "Urgency and impact of this task",
    editPermission: "Roles: Board Admin, Project Lead",
    showBadgeFront: true,
    scope: "All",
    options: [
      { id: "opt_critical", text: "Critical", color: "#de350b" },
      { id: "opt_high", text: "High", color: "#ff8b00" },
      { id: "opt_med", text: "Medium", color: "#0052cc" },
      { id: "opt_low", text: "Low", color: "#36b37e" },
    ],
  },
  {
    id: "fld_points",
    name: "Story Points",
    type: "number",
    description: "Effort estimation in Fibonacci points",
    editPermission: "Card Members Only",
    showBadgeFront: true,
    scope: "All",
    minValue: 0,
    decimalPlaces: 0,
    suffix: "pts",
  },
  {
    id: "fld_hours",
    name: "Billable Hours",
    type: "number",
    description: "Logged billable hours for client billing",
    editPermission: "Card Members Only",
    showBadgeFront: false,
    scope: "All",
    minValue: 0,
    decimalPlaces: 1,
    suffix: "hrs",
  },
  {
    id: "fld_rate",
    name: "Hourly Rate",
    type: "number",
    description: "Contracted hourly billing rate",
    editPermission: "Roles: Board Admin, Finance Team",
    showBadgeFront: false,
    scope: "All",
    prefix: "$",
    minValue: 0,
    decimalPlaces: 2,
  },
  {
    id: "fld_budget",
    name: "Total Feature Budget",
    type: "formula",
    description: "Calculated feature cost based on hours and rate",
    editPermission: "Auto Calculated",
    showBadgeFront: true,
    scope: "All",
    formula: "([Billable Hours] * [Hourly Rate])",
    returnFormat: "currency",
    unitSymbol: "$",
  },
  {
    id: "fld_target_date",
    name: "Target Deployment Date & Time",
    type: "date",
    description: "Target production deployment schedule",
    editPermission: "Card Members Only",
    showBadgeFront: true,
    scope: "All",
    dateTimeMode: "datetime",
  },
  {
    id: "fld_qa",
    name: "QA Sign-off",
    type: "yesno",
    description: "Formal QA Lead approval before release",
    editPermission: "Roles: QA Lead, Board Admin",
    showBadgeFront: true,
    scope: "All",
    yesLabel: "QA Passed",
    noLabel: "QA Pending",
  },
  {
    id: "fld_sla",
    name: "SLA Escalation Required",
    type: "conditional",
    description: "Auto-flags when task risks breach",
    editPermission: "Roles: Board Admin",
    showBadgeFront: true,
    scope: "All",
    conditionalField: "Priority Level",
    conditionalOperator: "equals",
    conditionalValue: "Critical",
  },
  {
    id: "fld_compliance",
    name: "Security & Compliance",
    type: "checkbox",
    description: "Mandatory security checklist items",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    checklistItems: [
      { id: "chk_soc2", text: "SOC2 Audit Verified" },
      { id: "chk_gdpr", text: "GDPR Consent Logged" },
      { id: "chk_pen", text: "Penetration Test Passed" },
    ],
  },
  {
    id: "fld_release_note",
    name: "Customer Release Note",
    type: "text",
    description: "Public changelog entry",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    multiline: true,
    placeholder: "Explain user-facing change...",
  },
];

const BOARD_CARDS = [
  {
    id: "c_1",
    listId: "backlog",
    title: "AI Semantic Search for Customer Support Docs",
    accentColor: "#9B8AFF",
    tags: [
      { label: "AI / ML", bg: "rgba(124, 92, 252, 0.22)", color: "#C084FC" },
      { label: "Docs", bg: "rgba(87, 157, 255, 0.22)", color: "#579DFF" },
    ],
    dueDate: "Sep 30",
    avatars: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face"],
    values: {
      fld_priority: "opt_med",
      fld_points: 21,
      fld_hours: 45,
      fld_rate: 150,
      fld_target_date: "Oct 1 5:00pm",
      fld_qa: false,
      fld_sla: null,
    },
  },
  {
    id: "c_2",
    listId: "in_development",
    title: "Implement Multi-Region Redis Cache Cluster",
    accentColor: "#579DFF",
    tags: [
      { label: "Backend Infra", bg: "rgba(87, 157, 255, 0.22)", color: "#579DFF" },
      { label: "High Performance", bg: "rgba(124, 92, 252, 0.22)", color: "#C084FC" },
    ],
    dueDate: "Sep 15",
    avatars: [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=64&h=64&fit=crop&crop=face",
    ],
    values: {
      fld_priority: "opt_high",
      fld_points: 13,
      fld_hours: 32,
      fld_rate: 140,
      fld_target_date: "Sep 18 2:00pm",
      fld_qa: false,
      fld_sla: null,
    },
  },
  {
    id: "c_3",
    listId: "in_development",
    title: "Fix Zero-Day JWT Token Invalidation Bug",
    accentColor: "#F87168",
    tags: [
      { label: "Security", bg: "rgba(248, 113, 104, 0.22)", color: "#F87168" },
      { label: "Urgent Fix", bg: "rgba(248, 113, 104, 0.22)", color: "#F87168" },
    ],
    dueDate: null,
    avatars: [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=face",
    ],
    values: {
      fld_priority: "opt_critical",
      fld_points: 8,
      fld_hours: 20,
      fld_rate: 140,
      fld_target_date: "Sep 5 9:30am",
      fld_qa: true,
      fld_sla: "Escalated to Execs",
    },
  },
  {
    id: "c_4",
    listId: "code_review",
    title: "Custom Webhook Dispatcher & Retry Queue",
    accentColor: "#4BCE97",
    tags: [
      { label: "Integrations", bg: "rgba(75, 206, 151, 0.22)", color: "#4BCE97" },
    ],
    dueDate: "Sep 12",
    avatars: [
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=64&h=64&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face",
    ],
    values: {
      fld_priority: "opt_med",
      fld_points: 5,
      fld_hours: 24,
      fld_rate: 130,
      fld_target_date: "Sep 14 11:00am",
      fld_qa: true,
      fld_sla: null,
    },
  },
  {
    id: "c_5",
    listId: "ready_release",
    title: "Stripe Billing v3 Migration & Webhook Handling",
    accentColor: "#00B8D9",
    tags: [
      { label: "FinOps", bg: "rgba(0, 184, 217, 0.22)", color: "#00B8D9" },
    ],
    dueDate: "Aug 30",
    avatars: [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=face",
    ],
    values: {
      fld_priority: "opt_high",
      fld_points: 8,
      fld_hours: 24,
      fld_rate: 150,
      fld_target_date: "Aug 31 10:00am",
      fld_qa: true,
      fld_sla: null,
    },
  },
];

const BOARD_COLUMNS = [
  { id: "backlog", title: "SPRINT BACKLOG" },
  { id: "in_development", title: "IN DEVELOPMENT" },
  { id: "code_review", title: "CODE REVIEW & QA" },
  { id: "ready_release", title: "READY FOR RELEASE" },
];

function calculateFormulaVal(field, values, schema) {
  if (!field.formula) return "$0.00";
  let expr = field.formula;
  schema.forEach((f) => {
    const rawVal = values[f.id] !== undefined ? Number(values[f.id]) || 0 : 0;
    expr = expr.replaceAll(`[${f.name}]`, String(rawVal));
  });
  try {
    const sanitized = expr.replace(/[^0-9+\-*/(). ]/g, "");
    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === "number" && !isNaN(result)) {
      return `$${result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  } catch {}
  return "$0.00";
}

function HostApp() {
  const [modalOpen, setModalOpen] = useState(false);
  const [schema, setSchema] = useState(() => {
    try {
      const raw = localStorage.getItem("custom_fields_schema");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_BOARD_SCHEMA;
  });

  const [cards, setCards] = useState(BOARD_CARDS);
  const [searchQuery, setSearchQuery] = useState("");

  function reloadSchemaFromStorage() {
    try {
      const raw = localStorage.getItem("custom_fields_schema");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSchema(parsed);
        }
      }
    } catch {}
  }

  // Mock Trello powerup object for host preview
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
        if (key === "custom_fields_schema") {
          setSchema(val);
        }
      } catch {}
      return Promise.resolve();
    },
    member: async () => ({ id: "mem_alex", fullName: "Alex Morgan", username: "alexmorgan" }),
    board: async () => ({
      id: "board_demo_1",
      name: "Product Engineering Board",
      members: [
        { id: "mem_alex", fullName: "Alex Morgan", username: "alexmorgan", initials: "AM", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face" },
        { id: "mem_sarah", fullName: "Sarah Connor", username: "sconnor", initials: "SC", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face" },
        { id: "mem_david", fullName: "David Chen", username: "dchen", initials: "DC", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face" },
        { id: "mem_elena", fullName: "Elena Rostova", username: "erostova", initials: "ER", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=64&h=64&fit=crop&crop=face" },
        { id: "mem_marcus", fullName: "Marcus Brody", username: "mbrody", initials: "MB", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face" },
        { id: "mem_olivia", fullName: "Olivia Taylor", username: "otaylor", initials: "OT", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=face" },
      ],
      memberships: [
        { idMember: "mem_alex", memberType: "admin" },
        { idMember: "mem_sarah", memberType: "normal" },
        { idMember: "mem_david", memberType: "normal" },
        { idMember: "mem_elena", memberType: "normal" },
        { idMember: "mem_marcus", memberType: "normal" },
        { idMember: "mem_olivia", memberType: "normal" },
      ],
    }),
    card: async () => ({
      id: "c_1",
      name: "AI Semantic Search for Customer Support Docs",
      idMembers: ["mem_alex"],
    }),
    closeModal: () => {
      setModalOpen(false);
      reloadSchemaFromStorage();
    },
    closePopup: () => {
      setModalOpen(false);
      reloadSchemaFromStorage();
    },
  };

  // Only fields where showBadgeFront is enabled
  const frontFields = schema.filter((f) => f.showBadgeFront !== false);

  function renderFieldBadge(field, card) {
    const val = card.values[field.id];

    switch (field.type) {
      case "dropdown": {
        const opt = (field.options || []).find((o) => o.id === val) || (field.options || [])[0];
        if (!opt) return null;
        const optText = opt.text.replace(" Priority", "");
        let dotColor = "#579DFF";
        let bg = "rgba(87, 157, 255, 0.12)";
        let border = "rgba(87, 157, 255, 0.28)";

        if (optText.toLowerCase().includes("critical") || optText.toLowerCase().includes("high")) {
          dotColor = optText.toLowerCase().includes("critical") ? "#F87168" : "#FFAB00";
          bg = optText.toLowerCase().includes("critical") ? "rgba(248, 113, 104, 0.14)" : "rgba(255, 171, 0, 0.14)";
          border = optText.toLowerCase().includes("critical") ? "rgba(248, 113, 104, 0.35)" : "rgba(255, 171, 0, 0.35)";
        } else if (optText.toLowerCase().includes("low")) {
          dotColor = "#4BCE97";
          bg = "rgba(75, 206, 151, 0.12)";
          border = "rgba(75, 206, 151, 0.28)";
        }

        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              background: bg,
              border: `1px solid ${border}`,
              color: "#F7F8F9",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor }} />
            {optText}
          </span>
        );
      }

      case "number": {
        const numVal = val !== undefined && val !== null ? val : 10;
        const suffix = field.suffix ? ` ${field.suffix}` : "";
        const prefix = field.prefix || "";
        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              background: "rgba(75, 206, 151, 0.12)",
              border: "1px solid rgba(75, 206, 151, 0.28)",
              color: "#4BCE97",
            }}
          >
            <span style={{ opacity: 0.8 }}>#</span>
            <span style={{ color: "#9FADBC", fontWeight: 500 }}>{field.name}:</span>
            <span style={{ color: "#4BCE97" }}>{prefix}{numVal}{suffix}</span>
          </span>
        );
      }

      case "formula": {
        const result = calculateFormulaVal(field, card.values, schema);
        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              background: "rgba(124, 92, 252, 0.14)",
              border: "1px solid rgba(124, 92, 252, 0.3)",
              color: "#C084FC",
            }}
          >
            <span style={{ fontSize: 11 }}>📝</span>
            <span style={{ color: "#9FADBC", fontWeight: 500 }}>{field.name}:</span>
            <span style={{ color: "#F7F8F9", fontWeight: 700 }}>{result}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>🔒</span>
          </span>
        );
      }

      case "date": {
        const dateVal = val || "Sep 25 2:00pm";
        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 500,
              background: "#202428",
              border: "1px solid #333C43",
              color: "#9FADBC",
            }}
          >
            <span>📅</span>
            <span>{dateVal}</span>
          </span>
        );
      }

      case "yesno": {
        const isPassed = val === true;
        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              background: isPassed ? "rgba(75, 206, 151, 0.12)" : "rgba(194, 120, 3, 0.12)",
              border: isPassed ? "1px solid rgba(75, 206, 151, 0.3)" : "1px solid rgba(194, 120, 3, 0.3)",
              color: isPassed ? "#4BCE97" : "#FFAB00",
            }}
          >
            <span>{isPassed ? "✓" : "✕"}</span>
            <span>{isPassed ? (field.yesLabel || "QA Passed") : (field.noLabel || "QA Pending")}</span>
          </span>
        );
      }

      case "conditional": {
        if (!val) return null;
        return (
          <span
            key={field.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              background: "rgba(75, 206, 151, 0.12)",
              border: "1px solid rgba(75, 206, 151, 0.3)",
              color: "#4BCE97",
            }}
          >
            <span>✓</span>
            <span>{val}</span>
          </span>
        );
      }

      default:
        return null;
    }
  }

  const filteredCards = cards.filter((c) =>
    searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0E1114",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#F7F8F9",
      display: "flex",
      flexDirection: "column",
      userSelect: "none",
    }}>
      {/* Top Header Bar matching Screenshot */}
      <header style={{
        height: 54,
        background: "#161A1D",
        borderBottom: "1px solid #282E33",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 10,
      }}>
        {/* Left: Project title & badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "linear-gradient(135deg, #7C5CFC 0%, #4B38B3 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
          }}>
            F
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚀</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#F7F8F9" }}>
              Cloud Infrastructure &amp; Platform Sprint Q3
            </span>
          </div>
          <span style={{
            padding: "2px 8px",
            background: "#22272B",
            border: "1px solid #333C43",
            borderRadius: 4,
            fontSize: 11,
            color: "#9FADBC",
            fontWeight: 500,
          }}>
            Power-Up Enabled
          </span>
        </div>

        {/* Center: Search Cards & Custom Fields */}
        <div style={{
          position: "relative",
          width: 260,
        }}>
          <input
            type="text"
            placeholder="Search cards, custom fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              height: 32,
              background: "#22272B",
              border: "1px solid #333C43",
              borderRadius: 6,
              color: "#F7F8F9",
              fontSize: 12,
              padding: "0 10px 0 30px",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 10, top: 8, fontSize: 12, color: "#738496" }}>🔍</span>
        </div>

        {/* Right: Studio Button, Add, User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              background: "linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124, 92, 252, 0.35)",
              transition: "transform 0.15s ease",
            }}
          >
            <SparkleIcon width={14} height={14} />
            <span>Custom Fields Studio ({schema.length})</span>
          </button>

          <button
            type="button"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "#22272B",
              border: "1px solid #333C43",
              color: "#9FADBC",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>

          {/* User profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face"
              alt="Alex Morgan"
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DEE4EA" }}>Alex Morgan</span>
            <span style={{
              fontSize: 9.5,
              fontWeight: 800,
              padding: "2px 5px",
              background: "#7C5CFC",
              color: "#fff",
              borderRadius: 3,
              letterSpacing: 0.5,
            }}>
              ADMIN
            </span>
          </div>
        </div>
      </header>

      {/* Board Canvas Columns */}
      <div style={{
        flex: 1,
        padding: "20px 24px",
        display: "flex",
        gap: 20,
        overflowX: "auto",
        alignItems: "flex-start",
      }}>
        {BOARD_COLUMNS.map((col) => {
          const colCards = filteredCards.filter((c) => c.listId === col.id);
          return (
            <div
              key={col.id}
              style={{
                width: 310,
                minWidth: 310,
                background: "#161A1D",
                borderRadius: 10,
                border: "1px solid #282E33",
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 94px)",
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: "14px 16px 10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: "#DEE4EA",
                  }}>
                    {col.title}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#22272B",
                    color: "#9FADBC",
                    borderRadius: 10,
                    padding: "1px 7px",
                  }}>
                    {colCards.length}
                  </span>
                </div>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#738496",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  •••
                </button>
              </div>

              {/* Card List */}
              <div style={{
                padding: "0 12px 8px 12px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: "#22272B",
                      border: "1px solid #333C43",
                      borderRadius: 8,
                      padding: "12px",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      cursor: "pointer",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#579DFF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#333C43";
                    }}
                  >
                    {/* Colored Top Accent Bar */}
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: card.accentColor,
                    }} />

                    {/* Category Tags */}
                    {card.tags && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        {card.tags.map((t) => (
                          <span
                            key={t.label}
                            style={{
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: t.bg,
                              color: t.color,
                              fontSize: 10.5,
                              fontWeight: 700,
                            }}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Title */}
                    <div style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#F7F8F9",
                      lineHeight: 1.4,
                    }}>
                      {card.title}
                    </div>

                    {/* DYNAMIC CUSTOM FIELD FRONT BADGES */}
                    {frontFields.length > 0 && (
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        paddingTop: 4,
                        borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
                      }}>
                        {frontFields.map((field) => renderFieldBadge(field, card))}
                      </div>
                    )}

                    {/* Card Footer: Due Date & Member Avatars */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 4,
                      fontSize: 11.5,
                      color: "#9FADBC",
                    }}>
                      {card.dueDate ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#E2B203" }}>
                          <span>📅</span>
                          <span style={{ fontWeight: 600 }}>{card.dueDate}</span>
                        </span>
                      ) : (
                        <span />
                      )}

                      <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
                        {(card.avatars || []).map((av, idx) => (
                          <img
                            key={idx}
                            src={av}
                            alt="Member"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              border: "2px solid #22272B",
                              marginLeft: idx > 0 ? -6 : 0,
                              objectFit: "cover",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add a card button */}
              <div style={{ padding: "8px 12px 12px 12px" }}>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "none",
                    border: "none",
                    borderRadius: 6,
                    color: "#9FADBC",
                    fontSize: 12.5,
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#22272B";
                    e.currentTarget.style.color = "#F7F8F9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.color = "#9FADBC";
                  }}
                >
                  <span style={{ fontSize: 14 }}>+</span>
                  <span>Add a card</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Modal Overlay */}
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
            maxWidth: 1040,
            height: "90vh",
            maxHeight: 760,
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HostApp />
  </React.StrictMode>
);
