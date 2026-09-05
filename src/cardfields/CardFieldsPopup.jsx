import { useEffect, useState } from "react";
import { getBoardSchema, getCardFieldValues, saveCardFieldValues, getBoardMembers, getCurrentCard } from "../lib/trelloApi.js";
import { styles } from "../lib/ui.js";
import { SpinnerIcon, LockIcon } from "../ui/icons.jsx";
import {
  computeMemberAccessBadge,
  parsePermissionType,
  parseRolesFromPermString,
} from "../boardfields/BoardFieldsPopup.jsx";

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

export default function CardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  const [boardMembers, setBoardMembers] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [loggedInMember, setLoggedInMember] = useState(null);

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
    t.sizeTo("#root").catch(() => {});
  }, [t, schema, values, loading, simulatedMemberId]);

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

  async function handleSave() {
    await saveCardFieldValues(t, values);
    if (t && typeof t.closePopup === "function") {
      try {
        t.closePopup();
      } catch {}
    }
  }

  async function handleClear() {
    setValues({});
    await saveCardFieldValues(t, {});
    if (t && typeof t.closePopup === "function") {
      try {
        t.closePopup();
      } catch {}
    }
  }

  function handleOpenBoardSettings() {
    t.modal({
      title: "Custom Fields",
      accentColor: "#1D2125",
      url: "./boardfields.html",
      fullscreen: false,
      height: 560,
    });
  }

  if (loading) {
    return (
      <div style={{ ...styles.wrapper, display: "flex", justifyContent: "center", padding: "30px 0" }}>
        <SpinnerIcon width={24} height={24} style={{ color: "#579DFF" }} />
      </div>
    );
  }

  if (schema.length === 0) {
    return (
      <div style={{ ...styles.wrapper, textAlign: "center", padding: "20px 16px" }}>
        <p style={styles.body}>No custom fields configured for this board yet.</p>
        <button type="button" onClick={handleOpenBoardSettings} style={styles.button}>
          Configure Board Fields
        </button>
      </div>
    );
  }

  const disabledInputStyle = {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "#161A1D",
    borderColor: "#2c333a",
  };

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: "#F7F8F9", fontSize: 13.5 }}>Custom Fields</h4>
        <button
          type="button"
          onClick={handleOpenBoardSettings}
          style={{ background: "none", border: "none", color: "#85B8FF", fontSize: 11.5, cursor: "pointer" }}
        >
          ⚙️ Manage
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: 14 }}>
        {schema.map((field) => {
          const val = values[field.id];

          // Compute field permission for simulated active member
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

          return (
            <div key={field.id}>
              {/* Field Label & Lock Indicator */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ ...styles.label, margin: 0 }}>{field.name}</label>
                {!canEdit && (
                  <span
                    title={access.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: access.className.includes("guest") ? "#FFAB00" : isFormula ? "#7C5CFC" : "#85B8FF",
                      background: access.className.includes("guest")
                        ? "rgba(255, 171, 0, 0.12)"
                        : isFormula
                        ? "rgba(124, 92, 252, 0.12)"
                        : "rgba(133, 184, 255, 0.1)",
                      border: `1px solid ${
                        access.className.includes("guest")
                          ? "rgba(255, 171, 0, 0.28)"
                          : isFormula
                          ? "rgba(124, 92, 252, 0.28)"
                          : "rgba(133, 184, 255, 0.2)"
                      }`,
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    <LockIcon width={10} height={10} />
                    <span>{access.label.replace("🔒 ", "").replace("✓ ", "")}</span>
                  </span>
                )}
              </div>

              {field.type === "text" && (
                field.multiline ? (
                  <textarea
                    disabled={!canEdit}
                    style={{
                      ...styles.input,
                      minHeight: 65,
                      resize: "vertical",
                      fontFamily: "inherit",
                      ...(!canEdit ? disabledInputStyle : {}),
                    }}
                    placeholder={field.placeholder || `Enter ${field.name}...`}
                    value={val || ""}
                    onChange={(e) => canEdit && handleChange(field.id, e.target.value)}
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    disabled={!canEdit}
                    style={{
                      ...styles.input,
                      ...(!canEdit ? disabledInputStyle : {}),
                    }}
                    placeholder={field.placeholder || `Enter ${field.name}...`}
                    value={val || ""}
                    onChange={(e) => canEdit && handleChange(field.id, e.target.value)}
                  />
                )
              )}

              {field.type === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {field.prefix && <span style={{ color: "#9FADBC", fontSize: 13, fontWeight: 600 }}>{field.prefix}</span>}
                  <input
                    type="number"
                    disabled={!canEdit}
                    step={field.decimalPlaces ? `0.${"0".repeat(Math.max(0, field.decimalPlaces - 1))}1` : "any"}
                    min={field.minValue !== undefined ? field.minValue : undefined}
                    style={{
                      ...styles.input,
                      ...(!canEdit ? disabledInputStyle : {}),
                    }}
                    placeholder="0"
                    value={val !== undefined && val !== null ? val : ""}
                    onChange={(e) => canEdit && handleChange(field.id, e.target.value === "" ? null : Number(e.target.value))}
                  />
                  {field.suffix && <span style={{ color: "#9FADBC", fontSize: 13, fontWeight: 500 }}>{field.suffix}</span>}
                </div>
              )}

              {field.type === "dropdown" && (
                <select
                  disabled={!canEdit}
                  style={{
                    ...styles.select,
                    ...(!canEdit ? disabledInputStyle : {}),
                  }}
                  value={val || ""}
                  onChange={(e) => canEdit && handleChange(field.id, e.target.value)}
                >
                  <option value="">-- None --</option>
                  {field.options?.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.text}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "date" && (
                <input
                  type={field.dateTimeMode === "time" ? "time" : field.dateTimeMode === "date" ? "date" : "datetime-local"}
                  disabled={!canEdit}
                  style={{
                    ...styles.input,
                    ...(!canEdit ? disabledInputStyle : {}),
                  }}
                  value={val || ""}
                  onChange={(e) => canEdit && handleChange(field.id, e.target.value)}
                />
              )}

              {field.type === "checkbox" && (
                field.checklistItems && field.checklistItems.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {field.checklistItems.map((item) => {
                      const isChecked = Boolean(typeof val === "object" ? val?.[item.id] : false);
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: canEdit ? "pointer" : "not-allowed",
                            opacity: canEdit ? 1 : 0.65,
                            fontSize: 13,
                            color: isChecked ? "#9FADBC" : "#DCDFE4",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={isChecked}
                            onChange={(e) => {
                              if (!canEdit) return;
                              const currentMap = (typeof val === "object" && val) ? { ...val } : {};
                              if (e.target.checked) currentMap[item.id] = true;
                              else delete currentMap[item.id];
                              handleChange(field.id, currentMap);
                            }}
                            style={{ accentColor: "#579DFF", cursor: canEdit ? "pointer" : "not-allowed" }}
                          />
                          <span>{item.text}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.65, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={Boolean(val)}
                      onChange={(e) => canEdit && handleChange(field.id, e.target.checked)}
                      style={{ accentColor: "#579DFF", cursor: canEdit ? "pointer" : "not-allowed" }}
                    />
                    <span>Active / Done</span>
                  </label>
                )
              )}

              {field.type === "yesno" && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && handleChange(field.id, true)}
                    style={{
                      flex: 1,
                      padding: "7px 12px",
                      borderRadius: 4,
                      border: val === true ? "1px solid #36B37E" : "1px solid #333C43",
                      background: val === true ? "rgba(54, 179, 126, 0.2)" : "#1D2125",
                      color: val === true ? "#4BCE97" : "#9FADBC",
                      fontWeight: val === true ? 600 : 500,
                      fontSize: 12.5,
                      cursor: canEdit ? "pointer" : "not-allowed",
                      opacity: canEdit ? 1 : 0.65,
                      transition: "all 0.15s ease",
                    }}
                  >
                    ✓ {field.yesLabel || "Approved"}
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && handleChange(field.id, false)}
                    style={{
                      flex: 1,
                      padding: "7px 12px",
                      borderRadius: 4,
                      border: val === false ? "1px solid #7C5CFC" : "1px solid #333C43",
                      background: val === false ? "rgba(124, 92, 252, 0.15)" : "#1D2125",
                      color: val === false ? "#BDB4FE" : "#9FADBC",
                      fontWeight: val === false ? 600 : 500,
                      fontSize: 12.5,
                      cursor: canEdit ? "pointer" : "not-allowed",
                      opacity: canEdit ? 1 : 0.65,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {field.noLabel || "Pending"}
                  </button>
                </div>
              )}

              {field.type === "rating" && (
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const current = parseInt(val, 10) || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => canEdit && handleChange(field.id, current === star ? 0 : star)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "18px",
                          color: star <= current ? "#FFAB00" : "#454F59",
                          cursor: canEdit ? "pointer" : "not-allowed",
                          opacity: canEdit ? 1 : 0.5,
                          padding: "0 2px",
                        }}
                      >
                        {star <= current ? "★" : "☆"}
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === "formula" && (() => {
                const computed = evaluateFormula(field.formula, schema, values);
                const symb = field.unitSymbol || (field.returnFormat === "currency" ? "$" : "");
                let text = "—";
                if (computed !== null && computed !== undefined) {
                  if (field.returnFormat === "currency") text = `${symb}${computed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  else if (field.returnFormat === "decimal") text = `${symb}${computed.toFixed(2)}`;
                  else if (field.returnFormat === "percentage") text = `${(computed * 100).toFixed(1)}%`;
                  else text = `${symb}${computed.toLocaleString()}`;
                }
                return (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#14171A",
                      borderRadius: 4,
                      border: "1px solid #333C43",
                      fontSize: 13,
                      fontWeight: 600,
                      color: computed !== null ? "#7C5CFC" : "#6B778C",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{text}</span>
                    <span style={{ fontSize: 11, color: "#6B778C", fontWeight: 400 }}>Auto-calculated</span>
                  </div>
                );
              })()}

              {field.type === "conditional" && (
                <input
                  type="text"
                  disabled={!canEdit}
                  style={{
                    ...styles.input,
                    ...(!canEdit ? disabledInputStyle : {}),
                  }}
                  placeholder={`Enter ${field.name}...`}
                  value={val || ""}
                  onChange={(e) => canEdit && handleChange(field.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: 12 }}>
        <button type="button" onClick={handleSave} style={{ ...styles.button, flex: 2 }}>
          Save
        </button>
        <button type="button" onClick={handleClear} style={{ ...styles.buttonSecondary, flex: 1 }}>
          Clear
        </button>
      </div>

      {/* Simulator Switcher for testing card level permissions */}
      <div
        style={{
          paddingTop: 10,
          borderTop: "1px solid #2C333A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11.5,
          color: "#8C9BAB",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>Simulating:</span>
          <span style={{ color: "#579DFF", fontWeight: 600 }}>{currentMember.name}</span>
        </div>
        <select
          value={simulatedMemberId}
          onChange={(e) => {
            const nextId = e.target.value;
            setSimulatedMemberId(nextId);
            try {
              localStorage.setItem("cf_simulated_member_id", nextId);
              const m = boardMembers.find((item) => item.id === nextId);
              if (m) {
                localStorage.setItem("cf_simulated_role", `${m.name} (${m.role})`);
              }
            } catch {}
          }}
          style={{
            background: "#161A1D",
            border: "1px solid #333C43",
            color: "#DCDFE4",
            borderRadius: 4,
            padding: "3px 6px",
            fontSize: 11,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {boardMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
