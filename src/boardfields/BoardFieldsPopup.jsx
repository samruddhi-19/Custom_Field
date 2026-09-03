import { useEffect, useState } from "react";
import { getBoardSchema, saveBoardSchema } from "../lib/trelloApi.js";
import {
  TrashIcon, EditIcon, SpinnerIcon, CloseIcon,
  LockIcon, FieldsIcon, DropdownIcon, NumberIcon,
  DateTimeIcon, FormulaIcon, YesNoIcon, ConditionalIcon,
  CheckboxIcon, TextIcon, CalendarIcon, SparkleIcon,
  LayersIcon, ArrowUpIcon, ArrowDownIcon, CopyIcon,
  CalculatorIcon, SearchIcon, HashIcon, MemoIcon,
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

export const INITIAL_FIELDS = [
  {
    id: "fld_priority",
    name: "Priority Level",
    type: "dropdown",
    description: "Urgency and impact of this task",
    editPermission: "Roles: Board Admin, Project Lead",
    showBadgeFront: true,
    scope: "All",
    options: [
      { id: "opt_high", text: "High Priority", color: "#de350b" },
      { id: "opt_med", text: "Medium Priority", color: "#0052cc" },
      { id: "opt_low", text: "Low Priority", color: "#36b37e" },
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
    description: "Scheduled release target",
    editPermission: "Card Members Only",
    showBadgeFront: true,
    scope: "All",
    dateTimeMode: "datetime",
  },
  {
    id: "fld_qa",
    name: "QA Sign-off",
    type: "yesno",
    description: "Quality assurance approval before deployment",
    editPermission: "Roles: QA Lead, Board Admin",
    showBadgeFront: true,
    scope: "All",
    yesLabel: "Approved",
    noLabel: "Pending",
  },
  {
    id: "fld_sla",
    name: "SLA Escalation Required",
    type: "conditional",
    description: "Triggers escalation if SLA is breached",
    editPermission: "Roles: Board Admin",
    showBadgeFront: true,
    scope: "All",
    conditionalField: "Priority Level",
    conditionalOperator: "equals",
    conditionalValue: "High Priority",
  },
  {
    id: "fld_security",
    name: "Security & Compliance",
    type: "checkbox",
    description: "Mandatory security checklist items",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    checklistItems: [
      { id: "chk_sec_1", text: "Data Encryption Verified" },
      { id: "chk_sec_2", text: "OWASP Top 10 Audited" },
    ],
  },
  {
    id: "fld_release_note",
    name: "Customer Release Note",
    type: "text",
    description: "Customer-facing description of the feature or fix",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    multiline: true,
    placeholder: "Release notes for changelog...",
  },
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

  // Search & Simulation states
  const [searchQuery, setSearchQuery] = useState("");
  const [simulatedRole, setSimulatedRole] = useState("Alex Morgan (Board Administrator)");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("dropdown");
  const [showBadgeFront, setShowBadgeFront] = useState(true);
  const [editPermission, setEditPermission] = useState("Card Members Only");
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
  const [multiline, setMultiline] = useState(false);
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    async function load() {
      try {
        let s = await getBoardSchema(t);
        if (!Array.isArray(s) || s.length === 0) {
          s = INITIAL_FIELDS;
          await saveBoardSchema(t, s);
        }
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
    setEditPermission(selectedType === "formula" ? "Auto Calculated" : "Card Members Only");
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
    setMultiline(false);
    setPlaceholder("");
    setStepTab("config");
    setView("create");
  }

  function handleStartEdit(field) {
    setEditId(field.id);
    setName(field.name);
    setDescription(field.description || "");
    setType(field.type);
    setShowBadgeFront(field.showBadgeFront !== false);
    setEditPermission(field.editPermission || (field.type === "formula" ? "Auto Calculated" : "Card Members Only"));
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
    setMultiline(Boolean(field.multiline));
    setPlaceholder(field.placeholder || "");
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
    } : type === "text" ? {
      multiline: Boolean(multiline),
      placeholder: placeholder.trim() || undefined,
    } : {};

    const perm = type === "formula" ? "Auto Calculated" : (editPermission || "Card Members Only");

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
              editPermission: perm,
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
        editPermission: perm,
        scope: "All",
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

  function handleMoveField(idx, direction) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= schema.length) return;
    const next = [...schema];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setSchema(next);
    saveBoardSchema(t, next);
  }

  function handleToggleFrontBadge(id) {
    const next = schema.map((f) =>
      f.id === id ? { ...f, showBadgeFront: f.showBadgeFront === false ? true : false } : f
    );
    setSchema(next);
    saveBoardSchema(t, next);
  }

  function handleDuplicateField(field) {
    const copy = {
      ...JSON.parse(JSON.stringify(field)),
      id: "cf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: `${field.name} (Copy)`,
    };
    const next = [...schema, copy];
    setSchema(next);
    saveBoardSchema(t, next);
  }

  function handleClose() {
    if (t && typeof t.closeModal === "function") {
      t.closeModal();
    } else if (t && typeof t.closePopup === "function") {
      t.closePopup();
    }
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
            2. Edit Permissions
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
                              className="cf-checklist-delete-btn"
                              onClick={() => handleRemoveChecklistItem(idx)}
                              title="Delete Item"
                            >
                              <TrashIcon width={16} height={16} />
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
                ) : type === "text" ? (
                  <div className="cf-settings-panel">
                    <h3>Text Specific Settings</h3>

                    <div className="cf-form-group" style={{ marginBottom: 16 }}>
                      <label className="cf-checkbox-row">
                        <input
                          type="checkbox"
                          checked={multiline}
                          onChange={(e) => setMultiline(e.target.checked)}
                        />
                        <span>Multiline Textarea (for long notes, summaries)</span>
                      </label>
                    </div>

                    <div className="cf-form-group">
                      <label className="cf-form-label">Placeholder Text</label>
                      <input
                        type="text"
                        className="cf-form-input"
                        placeholder="Enter notes..."
                        value={placeholder}
                        onChange={(e) => setPlaceholder(e.target.value)}
                      />
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
              <div className="cf-form-group" style={{ marginTop: 8, maxWidth: 480 }}>
                <label className="cf-form-label">Field Edit Permission</label>
                <p style={{ fontSize: 12, color: "var(--cf-text-secondary)", marginBottom: 14 }}>
                  Control which team members have authority to modify this field value on cards.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Roles: Board Admin, Project Lead" },
                    { label: "Roles: Board Admin, Finance Team" },
                    { label: "Roles: QA Lead, Board Admin" },
                    { label: "Roles: Board Admin" },
                    { label: "Card Members Only" },
                    { label: "Auto Calculated" },
                    { label: "Anyone" },
                  ].map((pOpt) => (
                    <label
                      key={pOpt.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: "1px solid",
                        borderColor: editPermission === pOpt.label ? "var(--cf-accent)" : "var(--cf-border)",
                        background: editPermission === pOpt.label ? "var(--cf-accent-bg)" : "var(--cf-bg-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="permissionOption"
                        checked={editPermission === pOpt.label}
                        onChange={() => setEditPermission(pOpt.label)}
                        style={{ accentColor: "var(--cf-accent)" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--cf-text-primary)" }}>
                        {pOpt.label}
                      </span>
                    </label>
                  ))}
                </div>
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
                Card Attachment & Front Display settings — Active
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="cf-create-footer">
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
      </div>
    );
  }

  /* ─── Helpers for Main Table ─── */
  const filteredFields = schema.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.type?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      (f.formula && f.formula.toLowerCase().includes(q))
    );
  });

  const frontBadgeCount = schema.filter((f) => f.showBadgeFront !== false).length;
  const lockedCount = schema.filter((f) => {
    const perm = f.editPermission || (f.type === "formula" ? "Auto Calculated" : "Card Members Only");
    return !perm.toLowerCase().includes("anyone");
  }).length;

  function renderTypeIcon(type) {
    switch (type) {
      case "dropdown":
        return (
          <div className="cf-field-icon-squircle type-dropdown" title="Dropdown">
            <DropdownIcon width={16} height={16} />
          </div>
        );
      case "number":
        return (
          <div className="cf-field-icon-squircle type-number" title="Number">
            <HashIcon width={16} height={16} />
          </div>
        );
      case "formula":
        return (
          <div className="cf-field-icon-squircle type-formula" title="Calculated Formula">
            <CalculatorIcon width={16} height={16} />
          </div>
        );
      case "date":
        return (
          <div className="cf-field-icon-squircle type-date" title="Date & Time">
            <CalendarIcon width={16} height={16} />
          </div>
        );
      case "yesno":
        return (
          <div className="cf-field-icon-squircle type-yesno" title="Yes / No">
            <YesNoIcon width={16} height={16} />
          </div>
        );
      case "conditional":
        return (
          <div className="cf-field-icon-squircle type-conditional" title="Conditional">
            <ConditionalIcon width={16} height={16} />
          </div>
        );
      case "checkbox":
        return (
          <div className="cf-field-icon-squircle type-checkbox" title="Checkboxes">
            <CheckboxIcon width={16} height={16} />
          </div>
        );
      case "text":
      default:
        return (
          <div className="cf-field-icon-squircle type-text" title="Text">
            <TextIcon width={16} height={16} />
          </div>
        );
    }
  }

  function renderTypeSubtitle(field) {
    if (field.type === "formula") {
      return (
        <div className="cf-field-type-subtitle">
          <span>Calculated</span>
          {field.formula && (
            <span className="cf-formula-code-badge">{field.formula}</span>
          )}
        </div>
      );
    }
    const label = FIELD_TYPES.find((ft) => ft.value === field.type)?.label || field.type;
    return (
      <div className="cf-field-type-subtitle">
        <span>{label}</span>
      </div>
    );
  }

  function renderPermissionBadge(field) {
    const perm = field.editPermission || (field.type === "formula" ? "Auto Calculated" : "Card Members Only");
    const pLower = perm.toLowerCase();

    if (pLower.includes("auto calculated")) {
      return (
        <span className="cf-perm-badge cf-perm-purple">
          <MemoIcon width={13} height={13} />
          <span>Auto Calculated</span>
        </span>
      );
    }
    if (pLower.includes("board admin") || pLower.includes("finance") || pLower.includes("qa lead")) {
      return (
        <span className="cf-perm-badge cf-perm-gold" title={perm}>
          <LockIcon width={12} height={12} />
          <span>{perm.length > 28 ? perm.substring(0, 26) + "..." : perm}</span>
        </span>
      );
    }
    if (pLower.includes("card members")) {
      return (
        <span className="cf-perm-badge cf-perm-blue" title={perm}>
          <LockIcon width={12} height={12} />
          <span>Card Members Only</span>
        </span>
      );
    }
    return (
      <span className="cf-perm-badge cf-perm-gray">
        <span>{perm}</span>
      </span>
    );
  }

  /* ─── Main Panel View (Custom Fields Pro Dashboard) ─── */
  return (
    <div className="cf-panel">
      {/* Top Header */}
      <div className="cf-header">
        <div className="cf-header-icon">
          <SparkleIcon width={20} height={20} />
        </div>
        <div className="cf-header-info">
          <div className="cf-header-title">
            <h2>Custom Fields Pro</h2>
            <span className="cf-badge-active">POWER-UP ACTIVE</span>
          </div>
          <div className="cf-header-subtitle">
            Manage field types, calculations, card front badges, and <span className="cf-lock-inline"><LockIcon width={11} height={11} /></span> field-level edit permissions.
          </div>
        </div>
        <button
          type="button"
          className="cf-btn-close"
          onClick={handleClose}
          title="Close"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      {/* Main Dashboard Container */}
      <div className="cf-main-dashboard">
        {/* Subtoolbar */}
        <div className="cf-subtoolbar">
          <button type="button" className="cf-tab-pill">
            <span className="cf-tab-pill-icon">
              <LayersIcon width={16} height={16} />
            </span>
            <span>All Fields ({filteredFields.length})</span>
          </button>

          <button
            type="button"
            className="cf-btn-new-field-primary"
            onClick={() => handleStartAdd()}
          >
            + + New Custom Field
          </button>
        </div>

        {/* Filter & Stats Row */}
        <div className="cf-filter-row">
          <div className="cf-search-wrapper">
            <input
              type="text"
              className="cf-search-input"
              placeholder="Search custom fields by name, type, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="cf-stats-group">
            <span className="cf-stat-front">
              <span className="cf-stat-front-dot"></span>
              Show on Front: {frontBadgeCount}
            </span>
            <span className="cf-stat-locked">
              <LockIcon width={12} height={12} />
              Permission Locked: {lockedCount}
            </span>
          </div>
        </div>

        {/* Table Wrapper */}
        <div className="cf-table-wrapper">
          {filteredFields.length > 0 ? (
            <table className="cf-table">
              <thead>
                <tr>
                  <th className="center" style={{ width: 70 }}>ORDER</th>
                  <th>FIELD NAME &amp; TYPE</th>
                  <th>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <LockIcon width={11} height={11} /> EDIT PERMISSION
                    </span>
                  </th>
                  <th>CARD FRONT</th>
                  <th>SCOPE</th>
                  <th style={{ textAlign: "right", paddingRight: 20 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFields.map((field, idx) => (
                  <tr key={field.id}>
                    {/* Order */}
                    <td style={{ textAlign: "center" }}>
                      <div className="cf-col-order">
                        <button
                          type="button"
                          className="cf-btn-arrow"
                          onClick={() => handleMoveField(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                        >
                          <ArrowUpIcon width={13} height={13} />
                        </button>
                        <button
                          type="button"
                          className="cf-btn-arrow"
                          onClick={() => handleMoveField(idx, 1)}
                          disabled={idx === filteredFields.length - 1}
                          title="Move down"
                        >
                          <ArrowDownIcon width={13} height={13} />
                        </button>
                      </div>
                    </td>

                    {/* Field Name & Type */}
                    <td>
                      <div className="cf-field-cell">
                        {renderTypeIcon(field.type)}
                        <div className="cf-field-text-group">
                          <span className="cf-field-name-title">{field.name}</span>
                          {renderTypeSubtitle(field)}
                        </div>
                      </div>
                    </td>

                    {/* Edit Permission */}
                    <td>{renderPermissionBadge(field)}</td>

                    {/* Card Front Badge */}
                    <td>
                      <button
                        type="button"
                        className={field.showBadgeFront !== false ? "cf-badge-front-pill" : "cf-badge-details-pill"}
                        onClick={() => handleToggleFrontBadge(field.id)}
                        title="Click to toggle card front badge display"
                      >
                        {field.showBadgeFront !== false ? "✓ Front Badge" : "Details Only"}
                      </button>
                    </td>

                    {/* Scope */}
                    <td>
                      <span className="cf-scope-badge">{field.scope || "All"}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="cf-actions-cell" style={{ justifyContent: "flex-end", paddingRight: 6 }}>
                        <button
                          type="button"
                          className="cf-action-btn"
                          onClick={() => handleStartEdit(field)}
                          title="Edit Custom Field"
                        >
                          <EditIcon width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          className="cf-action-btn"
                          onClick={() => handleDuplicateField(field)}
                          title="Duplicate Custom Field"
                        >
                          <CopyIcon width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          className="cf-action-btn danger"
                          onClick={() => handleDeleteField(field.id)}
                          title="Delete Custom Field"
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="cf-empty-state">
              <p>No custom fields found{searchQuery ? ` matching "${searchQuery}"` : ""}.</p>
              <button
                type="button"
                className="cf-btn-new-field-primary"
                onClick={() => handleStartAdd()}
                style={{ marginTop: 8 }}
              >
                + + New Custom Field
              </button>
            </div>
          )}
        </div>

        {/* Bottom Footer Bar */}
        <div className="cf-footer-bar">
          <div className="cf-simulation-box">
            <span>Simulating as:</span>
            <select
              className="cf-simulate-dropdown"
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value)}
            >
              <option value="Alex Morgan (Board Administrator)">
                Alex Morgan (Board Administrator)
              </option>
              <option value="Jordan Lee (Project Lead)">
                Jordan Lee (Project Lead)
              </option>
              <option value="Taylor Reed (Finance & Billing)">
                Taylor Reed (Finance & Billing)
              </option>
              <option value="Sam Davis (Card Member)">
                Sam Davis (Card Member)
              </option>
              <option value="Guest Viewer (Read-only)">
                Guest Viewer (Read-only)
              </option>
            </select>
          </div>

          <button
            type="button"
            className="cf-btn-done"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
