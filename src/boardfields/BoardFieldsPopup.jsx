import { useEffect, useState } from "react";
import { getBoardSchema, saveBoardSchema } from "../lib/trelloApi.js";
import {
  TrashIcon, EditIcon, SpinnerIcon, CloseIcon,
  ExportIcon, ImportIcon, LockIcon, FieldsIcon,
  DropdownIcon, NumberIcon, DateTimeIcon, FormulaIcon,
  YesNoIcon, ConditionalIcon, CheckboxIcon, TextIcon,
  ClockIcon, CalendarIcon,
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

const STEP_TABS = ["config", "permissions", "display"];

function getOptionColorHex(color) {
  if (!color) return "#5e6c84";
  if (color.startsWith("#")) return color;
  const match = COLOR_OPTIONS.find((c) => c.value === color || c.name.toLowerCase() === color.toLowerCase());
  return match ? match.bg : "#5e6c84";
}

export default function BoardFieldsPopup({ t }) {
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("main"); // main | create

  const [stepTab, setStepTab] = useState("config");
  const [editId, setEditId] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("dropdown");
  const [showBadgeFront, setShowBadgeFront] = useState(true);
  const [options, setOptions] = useState([]);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [minValue, setMinValue] = useState("0");
  const [decimalPlaces, setDecimalPlaces] = useState("0");
  const [dateTimeMode, setDateTimeMode] = useState("datetime");
  const [formula, setFormula] = useState("");
  const [returnFormat, setReturnFormat] = useState("currency");
  const [unitSymbol, setUnitSymbol] = useState("$");
  const [yesLabel, setYesLabel] = useState("Approved");
  const [noLabel, setNoLabel] = useState("Pending");
  const [conditionalField, setConditionalField] = useState("");
  const [conditionalOperator, setConditionalOperator] = useState("equals");
  const [conditionalValue, setConditionalValue] = useState("");
  const [checklistItems, setChecklistItems] = useState([
    { id: "chk_1", text: "Requirement 1" },
    { id: "chk_2", text: "Requirement 2" },
  ]);

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

  const DEFAULT_DROPDOWN_OPTIONS = [
    { id: "opt_default_high", text: "High Priority", color: "#de350b" },
    { id: "opt_default_medium", text: "Medium Priority", color: "#0052cc" },
    { id: "opt_default_low", text: "Low Priority", color: "#36b37e" },
  ];

  const DEFAULT_CHECKLIST_ITEMS = [
    { id: "chk_1", text: "Requirement 1" },
    { id: "chk_2", text: "Requirement 2" },
  ];

  const SAMPLE_TOKENS = [
    "Priority Level", "Story Points", "Billable Hours", "Hourly Rate",
    "Target Deployment Date & Time", "QA Sign-off", "SLA Escalation Required",
    "Security & Compliance", "Customer Release Note",
  ];

  const CONDITIONAL_SAMPLE_FIELDS = [
    "Priority Level", "Story Points", "Billable Hours", "Hourly Rate",
    "Total Feature Budget", "Target Deployment Date & Time", "QA Sign-off",
    "SLA Escalation Required", "Security & Compliance", "Customer Release Note",
  ];

  function handleStartAdd(preselectedType) {
    const selectedType = preselectedType || "dropdown";
    setEditId(null);
    setName("");
    setDescription("");
    setType(selectedType);
    setShowBadgeFront(true);
    setOptions(selectedType === "dropdown" ? [...DEFAULT_DROPDOWN_OPTIONS] : []);
    setPrefix("");
    setSuffix("");
    setMinValue("0");
    setDecimalPlaces("0");
    setDateTimeMode("datetime");
    setFormula("");
    setReturnFormat("currency");
    setUnitSymbol("$");
    setYesLabel("Approved");
    setNoLabel("Pending");
    setConditionalField("");
    setConditionalOperator("equals");
    setConditionalValue("");
    setChecklistItems([...DEFAULT_CHECKLIST_ITEMS]);
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
    setPrefix(field.prefix || "");
    setSuffix(field.suffix || "");
    setMinValue(field.minValue !== undefined && field.minValue !== null ? String(field.minValue) : "0");
    setDecimalPlaces(field.decimalPlaces !== undefined && field.decimalPlaces !== null ? String(field.decimalPlaces) : "0");
    setDateTimeMode(field.dateTimeMode || "datetime");
    setFormula(field.formula || "");
    setReturnFormat(field.returnFormat || "currency");
    setUnitSymbol(field.unitSymbol || "$");
    setYesLabel(field.yesLabel || "Approved");
    setNoLabel(field.noLabel || "Pending");
    setConditionalField(field.conditionalField || "");
    setConditionalOperator(field.conditionalOperator || "equals");
    setConditionalValue(field.conditionalValue || "");
    setChecklistItems(
      field.checklistItems && field.checklistItems.length > 0
        ? JSON.parse(JSON.stringify(field.checklistItems))
        : [...DEFAULT_CHECKLIST_ITEMS]
    );
    setStepTab("config");
    setView("create");
  }

  function handleAddOption() {
    const newIndex = options.length + 1;
    const defaultPalette = ["#de350b", "#0052cc", "#36b37e", "#ffab00", "#6554c0", "#ff5630", "#00b8d9"];
    const color = defaultPalette[options.length % defaultPalette.length];
    setOptions([
      ...options,
      {
        id: "opt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        text: `Option ${newIndex}`,
        color: color,
      },
    ]);
  }

  function handleOptionTextChange(idx, newText) {
    setOptions(options.map((o, i) => (i === idx ? { ...o, text: newText } : o)));
  }

  function handleOptionColorChange(idx, newColor) {
    setOptions(options.map((o, i) => (i === idx ? { ...o, color: newColor } : o)));
  }

  function handleRemoveOption(idx) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  function handleAddChecklistItem() {
    const newIndex = checklistItems.length + 1;
    setChecklistItems([
      ...checklistItems,
      {
        id: "chk_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        text: `New Item ${newIndex}`,
      },
    ]);
  }

  function handleChecklistItemTextChange(idx, newText) {
    setChecklistItems(checklistItems.map((item, i) => (i === idx ? { ...item, text: newText } : item)));
  }

  function handleRemoveChecklistItem(idx) {
    setChecklistItems(checklistItems.filter((_, i) => i !== idx));
  }

  function handleInsertToken(tokenName) {
    const token = `[${tokenName}]`;
    setFormula((prev) => (prev ? `${prev} ${token}` : token));
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

    const typeConfig = type === "number" ? {
      prefix: prefix.trim() || undefined,
      suffix: suffix.trim() || undefined,
      minValue: minValue !== "" ? Number(minValue) : undefined,
      decimalPlaces: decimalPlaces !== "" ? Number(decimalPlaces) : 0,
    } : type === "date" ? {
      dateTimeMode: dateTimeMode || "datetime",
    } : type === "formula" ? {
      formula: formula.trim() || undefined,
      returnFormat: returnFormat || "currency",
      unitSymbol: unitSymbol.trim() || undefined,
    } : type === "yesno" ? {
      yesLabel: yesLabel.trim() || "Approved",
      noLabel: noLabel.trim() || "Pending",
    } : type === "conditional" ? {
      conditionalField: conditionalField || undefined,
      conditionalOperator: conditionalOperator || "equals",
      conditionalValue: conditionalValue.trim() || undefined,
    } : type === "checkbox" ? {
      checklistItems: checklistItems.filter((item) => item.text && item.text.trim()),
    } : {};

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
              ...typeConfig,
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
        ...typeConfig,
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
            className={`cf-step ${stepTab === "display" ? "active" : ""}`}
            onClick={() => setStepTab("display")}
          >
            2. Card Attachment & Front Display
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
                        onClick={handleAddOption}
                      >
                        + Add Option
                      </button>
                    </div>

                    <div className="cf-option-list">
                      {options.map((opt, idx) => (
                        <div key={opt.id || idx} className="cf-option-row">
                          <div className="cf-option-color-wrapper" title="Click to change color">
                            <input
                              type="color"
                              className="cf-color-input-hidden"
                              value={getOptionColorHex(opt.color)}
                              onChange={(e) => handleOptionColorChange(idx, e.target.value)}
                            />
                            <div
                              className="cf-option-color-swatch"
                              style={{
                                background: getOptionColorHex(opt.color),
                              }}
                            />
                          </div>
                          <div className="cf-option-text">
                            <input
                              type="text"
                              value={opt.text}
                              placeholder="Option name..."
                              onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                            />
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
                  </div>
                ) : type === "number" ? (
                  <div className="cf-settings-panel">
                    <h3>Number Specific Settings</h3>

                    <div className="cf-number-settings-grid">
                      <div className="cf-form-group">
                        <label className="cf-form-label">Prefix (e.g. $)</label>
                        <input
                          type="text"
                          className="cf-form-input"
                          placeholder="$"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                        />
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">Suffix (e.g. hrs, pts, %)</label>
                        <input
                          type="text"
                          className="cf-form-input"
                          placeholder="hrs"
                          value={suffix}
                          onChange={(e) => setSuffix(e.target.value)}
                        />
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">Min Value</label>
                        <input
                          type="number"
                          className="cf-form-input"
                          placeholder="0"
                          value={minValue}
                          onChange={(e) => setMinValue(e.target.value)}
                        />
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">Decimal Places</label>
                        <input
                          type="number"
                          min="0"
                          max="6"
                          className="cf-form-input"
                          placeholder="0"
                          value={decimalPlaces}
                          onChange={(e) => setDecimalPlaces(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : type === "date" ? (
                  <div className="cf-settings-panel">
                    <h3>Datetime Specific Settings</h3>

                    <div className="cf-form-group">
                      <label className="cf-form-label">Date & Time Mode</label>
                      <div className="cf-mode-selector-grid">
                        <div
                          className={`cf-mode-card ${dateTimeMode === "date" ? "selected" : ""}`}
                          onClick={() => setDateTimeMode("date")}
                        >
                          <div className="cf-mode-card-icon">
                            <CalendarIcon width={16} height={16} />
                          </div>
                          <div className="cf-mode-card-name">Date Only</div>
                        </div>

                        <div
                          className={`cf-mode-card ${dateTimeMode === "time" ? "selected" : ""}`}
                          onClick={() => setDateTimeMode("time")}
                        >
                          <div className="cf-mode-card-icon">
                            <ClockIcon width={16} height={16} />
                          </div>
                          <div className="cf-mode-card-name">Time Only</div>
                        </div>

                        <div
                          className={`cf-mode-card ${dateTimeMode === "datetime" ? "selected" : ""}`}
                          onClick={() => setDateTimeMode("datetime")}
                        >
                          <div className="cf-mode-card-icon">
                            <DateTimeIcon width={16} height={16} />
                          </div>
                          <div className="cf-mode-card-name">Both Date & Time</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : type === "formula" ? (
                  <div className="cf-settings-panel">
                    <h3>Calculated Specific Settings</h3>

                    <div className="cf-form-group">
                      <div className="cf-label-row">
                        <label className="cf-form-label" style={{ margin: 0 }}>Formula Expression</label>
                        <span className="cf-token-syntax-hint">Token syntax: [Field Name]</span>
                      </div>
                      <textarea
                        className="cf-form-textarea cf-formula-textarea"
                        placeholder="e.g. [Billable Hours] * [Hourly Rate]"
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="cf-form-group">
                      <div className="cf-tokens-section-title">
                        Click to insert field token into formula:
                      </div>
                      <div className="cf-tokens-wrapper">
                        {SAMPLE_TOKENS.map((tName) => (
                          <button
                            key={tName}
                            type="button"
                            className="cf-token-pill"
                            onClick={() => handleInsertToken(tName)}
                          >
                            + [{tName}]
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="cf-calc-format-grid">
                      <div className="cf-form-group">
                        <label className="cf-form-label">Return Format</label>
                        <select
                          className="cf-form-input cf-select"
                          value={returnFormat}
                          onChange={(e) => setReturnFormat(e.target.value)}
                        >
                          <option value="currency">Currency ($1,250.00)</option>
                          <option value="number">Number (1,250)</option>
                          <option value="decimal">Decimal (1,250.00)</option>
                          <option value="percentage">Percentage (12.5%)</option>
                          <option value="text">Text</option>
                        </select>
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">Currency / Unit Symbol</label>
                        <input
                          type="text"
                          className="cf-form-input"
                          placeholder="$"
                          value={unitSymbol}
                          onChange={(e) => setUnitSymbol(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : type === "yesno" ? (
                  <div className="cf-settings-panel">
                    <h3>Yesno Specific Settings</h3>

                    <div className="cf-number-settings-grid">
                      <div className="cf-form-group">
                        <label className="cf-form-label">"Yes" State Label</label>
                        <input
                          type="text"
                          className="cf-form-input"
                          placeholder="Approved"
                          value={yesLabel}
                          onChange={(e) => setYesLabel(e.target.value)}
                        />
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">"No" State Label</label>
                        <input
                          type="text"
                          className="cf-form-input"
                          placeholder="Pending"
                          value={noLabel}
                          onChange={(e) => setNoLabel(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : type === "conditional" ? (
                  <div className="cf-settings-panel">
                    <h3>Conditional Specific Settings</h3>

                    <div className="cf-conditional-card">
                      <div className="cf-conditional-title">
                        Conditional Visibility & Trigger Rule:
                      </div>

                      <div className="cf-conditional-grid">
                        <div className="cf-form-group" style={{ margin: 0 }}>
                          <label className="cf-form-label">If Field</label>
                          <select
                            className="cf-form-input cf-select"
                            value={conditionalField}
                            onChange={(e) => setConditionalField(e.target.value)}
                          >
                            <option value="">-- Choose Field --</option>
                            {Array.from(new Set([
                              ...schema.filter((f) => f.name && (!editId || f.id !== editId)).map((f) => f.name),
                              ...CONDITIONAL_SAMPLE_FIELDS,
                            ])).map((fName) => (
                              <option key={fName} value={fName}>
                                {fName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="cf-form-group" style={{ margin: 0 }}>
                          <label className="cf-form-label">Operator</label>
                          <select
                            className="cf-form-input cf-select"
                            value={conditionalOperator}
                            onChange={(e) => setConditionalOperator(e.target.value)}
                          >
                            <option value="equals">Equals (=)</option>
                            <option value="not_equals">Does Not Equal (≠)</option>
                            <option value="contains">Contains</option>
                            <option value="gt">Greater Than (&gt;)</option>
                            <option value="lt">Less Than (&lt;)</option>
                            <option value="not_empty">Is Not Empty</option>
                          </select>
                        </div>

                        <div className="cf-form-group" style={{ margin: 0 }}>
                          <label className="cf-form-label">Target Value</label>
                          <input
                            type="text"
                            className="cf-form-input"
                            placeholder="e.g. Critical"
                            disabled={conditionalOperator === "not_empty"}
                            value={conditionalValue}
                            onChange={(e) => setConditionalValue(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : type === "checkbox" ? (
                  <div className="cf-settings-panel">
                    <h3>Checkbox Specific Settings</h3>

                    <div className="cf-form-group">
                      <label className="cf-form-label">Checklist Items</label>
                      <div className="cf-checklist-items-list">
                        {checklistItems.map((item, idx) => (
                          <div key={item.id || idx} className="cf-checklist-item-row">
                            <input
                              type="text"
                              className="cf-form-input"
                              value={item.text}
                              onChange={(e) => handleChecklistItemTextChange(idx, e.target.value)}
                              placeholder={`Requirement ${idx + 1}`}
                            />
                            <button
                              type="button"
                              className="cf-btn-icon-danger"
                              onClick={() => handleRemoveChecklistItem(idx)}
                              title="Delete Item"
                            >
                              <TrashIcon width={14} height={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="cf-btn-add-item-link"
                        onClick={handleAddChecklistItem}
                      >
                        + Add Checkbox Item
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
            <h2>Custom Fields</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="cf-content">
        <div className="cf-content-left" style={{ borderRight: "none" }}>
            {/* Add New Field Button */}
            <button
              type="button"
              className="cf-btn-new-field"
              onClick={() => handleStartAdd()}
            >
              + New Custom Field
            </button>

            {/* Existing Fields List */}
            {schema.length > 0 ? (
              <div className="cf-fields-list">
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
            ) : (
              <div className="cf-empty-state">
                <p>No custom fields created yet.</p>
                <p style={{ fontSize: 12, color: "var(--cf-text-muted)" }}>
                  Click "+ New Custom Field" to get started.
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
