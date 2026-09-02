import { useEffect, useState } from "react";
import { getBoardSchema, getCardFieldValues, saveCardFieldValues } from "../lib/trelloApi.js";
import { styles } from "../lib/ui.js";
import { SpinnerIcon } from "../ui/icons.jsx";

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

export default function CardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, v] = await Promise.all([getBoardSchema(t), getCardFieldValues(t)]);
        setSchema(s);
        setValues(v);
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
  }, [t, schema, values, loading]);

  function handleChange(fieldId, val) {
    setValues((prev) => ({
      ...prev,
      [fieldId]: val,
    }));
  }

  async function handleSave() {
    await saveCardFieldValues(t, values);
    t.closePopup();
  }

  async function handleClear() {
    if (!confirm("Clear custom field values on this card?")) return;
    setValues({});
    await saveCardFieldValues(t, {});
    t.closePopup();
  }

  function handleOpenBoardSettings() {
    t.popup({
      title: "Board Custom Fields",
      url: "./boardfields.html",
      height: 380,
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

  return (
    <div style={styles.wrapper}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: 14 }}>
        {schema.map((field) => {
          const val = values[field.id];

          return (
            <div key={field.id}>
              <label style={styles.label}>{field.name}</label>

              {field.type === "text" && (
                <input
                  type="text"
                  style={styles.input}
                  placeholder={`Enter ${field.name}...`}
                  value={val || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}

              {field.type === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {field.prefix && <span style={{ color: "#9FADBC", fontSize: 13, fontWeight: 600 }}>{field.prefix}</span>}
                  <input
                    type="number"
                    step={field.decimalPlaces ? `0.${"0".repeat(Math.max(0, field.decimalPlaces - 1))}1` : "any"}
                    min={field.minValue !== undefined ? field.minValue : undefined}
                    style={styles.input}
                    placeholder="0"
                    value={val !== undefined && val !== null ? val : ""}
                    onChange={(e) => handleChange(field.id, e.target.value === "" ? null : Number(e.target.value))}
                  />
                  {field.suffix && <span style={{ color: "#9FADBC", fontSize: 13, fontWeight: 500 }}>{field.suffix}</span>}
                </div>
              )}

              {field.type === "dropdown" && (
                <select
                  style={styles.select}
                  value={val || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
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
                  style={styles.input}
                  value={val || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}

              {field.type === "checkbox" && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => handleChange(field.id, e.target.checked)}
                    style={{ accentColor: "#579DFF" }}
                  />
                  <span>Active / Done</span>
                </label>
              )}

              {field.type === "rating" && (
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const current = parseInt(val, 10) || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleChange(field.id, current === star ? 0 : star)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "18px",
                          color: star <= current ? "#FFAB00" : "#454F59",
                          cursor: "pointer",
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
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={handleSave} style={{ ...styles.button, flex: 2 }}>
          Save
        </button>
        <button type="button" onClick={handleClear} style={{ ...styles.buttonSecondary, flex: 1 }}>
          Clear
        </button>
      </div>
    </div>
  );
}
