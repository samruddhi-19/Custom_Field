import { useEffect, useState } from "react";
import { getBoardSchema, saveBoardSchema } from "../lib/trelloApi.js";
import {
  TrashIcon, EditIcon, SpinnerIcon, CloseIcon,
  ExportIcon, ImportIcon, LockIcon, FieldsIcon,
  ShieldIcon, TemplateIcon,
  DropdownIcon, NumberIcon, DateTimeIcon, FormulaIcon,
  YesNoIcon, ConditionalIcon, CheckboxIcon, TextIcon,
} from "../ui/icons.jsx";
import "./boardfields.css";

/* ─── Field Type Definitions ─── */
const FIELD_TYPES = [
  {
    value: "dropdown",
    label: "Dropdown",
    desc: "Select from colored custom option tags",
    Icon: DropdownIcon,
  },
  {
    value: "number",
    label: "Numbers",
    desc: "Story pts, hours, currency with units & steppers",
    Icon: NumberIcon,
  },
  {
    value: "date",
    label: "Date & Time",
    desc: "Date only, time only, or combined timestamps",
    Icon: DateTimeIcon,
  },
  {
    value: "formula",
    label: "Calculated Formula",
    desc: "Live formula: [Hours] * [Rate] or Math functions",
    Icon: FormulaIcon,
  },
  {
    value: "yesno",
    label: "Yes / No",
    desc: "Approval switches, status toggles",
    Icon: YesNoIcon,
  },
  {
    value: "conditional",
    label: "Conditional Values",
    desc: "Show or highlight based on other field rules",
    Icon: ConditionalIcon,
  },
  {
    value: "checkbox",
    label: "Checkboxes",
    desc: "Multi-item compliance or checklist options",
    Icon: CheckboxIcon,
  },
  {
    value: "text",
    label: "Text",
    desc: "Single line text or multiline notes",
    Icon: TextIcon,
  },
];

const COLOR_OPTIONS = [
  { name: "Red", value: "red", bg: "#de350b" },
  { name: "Blue", value: "blue", bg: "#0052cc" },
  { name: "Green", value: "green", bg: "#36b37e" },
  { name: "Yellow", value: "yellow", bg: "#ffab00" },
  { name: "Orange", value: "orange", bg: "#ff5630" },
  { name: "Purple", value: "purple", bg: "#6554c0" },
  { name: "Teal", value: "teal", bg: "#00b8d9" },
  { name: "Gray", value: "gray", bg: "#5e6c84" },
];

const MAIN_TABS = ["all", "permissions", "templates"];
const STEP_TABS = ["config", "permissions", "display"];

export default function BoardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("main"); // main | create
  const [mainTab, setMainTab] = useState("all");
  const [stepTab, setStepTab] = useState("config");
  const [editId, setEditId] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("dropdown");
  const [showBadgeFront, setShowBadgeFront] = useState(true);
  const [options, setOptions] = useState([]);
  const [optText, setOptText] = useState("");
  const [optColor, setOptColor] = useState("red");

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

  /* ─── Handlers ─── */

  function handleStartAdd(preselectedType) {
    setEditId(null);
    setName("");
    setDescription("");
    setType(preselectedType || "dropdown");
    setShowBadgeFront(true);
    setOptions([]);
    setStepTab("config");
    setView("create");
  }

  function handleStartEdit(field) {
    setEditId(field.id);
    setName(field.name);
    setDescription(field.description || "");
    setType(field.type);
    setShowBadgeFront(field.showBadgeFront !== false);
    setOptions(field.options ? JSON.parse(JSON.stringify(field.options)) : []);
    setStepTab("config");
    setView("create");
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
          ? {
              ...f,
              name: name.trim(),
              description: description.trim(),
              type,
              options: type === "dropdown" ? options : undefined,
              showBadgeFront,
            }
          : f
      );
    } else {
      const newField = {
        id: "cf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: name.trim(),
        description: description.trim(),
        type,
        options: type === "dropdown" ? options : undefined,
        showBadgeFront,
      };
      updated = [...schema, newField];
    }

    setSchema(updated);
    setView("main");
    await saveBoardSchema(t, updated);
  }

  async function handleDeleteField(id) {
    if (!confirm("Are you sure you want to delete this custom field?")) return;
    const updated = schema.filter((f) => f.id !== id);
    setSchema(updated);
    await saveBoardSchema(t, updated);
  }

  function handleClose() {
    t.closeModal();
  }

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="cf-panel">
        <div className="cf-loading">
          <SpinnerIcon width={28} height={28} style={{ color: "#7C5CFC" }} />
        </div>
      </div>
    );
  }

  /* ─── Create / Edit View ─── */
  if (view === "create") {
    return (
      <div className="cf-panel">
        {/* Breadcrumb Header */}
        <div className="cf-create-header">
          <div className="cf-breadcrumb">
            <button
              type="button"
              className="cf-breadcrumb-back"
              onClick={() => setView("main")}
            >
              ← Back to fields
            </button>
            <span className="cf-breadcrumb-sep">/</span>
            <span className="cf-breadcrumb-current">
              {editId ? "Edit Custom Field" : "Create New Custom Field"}
            </span>
          </div>
          <div className="cf-create-actions">
            <button
              type="button"
              className="cf-btn-cancel"
              onClick={() => setView("main")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cf-btn-save"
              onClick={handleSaveField}
            >
              Save Custom Field
            </button>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="cf-steps">
          <button
            type="button"
            className={`cf-step ${stepTab === "config" ? "active" : ""}`}
            onClick={() => setStepTab("config")}
          >
            1. Field Configuration & Type
          </button>
          <button
            type="button"
            className={`cf-step ${stepTab === "permissions" ? "active" : ""}`}
            onClick={() => setStepTab("permissions")}
          >
            <span className="cf-step-icon">
              <LockIcon width={12} height={12} />
            </span>
            2. Field-Level Permissions
          </button>
          <button
            type="button"
            className={`cf-step ${stepTab === "display" ? "active" : ""}`}
            onClick={() => setStepTab("display")}
          >
            3. Card Attachment & Front Display
          </button>
        </div>

        {/* Step Content */}
        <div className="cf-content">
          {stepTab === "config" && (
            <>
              {/* Left: Form */}
              <div className="cf-content-left">
                <div className="cf-form-group">
                  <label className="cf-form-label">
                    Field Name <span className="cf-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="cf-form-input"
                    placeholder="e.g. Story Points, Hourly Rate, Release Date"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="cf-form-group">
                  <label className="cf-form-label">
                    Description / Help Tooltip
                  </label>
                  <textarea
                    className="cf-form-textarea"
                    placeholder="Helpful guidance for team members entering this field..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="cf-form-group">
                  <label className="cf-form-label">Field Type</label>
                  <div className="cf-field-type-grid">
                    {FIELD_TYPES.map((ft) => (
                      <div
                        key={ft.value}
                        className={`cf-field-type-card ${type === ft.value ? "selected" : ""}`}
                        onClick={() => setType(ft.value)}
                      >
                        <div className="cf-field-type-card-icon">
                          <ft.Icon width={18} height={18} />
                        </div>
                        <div className="cf-field-type-card-info">
                          <div className="cf-field-type-card-name">{ft.label}</div>
                          <div className="cf-field-type-card-desc">{ft.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Type-specific settings */}
              <div className="cf-content-right">
                {type === "dropdown" ? (
                  <div className="cf-settings-panel">
                    <h3>Dropdown Specific Settings</h3>

                    <div className="cf-dropdown-header">
                      <span>Dropdown Options</span>
                      <button
                        type="button"
                        className="cf-btn-add-option"
                        onClick={() => document.getElementById("cf-opt-input")?.focus()}
                      >
                        + Add Option
                      </button>
                    </div>

                    <div className="cf-option-list">
                      {options.map((opt, idx) => (
                        <div key={opt.id || idx} className="cf-option-row">
                          <div
                            className="cf-option-color-swatch"
                            style={{
                              background: COLOR_OPTIONS.find(
                                (c) => c.value === opt.color
                              )?.bg || "#5e6c84",
                            }}
                          />
                          <div className="cf-option-text">
                            {opt.text}
                          </div>
                          <button
                            type="button"
                            className="cf-btn-delete-option"
                            onClick={() => handleRemoveOption(idx)}
                            title="Remove option"
                          >
                            <TrashIcon width={14} height={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="cf-add-option-row">
                      <input
                        id="cf-opt-input"
                        type="text"
                        placeholder="Option name..."
                        value={optText}
                        onChange={(e) => setOptText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <select
                        className="cf-color-select"
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
                        className="cf-btn-add-small"
                        onClick={handleAddOption}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cf-placeholder">
                    {/* Empty space — type-specific settings for other types go here */}
                  </div>
                )}
              </div>
            </>
          )}

          {stepTab === "permissions" && (
            <div className="cf-content-left" style={{ borderRight: "none" }}>
              <div className="cf-placeholder">
                Field-Level Permissions — Coming Soon
              </div>
            </div>
          )}

          {stepTab === "display" && (
            <div className="cf-content-left" style={{ borderRight: "none" }}>
              <div className="cf-form-group" style={{ marginTop: 8 }}>
                <label className="cf-checkbox-row">
                  <input
                    type="checkbox"
                    checked={showBadgeFront}
                    onChange={(e) => setShowBadgeFront(e.target.checked)}
                  />
                  <span>Show badge on card front</span>
                </label>
              </div>
              <div className="cf-placeholder" style={{ marginTop: 16 }}>
                Card Attachment & Front Display settings — Coming Soon
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Main Panel View ─── */
  return (
    <div className="cf-panel">
      {/* Header */}
      <div className="cf-header">
        <div className="cf-header-icon">
          <FieldsIcon width={18} height={18} />
        </div>
        <div className="cf-header-info">
          <div className="cf-header-title">
            <h2>Custom Fields Pro</h2>
            <span className="cf-badge-active">Power-Up Active</span>
          </div>
          <div className="cf-header-subtitle">
            Manage field types, calculations, card front badges, and{" "}
            <span className="cf-lock-inline">
              <LockIcon width={11} height={11} />
            </span>{" "}
            field-level edit permissions.
          </div>
        </div>
        <div className="cf-header-actions">
          <button type="button" className="cf-btn-header">
            <ExportIcon width={13} height={13} />
            Export
          </button>
          <button type="button" className="cf-btn-header">
            <ImportIcon width={13} height={13} />
            Import
          </button>
          <button
            type="button"
            className="cf-btn-close"
            onClick={handleClose}
            title="Close"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="cf-tabs">
        <button
          type="button"
          className={`cf-tab ${mainTab === "all" ? "active" : ""}`}
          onClick={() => setMainTab("all")}
        >
          <span className="cf-tab-icon">
            <FieldsIcon width={14} height={14} />
          </span>
          All Fields ({schema.length})
        </button>
        <button
          type="button"
          className={`cf-tab ${mainTab === "permissions" ? "active" : ""}`}
          onClick={() => setMainTab("permissions")}
        >
          <span className="cf-tab-icon cf-tab-icon--lock">
            <ShieldIcon width={14} height={14} />
          </span>
          Permission Matrix
        </button>
        <button
          type="button"
          className={`cf-tab ${mainTab === "templates" ? "active" : ""}`}
          onClick={() => setMainTab("templates")}
        >
          <span className="cf-tab-icon">
            <TemplateIcon width={14} height={14} />
          </span>
          Field Templates
        </button>
      </div>

      {/* Content */}
      <div className="cf-content">
        {mainTab === "all" && (
          <>
            {/* Left: Field Type Grid */}
            <div className="cf-content-left">
              <div className="cf-field-type-grid">
                {FIELD_TYPES.map((ft) => (
                  <div
                    key={ft.value}
                    className="cf-field-type-card"
                    onClick={() => handleStartAdd(ft.value)}
                  >
                    <div className="cf-field-type-card-icon">
                      <ft.Icon width={18} height={18} />
                    </div>
                    <div className="cf-field-type-card-info">
                      <div className="cf-field-type-card-name">{ft.label}</div>
                      <div className="cf-field-type-card-desc">{ft.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Existing Fields List */}
              {schema.length > 0 && (
                <div className="cf-fields-list">
                  <div className="cf-section-title">
                    Existing Fields ({schema.length})
                  </div>
                  {schema.map((field) => (
                    <div key={field.id} className="cf-field-item">
                      <div className="cf-field-item-info">
                        <div className="cf-field-item-name">{field.name}</div>
                        <div className="cf-field-item-meta">
                          {field.type}
                          {field.options
                            ? ` (${field.options.length} options)`
                            : ""}
                          {field.showBadgeFront ? " • Front Badge" : ""}
                        </div>
                      </div>
                      <div className="cf-field-item-actions">
                        <button
                          type="button"
                          className="cf-btn-icon"
                          onClick={() => handleStartEdit(field)}
                          title="Edit"
                        >
                          <EditIcon width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          className="cf-btn-icon danger"
                          onClick={() => handleDeleteField(field.id)}
                          title="Delete"
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Empty Space (placeholder for future content) */}
            <div className="cf-content-right">
              <div className="cf-placeholder">
                {/* Empty space for future content */}
              </div>
            </div>
          </>
        )}

        {mainTab === "permissions" && (
          <div className="cf-content-left" style={{ borderRight: "none" }}>
            <div className="cf-placeholder">
              Permission Matrix — Coming Soon
            </div>
          </div>
        )}

        {mainTab === "templates" && (
          <div className="cf-content-left" style={{ borderRight: "none" }}>
            <div className="cf-placeholder">
              Field Templates — Coming Soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
