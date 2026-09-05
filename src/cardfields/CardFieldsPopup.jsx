import { useEffect, useState } from "react";
import {
  getBoardSchema,
  saveBoardSchema,
  getCardFieldValues,
  saveCardFieldValues,
  getBoardMembers,
  getCurrentCard,
} from "../lib/trelloApi.js";
import {
  SpinnerIcon,
  LockIcon,
  DropdownIcon,
  HashIcon,
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  CheckboxIcon,
  TextIcon,
  SparkleIcon,
  ConditionalIcon,
} from "../ui/icons.jsx";
import {
  computeMemberAccessBadge,
  parsePermissionType,
  parseRolesFromPermString,
} from "../boardfields/BoardFieldsPopup.jsx";
import "./cardfields.css";

function InfoIcon({ width = 13, height = 13, style = {} }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const COLOR_MAP = {
  red: "#de350b",
  blue: "#0052cc",
  green: "#36b37e",
  yellow: "#ffab00",
  orange: "#ff5630",
  purple: "#6554c0",
  teal: "#00b8d9",
  gray: "#5e6c84",
};

function evaluateFormula(formula, schema, values) {
  if (!formula || typeof formula !== "string") return null;
  let expr = formula;
  schema.forEach((f) => {
    const val = values[f.id];
    let numVal = 0;
    if (typeof val === "number") numVal = val;
    else if (val && !isNaN(Number(val))) numVal = Number(val);
    expr = expr.replaceAll(`[${f.name}]`, String(numVal));
  });
  try {
    if (!/^[0-9+\-*/().\s%]+$/.test(expr)) return null;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

function getFormulaBreakdown(formula, schema, values) {
  if (!formula || typeof formula !== "string") return "";
  let expr = formula;
  schema.forEach((f) => {
    const v = values[f.id];
    const displayNum = v !== undefined && v !== null && v !== "" ? v : 0;
    expr = expr.replaceAll(`[${f.name}]`, `${displayNum}`);
  });
  return expr;
}

function checkConditionalRule(field, schema, values) {
  if (field.type !== "conditional" || !field.conditionalField) return true;
  const targetField = schema.find((f) => f.name === field.conditionalField || f.id === field.conditionalField);
  const actualVal = targetField ? values[targetField.id] : values[field.conditionalField];
  const targetVal = field.conditionalValue;
  const op = field.conditionalOperator || "equals";

  if (op === "not_empty") {
    return actualVal !== undefined && actualVal !== null && String(actualVal).trim() !== "";
  }
  if (op === "equals") {
    return String(actualVal || "").toLowerCase() === String(targetVal || "").toLowerCase();
  }
  if (op === "not_equals") {
    return String(actualVal || "").toLowerCase() !== String(targetVal || "").toLowerCase();
  }
  if (op === "contains") {
    return String(actualVal || "").toLowerCase().includes(String(targetVal || "").toLowerCase());
  }
  if (op === "gt") {
    return Number(actualVal) > Number(targetVal);
  }
  if (op === "lt") {
    return Number(actualVal) < Number(targetVal);
  }
  return true;
}


function renderFieldTypeIcon(field) {
  const iconStyle = { flexShrink: 0 };
  switch (field.type) {
    case "dropdown":
      return <DropdownIcon width={16} height={16} />;
    case "number":
      return <HashIcon width={16} height={16} style={{ color: "#36B37E", ...iconStyle }} />;
    case "formula":
      return <CalculatorIcon width={16} height={16} style={{ color: "#C084FC", ...iconStyle }} />;
    case "date":
      return <CalendarIcon width={16} height={16} style={{ color: "#FFAB00", ...iconStyle }} />;
    case "yesno":
      return <EyeIcon width={16} height={16} style={{ color: "#00C7E6", ...iconStyle }} />;
    case "checkbox":
      return <CheckboxIcon width={16} height={16} style={{ color: "#579DFF", ...iconStyle }} />;
    case "text":
      return <TextIcon width={16} height={16} style={{ color: "#DEE4EA", ...iconStyle }} />;
    case "conditional":
      return <ConditionalIcon width={16} height={16} style={{ color: "#FFAB00", ...iconStyle }} />;
    default:
      return <HashIcon width={16} height={16} style={{ color: "#579DFF", ...iconStyle }} />;
  }
}

export default function CardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  const [boardMembers, setBoardMembers] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [loggedInMember, setLoggedInMember] = useState(null);

  // Inspect formula drawer state
  const [inspectFormulaId, setInspectFormulaId] = useState(null);

  // Simulated member for testing & permission enforcement
  const [simulatedMemberId, setSimulatedMemberId] = useState(() => {
    try {
      const stored = localStorage.getItem("cf_simulated_member_id");
      if (stored) return stored;
    } catch {}
    return "";
  });

  const currentMember =
    boardMembers.find((m) => m.id === simulatedMemberId) ||
    boardMembers[0] ||
    (loggedInMember
      ? {
          id: loggedInMember.id,
          name: loggedInMember.fullName || loggedInMember.username || "Board Member",
          role: "Team Member",
          isAdmin: false,
        }
      : {
          id: "member",
          name: "Board Member",
          role: "Team Member",
          isAdmin: false,
        });

  useEffect(() => {
    function handleStorage() {
      try {
        const stored = localStorage.getItem("cf_simulated_member_id");
        if (stored) {
          setSimulatedMemberId(stored);
        }
      } catch {}
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [s, v, m, card, tMem] = await Promise.all([
          getBoardSchema(t),
          getCardFieldValues(t),
          getBoardMembers(t),
          getCurrentCard(t),
          t && typeof t.member === "function" ? t.member("id", "fullName", "username").catch(() => null) : null,
        ]);
        setSchema(s || []);
        setValues(v || {});
        setBoardMembers(m || []);
        setCurrentCard(card);
        setLoggedInMember(tMem);
        if (m && m.length > 0) {
          const matchedUser = tMem ? m.find((item) => item.id === tMem.id || (tMem.username && item.username === tMem.username)) : null;
          const adminUser = m.find((item) => item.isAdmin) || m[0];
          setSimulatedMemberId((prev) => (prev && m.some((item) => item.id === prev) ? prev : (matchedUser || adminUser).id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t]);

  useEffect(() => {
    if (t && typeof t.sizeTo === "function") {
      t.sizeTo("#root").catch(() => {});
    }
  }, [t, schema, values, loading, simulatedMemberId, inspectFormulaId]);

  async function handleChange(fieldId, val) {
    const next = {
      ...values,
      [fieldId]: val,
    };
    setValues(next);
    try {
      await saveCardFieldValues(t, next);
    } catch (e) {
      console.warn("Auto-save failed:", e);
    }
  }

  function handleOpenBoardSettings() {
    if (t && typeof t.modal === "function") {
      t.modal({
        title: "Custom Fields Pro",
        accentColor: "#1D2125",
        url: "./boardfields.html",
        fullscreen: false,
        height: 640,
      });
    }
  }

  if (loading) {
    return (
      <div className="cf-cardback-root" style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <SpinnerIcon width={26} height={26} style={{ color: "#579DFF" }} />
      </div>
    );
  }

  if (schema.length === 0) {
    return (
      <div className="cf-cardback-empty-box">
        <div className="cf-cardback-empty-iconbox">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <line x1="7" y1="8" x2="13" y2="8" />
            <circle cx="16.5" cy="8" r="1.5" fill="currentColor" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="16" x2="11" y2="16" />
            <polyline points="14 16 15.5 17.5 18 14.5" />
          </svg>
        </div>
        <div className="cf-cardback-empty-info">
          <h4 className="cf-cardback-empty-title">No custom fields configured yet</h4>
          <p className="cf-cardback-empty-desc">
            Create and manage custom fields for this board to track extra details on your cards.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenBoardSettings}
          className="cf-btn-trello-primary"
        >
          + Configure Fields
        </button>
      </div>
    );
  }

  return (
    <div className="cf-cardback-root">
      {/* 2-Column Grid */}
      <div className="cf-cardback-grid">
        {schema.map((field) => {
          const val = values[field.id];

          // Compute field permission for active member
          const permType = field.permissionType || parsePermissionType(field.editPermission);
          const allowedRoles = field.allowedRoles || parseRolesFromPermString(field.editPermission);
          const allowedUsers = field.allowedUsers || [];
          const access = computeMemberAccessBadge(currentMember, permType, allowedRoles, allowedUsers);
          const isFormula = field.type === "formula";

          const cardMemberIds = currentCard?.idMembers || (currentCard?.members || []).map((m) => m.id) || [];
          const isAssignedToCard = Boolean(currentMember?.id && cardMemberIds.includes(currentMember.id));

          let canEdit = !isFormula && !access.className.includes("locked") && !access.className.includes("guest");
          if (permType === "card_members" && !currentMember?.isAdmin && !isAssignedToCard) {
            canEdit = false;
          }

          const descText = getDefaultDescription(field);

          return (
            <div key={field.id} className="cf-cardback-item">
              {/* Header Row */}
              <div className="cf-cardback-header">
                <div className="cf-cardback-header-left">
                  <div className="cf-cardback-icon">{renderFieldTypeIcon(field)}</div>
                  <span className="cf-cardback-title" title={field.name}>
                    {field.name}
                  </span>
                </div>

                <div className="cf-cardback-meta">
                  {isFormula && (
                    <button
                      type="button"
                      className="cf-btn-inspect"
                      onClick={() =>
                        setInspectFormulaId((prev) => (prev === field.id ? null : field.id))
                      }
                      title="Inspect formula calculation"
                    >
                      <span className="cf-tag-formula">fx</span>
                    </button>
                  )}

                  {!canEdit && (
                    <span className="cf-tag-locked" title={access.label}>
                      <LockIcon width={11} height={11} />
                    </span>
                  )}
                </div>
              </div>

              {/* Control Widgets */}
              {/* 1. Dropdown */}
              {field.type === "dropdown" && (
                (() => {
                  const opts = field.options || [];
                  const selectedOpt = opts.find((o) => o.id === val || o.text === val);

                  return (
                    <div className="cf-select-wrap">
                      <select
                        disabled={!canEdit}
                        className="cf-cardback-select"
                        value={selectedOpt ? selectedOpt.id : val || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      >
                        <option value="">Select option...</option>
                        {opts.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.text}
                          </option>
                        ))}
                      </select>
                      <span className="cf-select-chevron">▾</span>
                    </div>
                  );
                })()
              )}

              {/* 2. Number with Built-in Micro Steppers */}
              {field.type === "number" && (
                (() => {
                  const numVal = val !== undefined && val !== null && val !== "" ? Number(val) : "";
                  const step = field.decimalPlaces ? Math.pow(10, -Number(field.decimalPlaces)) : 1;

                  function handleStep(delta) {
                    if (!canEdit) return;
                    const cur = typeof numVal === "number" && !isNaN(numVal) ? numVal : (field.minValue !== undefined ? Number(field.minValue) : 0);
                    let next = Math.round((cur + delta) * 100) / 100;
                    if (field.minValue !== undefined && next < Number(field.minValue)) {
                      next = Number(field.minValue);
                    }
                    handleChange(field.id, next);
                  }

                  return (
                    <div className="cf-number-input-box">
                      {field.prefix && <span className="cf-number-prefix">{field.prefix}</span>}
                      <input
                        type="number"
                        disabled={!canEdit}
                        className="cf-number-native-input"
                        value={val !== undefined && val !== null ? val : ""}
                        placeholder="0"
                        step={field.decimalPlaces ? `0.${"0".repeat(Math.max(0, field.decimalPlaces - 1))}1` : "any"}
                        min={field.minValue !== undefined ? field.minValue : undefined}
                        onChange={(e) =>
                          handleChange(field.id, e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                      {field.suffix && <span className="cf-number-suffix">{field.suffix}</span>}
                      <div className="cf-mini-steppers">
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="cf-btn-mini-step"
                          onClick={() => handleStep(step)}
                          title="Increment"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="cf-btn-mini-step"
                          onClick={() => handleStep(-step)}
                          title="Decrement"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* 3. Formula Box */}
              {field.type === "formula" && (
                (() => {
                  const calculated = evaluateFormula(field.formula, schema, values);
                  const symb = field.unitSymbol || (field.returnFormat === "currency" ? "$" : "");
                  let formatted = "-";
                  if (typeof calculated === "number" && !isNaN(calculated)) {
                    if (field.returnFormat === "currency") {
                      formatted = `${symb}${calculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else if (field.returnFormat === "decimal") {
                      formatted = `${symb}${calculated.toFixed(2)}`;
                    } else if (field.returnFormat === "percentage") {
                      formatted = `${(calculated * 100).toFixed(1)}%`;
                    } else {
                      formatted = `${symb}${calculated.toLocaleString()}`;
                    }
                  }

                  const isInspected = inspectFormulaId === field.id;

                  return (
                    <div>
                      <div className="cf-formula-box">
                        <span className="cf-formula-val">{formatted}</span>
                        <span className="cf-formula-tag">Auto-Calculated</span>
                      </div>

                      {isInspected && (
                        <div className="cf-formula-inspect-panel">
                          <div><strong>Formula:</strong> {field.formula || "([Hours] * [Rate])"}</div>
                          <div style={{ marginTop: 4 }}>
                            <strong>Calculation:</strong> {getFormulaBreakdown(field.formula, schema, values)} = {formatted}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* 4. Date & Time Dual Pickers */}
              {field.type === "date" && (
                (() => {
                  let datePart = "";
                  let timePart = "";
                  if (typeof val === "string") {
                    if (val.includes("T")) {
                      const parts = val.split("T");
                      datePart = parts[0];
                      timePart = parts[1]?.slice(0, 5) || "";
                    } else if (val.includes(" ")) {
                      const parts = val.split(" ");
                      datePart = parts[0];
                      timePart = parts.slice(1).join(" ");
                    } else {
                      datePart = val;
                    }
                  }

                  return (
                    <div className="cf-datetime-row">
                      <div className="cf-datetime-col">
                        <span className="cf-datetime-sublabel">Date</span>
                        <div className="cf-datetime-input-wrap">
                          <input
                            type="date"
                            disabled={!canEdit}
                            className="cf-datetime-native-input"
                            value={datePart || ""}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const combined = timePart ? `${newDate} ${timePart}` : newDate;
                              handleChange(field.id, combined);
                            }}
                          />
                        </div>
                      </div>

                      <div className="cf-datetime-col">
                        <span className="cf-datetime-sublabel">Time</span>
                        <div className="cf-datetime-input-wrap">
                          <input
                            type="time"
                            disabled={!canEdit}
                            className="cf-datetime-native-input"
                            value={timePart || ""}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              const combined = datePart ? `${datePart} ${newTime}` : newTime;
                              handleChange(field.id, combined);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* 5. Yes / No QA Sign-off Toggle */}
              {field.type === "yesno" && (
                (() => {
                  const isYes = val === true;
                  const isNo = val === false;

                  return (
                    <div className="cf-yesno-toggle-row">
                      <button
                        type="button"
                        disabled={!canEdit}
                        className={`cf-btn-yesno ${isYes ? "active" : "inactive"}`}
                        onClick={() => handleChange(field.id, isYes ? null : true)}
                      >
                        <span>✓</span>
                        <span>{field.yesLabel || "QA Passed"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canEdit}
                        className={`cf-btn-yesno ${isNo ? "active" : "inactive"}`}
                        onClick={() => handleChange(field.id, isNo ? null : false)}
                      >
                        <span>✕</span>
                        <span>{field.noLabel || "QA Pending"}</span>
                      </button>
                    </div>
                  );
                })()
              )}

              {/* 6. Checkbox / Compliance Checklist */}
              {field.type === "checkbox" && (
                (() => {
                  const chkVal = typeof val === "object" && val !== null ? val : {};
                  const items = field.checklistItems && field.checklistItems.length > 0 ? field.checklistItems : null;

                  if (items) {
                    return (
                      <div className="cf-checklist-container">
                        {items.map((it) => {
                          const checked = Boolean(chkVal[it.id]);
                          return (
                            <div
                              key={it.id}
                              className="cf-checklist-item"
                              onClick={() => {
                                if (!canEdit) return;
                                handleChange(field.id, {
                                  ...chkVal,
                                  [it.id]: !checked,
                                });
                              }}
                            >
                              <div className={`cf-checklist-checkbox ${checked ? "checked" : ""}`}>
                                {checked && "✓"}
                              </div>
                              <span>{it.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <label className="cf-checklist-item" style={{ marginTop: 2 }}>
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={Boolean(val)}
                        onChange={(e) => handleChange(field.id, e.target.checked)}
                      />
                      <span>{field.name}</span>
                    </label>
                  );
                })()
              )}

              {/* 7. Text Input / Customer Release Note */}
              {field.type === "text" && (
                field.multiline ? (
                  <textarea
                    disabled={!canEdit}
                    className="cf-cardback-textarea"
                    placeholder={field.placeholder || `Enter ${field.name}...`}
                    value={val || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    disabled={!canEdit}
                    className="cf-cardback-input-text"
                    placeholder={field.placeholder || `Enter ${field.name}...`}
                    value={val || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )
              )}

              {/* 8. Conditional Value Fallback */}
              {field.type === "conditional" && (
                <input
                  type="text"
                  disabled={!canEdit}
                  className="cf-cardback-input-text"
                  placeholder={field.placeholder || `Enter ${field.name}...`}
                  value={val || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="cf-cardback-footer">
        <button
          type="button"
          onClick={handleOpenBoardSettings}
          className="cf-btn-configure-fields"
        >
          ⚙ Configure Fields
        </button>
      </div>
    </div>
  );
}
