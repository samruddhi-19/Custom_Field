import { useEffect, useState } from "react";
import { getBoardSchema, saveBoardSchema } from "../lib/trelloApi.js";
import { styles } from "../lib/ui.js";
import { TrashIcon, EditIcon, SpinnerIcon } from "../ui/icons.jsx";

const FIELD_TYPES = [
  { value: "text", label: "📝 Text (Single line)" },
  { value: "number", label: "🔢 Number" },
  { value: "dropdown", label: "🔽 Dropdown (Colors)" },
  { value: "date", label: "📅 Date" },
  { value: "checkbox", label: "☑️ Checkbox" },
  { value: "rating", label: "⭐ Rating (1-5 Stars)" },
];

const COLOR_OPTIONS = [
  { name: "Blue", value: "blue", bg: "#0052cc" },
  { name: "Green", value: "green", bg: "#36b37e" },
  { name: "Yellow", value: "yellow", bg: "#ffab00" },
  { name: "Orange", value: "orange", bg: "#ff5630" },
  { name: "Red", value: "red", bg: "#de350b" },
  { name: "Purple", value: "purple", bg: "#6554c0" },
  { name: "Gray", value: "gray", bg: "#5e6c84" },
];

export default function BoardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [showBadgeFront, setShowBadgeFront] = useState(true);
  const [options, setOptions] = useState([]);
  const [optText, setOptText] = useState("");
  const [optColor, setOptColor] = useState("blue");

  useEffect(() => {
    async function load() {
      try {
        const s = await getBoardSchema(t);
        setSchema(s);
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
  }, [t, schema, isEditing, options, loading]);

  function handleStartAdd() {
    setEditId(null);
    setName("");
    setType("text");
    setShowBadgeFront(true);
    setOptions([]);
    setIsEditing(true);
  }

  function handleStartEdit(field) {
    setEditId(field.id);
    setName(field.name);
    setType(field.type);
    setShowBadgeFront(field.showBadgeFront !== false);
    setOptions(field.options ? JSON.parse(JSON.stringify(field.options)) : []);
    setIsEditing(true);
  }

  function handleAddOption() {
    if (!optText.trim()) return;
    setOptions([
      ...options,
      {
        id: "opt_" + Date.now() + Math.random().toString(36).substring(2, 5),
        text: optText.trim(),
        color: optColor,
      },
    ]);
    setOptText("");
  }

  function handleRemoveOption(idx) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  async function handleSaveField() {
    if (!name.trim()) {
      alert("Please enter a field name.");
      return;
    }
    if (type === "dropdown" && options.length === 0) {
      alert("Please add at least one dropdown option.");
      return;
    }

    let updated;
    if (editId) {
      updated = schema.map((f) =>
        f.id === editId
          ? { ...f, name: name.trim(), type, options: type === "dropdown" ? options : undefined, showBadgeFront }
          : f
      );
    } else {
      const newField = {
        id: "cf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: name.trim(),
        type,
        options: type === "dropdown" ? options : undefined,
        showBadgeFront,
      };
      updated = [...schema, newField];
    }

    setSchema(updated);
    setIsEditing(false);
    await saveBoardSchema(t, updated);
  }

  async function handleDeleteField(id) {
    if (!confirm("Are you sure you want to delete this custom field?")) return;
    const updated = schema.filter((f) => f.id !== id);
    setSchema(updated);
    await saveBoardSchema(t, updated);
  }

  if (loading) {
    return (
      <div style={{ ...styles.wrapper, display: "flex", justifyContent: "center", padding: "30px 0" }}>
        <SpinnerIcon width={24} height={24} style={{ color: "#579DFF" }} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div style={styles.wrapper}>
        <h4 style={{ margin: "0 0 12px", color: "#F7F8F9", fontSize: 14 }}>
          {editId ? "Edit Custom Field" : "Create Custom Field"}
        </h4>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Field Name</label>
          <input
            type="text"
            style={styles.input}
            placeholder="e.g. Priority, Stage, Estimate"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Field Type</label>
          <select style={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            {FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {ft.label}
              </option>
            ))}
          </select>
        </div>

        {type === "dropdown" && (
          <div style={{ marginBottom: 12, background: "#22272B", padding: "10px", borderRadius: 4 }}>
            <label style={styles.label}>Options</label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <input
                type="text"
                style={{ ...styles.input, flex: 1 }}
                placeholder="Option name..."
                value={optText}
                onChange={(e) => setOptText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
              />
              <select
                style={{ ...styles.select, width: "85px" }}
                value={optColor}
                onChange={(e) => setOptColor(e.target.value)}
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddOption}
                style={{ ...styles.buttonSecondary, padding: "4px 8px" }}
              >
                Add
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {options.map((opt, idx) => (
                <span
                  key={opt.id || idx}
                  style={{
                    background: "#2C333A",
                    borderLeft: `3px solid ${COLOR_OPTIONS.find((c) => c.value === opt.color)?.bg || "#579DFF"}`,
                    padding: "3px 8px",
                    borderRadius: 3,
                    fontSize: 11.5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {opt.text}
                  <span
                    onClick={() => handleRemoveOption(idx)}
                    style={{ cursor: "pointer", color: "#F87168" }}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showBadgeFront}
              onChange={(e) => setShowBadgeFront(e.target.checked)}
              style={{ accentColor: "#579DFF" }}
            />
            <span>Show badge on card front</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={handleSaveField} style={{ ...styles.button, flex: 1 }}>
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            style={{ ...styles.buttonSecondary, flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: "#F7F8F9", fontSize: 14 }}>Board Custom Fields</h4>
        <button
          type="button"
          onClick={handleStartAdd}
          style={{ ...styles.buttonSecondary, padding: "4px 8px", fontSize: 12 }}
        >
          + New Field
        </button>
      </div>

      {schema.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#9FADBC", fontSize: 13 }}>
          <p style={{ margin: "0 0 10px" }}>No custom fields created yet.</p>
          <button type="button" onClick={handleStartAdd} style={styles.button}>
            Create First Field
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: 14 }}>
          {schema.map((field) => (
            <div
              key={field.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#22272B",
                borderRadius: 4,
                border: "1px solid #333C43",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#F7F8F9" }}>{field.name}</div>
                <div style={{ fontSize: 11, color: "#9FADBC", textTransform: "capitalize" }}>
                  {field.type}
                  {field.options ? ` (${field.options.length} options)` : ""}
                  {field.showBadgeFront ? " • Front Badge" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => handleStartEdit(field)}
                  style={{ background: "none", border: "none", color: "#9FADBC", cursor: "pointer", padding: "4px" }}
                  title="Edit"
                >
                  <EditIcon width={14} height={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteField(field.id)}
                  style={{ background: "none", border: "none", color: "#F87168", cursor: "pointer", padding: "4px" }}
                  title="Delete"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => t.closePopup()}
        style={{ ...styles.buttonSecondary, width: "100%", marginTop: 8 }}
      >
        Done
      </button>
    </div>
  );
}
