import { useEffect, useState, useRef } from "react";
import { getBoardSchema, saveBoardSchema, getCurrentMember, getBoardMembers } from "../lib/trelloApi.js";
import {
  TrashIcon, EditIcon, SpinnerIcon, CloseIcon,
  LockIcon, FieldsIcon, DropdownIcon, NumberIcon,
  DateTimeIcon, FormulaIcon, YesNoIcon, ConditionalIcon,
  CheckboxIcon, TextIcon, CalendarIcon, SparkleIcon,
  LayersIcon, ArrowUpIcon, ArrowDownIcon, CopyIcon,
  CalculatorIcon, SearchIcon, HashIcon, MemoIcon,
  ClockIcon, ShieldIcon, TemplateIcon, CheckIcon,
  EyeIcon, UserIcon, CrownIcon, ExportIcon, ImportIcon,
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
    description: "Release priority tier for this task",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: true,
    scope: "All",
    options: [
      { id: "opt_high", text: "High", color: "#ff5630" },
      { id: "opt_med", text: "Medium", color: "#ffab00" },
      { id: "opt_low", text: "Low", color: "#36b37e" },
    ],
  },
  {
    id: "fld_points",
    name: "Story Points",
    type: "number",
    description: "Scrum estimation effort in story points",
    permissionType: "everyone",
    editPermission: "Anyone",
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
    description: "Logged billable engineering hours",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    minValue: 0,
    decimalPlaces: 0,
    suffix: "hrs",
  },
  {
    id: "fld_rate",
    name: "Hourly Rate",
    type: "number",
    description: "Contracted client billing rate per hour",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    prefix: "$",
    suffix: "/hr",
    minValue: 0,
    decimalPlaces: 0,
  },
  {
    id: "fld_budget",
    name: "Total Feature Budget",
    type: "formula",
    description: "Live calculated budget formula: [Billable Hours] * [Hourly Rate]",
    permissionType: "everyone",
    editPermission: "Auto Calculated",
    showBadgeFront: false,
    scope: "All",
    formula: "([Billable Hours] * [Hourly Rate])",
    returnFormat: "currency",
    unitSymbol: "$",
  },
  {
    id: "fld_target_date",
    name: "Target Deployment Date & Time",
    type: "date",
    description: "Scheduled release timestamp into production environment",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: true,
    scope: "All",
    dateTimeMode: "datetime",
  },
  {
    id: "fld_qa",
    name: "QA Sign-off",
    type: "yesno",
    description: "Quality Assurance verification approval toggle",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: true,
    scope: "All",
    yesLabel: "QA Passed",
    noLabel: "QA Pending",
  },
  {
    id: "fld_security",
    name: "Security & Compliance",
    type: "checkbox",
    description: "Mandatory compliance checks for enterprise features",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    checklistItems: [
      { id: "chk_sec_1", text: "Mandatory compliance checks for enterprise features" },
    ],
  },
  {
    id: "fld_release_note",
    name: "Customer Release Note",
    type: "text",
    description: "Public description for customer changelog",
    permissionType: "everyone",
    editPermission: "Anyone",
    showBadgeFront: false,
    scope: "All",
    multiline: true,
    placeholder: "Public description for customer changelog...",
  },
];

export const DEFAULT_ROLES = [
  "Board Admin",
  "Tech Lead / PM",
  "Finance Team",
  "QA Lead",
  "Fullstack Engineer",
];

export function computeMemberAccessBadge(member, permType, allowedRoles = [], allowedUsers = []) {
  if (!member) return { label: "🔒 Restricted", className: "cf-access-badge-locked" };
  if (member.isAdmin) {
    return { label: "✓ Admin Override", className: "cf-access-badge-override" };
  }
  if (member.isGuest) {
    return { label: "🔒 Guest Read-Only", className: "cf-access-badge-guest" };
  }
  if (permType === "everyone") {
    return { label: "✓ Can Edit", className: "cf-access-badge-can-edit" };
  }
  if (permType === "admins") {
    return { label: "🔒 Admin Locked", className: "cf-access-badge-locked" };
  }
  if (permType === "card_members") {
    return { label: "✓ Can Edit (If Assigned)", className: "cf-access-badge-card-member" };
  }
  if (permType === "roles") {
    const memRoles = member.roles || (member.role ? [member.role] : []);
    const match = memRoles.some((r) =>
      allowedRoles.some(
        (ar) => ar && r && ar.trim().toLowerCase() === r.trim().toLowerCase()
      )
    );
    return match
      ? { label: "✓ Can Edit", className: "cf-access-badge-can-edit" }
      : { label: "🔒 Role Restricted", className: "cf-access-badge-locked" };
  }
  if (permType === "users") {
    const match =
      allowedUsers.includes(member.name) ||
      allowedUsers.includes(member.username) ||
      allowedUsers.includes(member.id);
    return match
      ? { label: "✓ Can Edit", className: "cf-access-badge-can-edit" }
      : { label: "🔒 Restricted", className: "cf-access-badge-locked" };
  }
  if (permType === "formula") {
    return { label: "🔒 Auto-calculated", className: "cf-access-badge-locked" };
  }
  return { label: "✓ Can Edit", className: "cf-access-badge-can-edit" };
}

export function parsePermissionType(permString) {
  if (!permString) return "everyone";
  const p = permString.toLowerCase();
  if (p.includes("admin")) return "admins";
  if (p.includes("card member")) return "card_members";
  if (p.includes("role")) return "roles";
  if (p.includes("user")) return "users";
  if (p.includes("anyone") || p.includes("everyone")) return "everyone";
  return "everyone";
}

export function parseRolesFromPermString(permString) {
  if (!permString || !permString.toLowerCase().includes("roles:")) return ["Board Admin"];
  const parts = permString.split(":")[1]?.split(",") || [];
  const trimmed = parts.map((s) => s.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : ["Board Admin"];
}

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
  const [mainTab, setMainTab] = useState("fields"); // fields | matrix

  const [stepTab, setStepTab] = useState("config");
  const [editId, setEditId] = useState(null);

  // Search & Simulation states
  const [searchQuery, setSearchQuery] = useState("");
  const [boardMembers, setBoardMembers] = useState([]);
  const [boardAdminName, setBoardAdminName] = useState("");
  const [simulatedRole, setSimulatedRole] = useState(() => {
    try {
      const stored = localStorage.getItem("cf_simulated_role");
      if (stored) return stored;
    } catch {}
    return "";
  });
  const [memberOptions, setMemberOptions] = useState([]);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  const [matrixPermType, setMatrixPermType] = useState("everyone");
  const [matrixRoles, setMatrixRoles] = useState(["Board Admin"]);
  const [matrixUsers, setMatrixUsers] = useState([]);

  const effectiveDisplayMembers = boardMembers;
  const availableUsers = effectiveDisplayMembers.map((m) => m.name);
  const availableRoles = Array.from(
    new Set([
      "Board Admin",
      ...effectiveDisplayMembers.map((m) => m.role).filter(Boolean),
      ...effectiveDisplayMembers.flatMap((m) => m.roles || []).filter(Boolean),
      ...DEFAULT_ROLES,
    ])
  );

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const importFileRef = useRef(null);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3200);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setRoleMenuOpen(false);
      }
    }
    if (roleMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [roleMenuOpen]);

  // In-app Delete Confirmation state
  const [deleteTargetField, setDeleteTargetField] = useState(null);

  // Form error state (in-app validation)
  const [formError, setFormError] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("dropdown");
  const [showBadgeFront, setShowBadgeFront] = useState(true);
  const [editPermission, setEditPermission] = useState("Everyone on Board");
  const [permissionType, setPermissionType] = useState("everyone"); // everyone | admins | card_members | roles | users
  const [allowedRoles, setAllowedRoles] = useState(["Board Admin"]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [options, setOptions] = useState([]);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("");
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
        const s = await getBoardSchema(t);
        setSchema(Array.isArray(s) ? s : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      // Fetch actual board members from Trello board
      try {
        const bMembers = await getBoardMembers(t);
        setBoardMembers(bMembers || []);

        let currentName = "";
        if (t && typeof t.member === "function") {
          const mem = await t.member("id", "fullName", "username").catch(() => null);
          if (mem?.fullName) currentName = mem.fullName;
          else if (mem?.username) currentName = mem.username;
        }

        if (!currentName && t) {
          const apiMem = await getCurrentMember(t).catch(() => null);
          if (apiMem?.fullName) currentName = apiMem.fullName;
          else if (apiMem?.username) currentName = apiMem.username;
        }

        const adminMem = (bMembers || []).find((m) => m.isAdmin) || (bMembers || [])[0];
        const primaryName = currentName || adminMem?.name || "Board Administrator";

        setBoardAdminName(primaryName);
        if (bMembers && bMembers.length > 0) {
          const defaultSim = `${(adminMem || bMembers[0]).name} (${(adminMem || bMembers[0]).role})`;
          setSimulatedRole((prev) => (prev && bMembers.some((m) => prev.startsWith(m.name)) ? prev : defaultSim));
          setMemberOptions(bMembers.map((m) => `${m.name} (${m.role})`));
        } else {
          setSimulatedRole(primaryName);
          setMemberOptions([primaryName]);
        }
      } catch (e) {
        console.warn("Could not fetch Trello member details:", e);
      }
    }
    load();
  }, [t]);

  async function handleLoadStarterTemplates() {
    setSchema(INITIAL_FIELDS);
    await saveBoardSchema(t, INITIAL_FIELDS);
    showToast("Starter fields loaded!");
  }

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
    setPermissionType("everyone");
    setAllowedRoles(["Board Admin"]);
    setAllowedUsers([]);
    setEditPermission(selectedType === "formula" ? "Auto Calculated" : "Everyone on Board");
    setOptions(selectedType === "dropdown" ? [...DEFAULT_DROPDOWN_OPTIONS] : []);
    setPrefix("");
    setSuffix("");
    setMinValue("");
    setMaxValue("");
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
    setFormError("");
    setStepTab("config");
    setView("create");
  }

  function handleStartEdit(field) {
    setEditId(field.id);
    setName(field.name);
    setDescription(field.description || "");
    setType(field.type);
    setShowBadgeFront(field.showBadgeFront !== false);
    const resolvedType = field.permissionType || parsePermissionType(field.editPermission);
    setPermissionType(resolvedType);
    setAllowedRoles(field.allowedRoles || parseRolesFromPermString(field.editPermission));
    setAllowedUsers(field.allowedUsers || []);
    setEditPermission(field.editPermission || (field.type === "formula" ? "Auto Calculated" : "Everyone on Board"));
    setOptions(field.options ? JSON.parse(JSON.stringify(field.options)) : []);
    setPrefix(field.prefix || "");
    setSuffix(field.suffix || "");
    setMinValue(field.minValue !== undefined && field.minValue !== null ? String(field.minValue) : "");
    setMaxValue(field.maxValue !== undefined && field.maxValue !== null ? String(field.maxValue) : "");
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
    setFormError("");
    setStepTab("config");
    setView("create");
  }

  function handleExportSchema() {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schema, null, 2));
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", "custom-fields-schema.json");
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast("Custom fields schema exported successfully!");
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  }

  function handleImportClick() {
    if (importFileRef.current) {
      importFileRef.current.click();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSchema(parsed);
          await saveBoardSchema(t, parsed);
          showToast(`Successfully imported ${parsed.length} custom fields!`);
        } else {
          alert("Invalid schema file. Expected an array of fields.");
        }
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
    const newId = "chk_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
    setChecklistItems([...checklistItems, { id: newId, text: "" }]);
  }

  function handleChecklistTextChange(idx, text) {
    setChecklistItems(
      checklistItems.map((item, i) => (i === idx ? { ...item, text } : item))
    );
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
      setFormError("Field Name is required.");
      setStepTab("config");
      return;
    }

    if (type === "dropdown") {
      if (options.length === 0) {
        setFormError("Please provide at least one dropdown option.");
        setStepTab("config");
        return;
      }
      if (options.some((o) => !o.text || !o.text.trim())) {
        setFormError("Dropdown options cannot have empty text.");
        setStepTab("config");
        return;
      }
    }

    if (type === "number") {
      if (
        minValue !== "" &&
        maxValue !== "" &&
        !isNaN(Number(minValue)) &&
        !isNaN(Number(maxValue)) &&
        Number(minValue) > Number(maxValue)
      ) {
        setFormError("Min Value cannot be greater than Max Value.");
        setStepTab("config");
        return;
      }
    }

    if (type === "formula" && !formula.trim()) {
      setFormError("Please enter a formula expression.");
      setStepTab("config");
      return;
    }

    if (type === "conditional") {
      if (!conditionalField) {
        setFormError("Please select a field to base the conditional rule on.");
        setStepTab("config");
        return;
      }
      if (conditionalOperator !== "not_empty" && !conditionalValue.trim()) {
        setFormError("Please enter a target value for the conditional rule.");
        setStepTab("config");
        return;
      }
    }

    if (type === "checkbox") {
      const validItems = checklistItems.filter((it) => it.text && it.text.trim());
      if (validItems.length === 0) {
        setFormError("Please add at least one checklist item with text.");
        setStepTab("config");
        return;
      }
    }

    setFormError("");

    const typeConfig = type === "number" ? {
      prefix: prefix.trim() || undefined,
      suffix: suffix.trim() || undefined,
      minValue: minValue !== "" && !isNaN(Number(minValue)) ? Number(minValue) : undefined,
      maxValue: maxValue !== "" && !isNaN(Number(maxValue)) ? Number(maxValue) : undefined,
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

    let perm = "Everyone on Board";
    if (type === "formula") {
      perm = "Auto Calculated";
    } else if (permissionType === "everyone") {
      perm = "Everyone on Board";
    } else if (permissionType === "admins") {
      perm = "Board Administrators Only";
    } else if (permissionType === "card_members") {
      perm = "Card Members Only";
    } else if (permissionType === "roles") {
      perm = `Roles: ${allowedRoles.length > 0 ? allowedRoles.join(", ") : "Board Admin"}`;
    } else if (permissionType === "users") {
      perm = `Users: ${allowedUsers.length > 0 ? allowedUsers.join(", ") : "Board Admin"}`;
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
              permissionType,
              allowedRoles,
              allowedUsers,
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
        permissionType,
        allowedRoles,
        allowedUsers,
        editPermission: perm,
        scope: "All",
        ...typeConfig,
      };
      updated = [...schema, newField];
    }

    setSchema(updated);
    setView("main");
    await saveBoardSchema(t, updated);
    showToast(`Saved field "${name.trim()}"!`);
  }

  function handleRequestDelete(field) {
    setDeleteTargetField(field);
  }

  async function handleConfirmDelete() {
    if (!deleteTargetField) return;
    const targetId = deleteTargetField.id;
    const next = schema.filter((f) => f.id !== targetId);
    setSchema(next);
    setDeleteTargetField(null);
    await saveBoardSchema(t, next);
  }

  function handleCancelDelete() {
    setDeleteTargetField(null);
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
        {/* Hidden Import File Input */}
        <input
          type="file"
          ref={importFileRef}
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

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
        </div>

        {/* Breadcrumb Header matching Screenshot */}
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
            1. Field Configuration &amp; Type
          </button>
          <button
            type="button"
            className={`cf-step perm-step ${stepTab === "permissions" ? "active" : ""}`}
            onClick={() => setStepTab("permissions")}
          >
            <LockIcon width={13} height={13} style={{ color: "#FFAB00" }} />
            <span>2.</span>
            <LockIcon width={12} height={12} style={{ color: "#FFAB00" }} />
            <span>Field-Level Permissions</span>
          </button>
        </div>

        {/* Step Content */}
        <div className="cf-content">
          {stepTab === "config" && (
            <>
              {/* Left: Form */}
              <div className="cf-content-left">
                {formError && <div className="cf-form-alert">{formError}</div>}
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

                <div className="cf-form-group" style={{ marginTop: 14 }}>
                  <label className="cf-checkbox-row">
                    <input
                      type="checkbox"
                      checked={showBadgeFront}
                      onChange={(e) => setShowBadgeFront(e.target.checked)}
                    />
                    <span>Show badge on card front</span>
                  </label>
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
                        <label className="cf-form-label">Min Value (Lowest allowed)</label>
                        <input
                          type="number"
                          className="cf-form-input"
                          placeholder="e.g. 0"
                          value={minValue}
                          onChange={(e) => setMinValue(e.target.value)}
                        />
                      </div>

                      <div className="cf-form-group">
                        <label className="cf-form-label">Max Value (Highest limit)</label>
                        <input
                          type="number"
                          className="cf-form-input"
                          placeholder="e.g. 100"
                          value={maxValue}
                          onChange={(e) => setMaxValue(e.target.value)}
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
            <div className="cf-perm-container">
              {/* Amber Banner */}
              <div className="cf-perm-banner">
                <div className="cf-perm-banner-icon">
                  <LockIcon width={16} height={16} />
                </div>
                <div className="cf-perm-banner-content">
                  <div className="cf-perm-banner-title">Field-Level Edit Permissions</div>
                  <div className="cf-perm-banner-desc">
                    Control who can edit this individual field, independently of who has permission to move or edit the card.
                  </div>
                </div>
              </div>

              {/* Split 2-Column Layout */}
              <div className="cf-perm-split-layout">
                {/* Left Column: Who Can Edit */}
                <div className="cf-perm-col-left">
                  <div className="cf-perm-col-header">WHO CAN EDIT THIS FIELD?</div>
                  <div className="cf-perm-options-list">
                    {/* 1. Everyone on Board */}
                    <div
                      className={`cf-perm-option-card ${permissionType === "everyone" ? "selected" : ""}`}
                      onClick={() => setPermissionType("everyone")}
                    >
                      <div className="cf-perm-option-info">
                        <div className="cf-perm-option-title">Everyone on Board</div>
                        <div className="cf-perm-option-desc">
                          Any active team member on the board can modify this value.
                        </div>
                      </div>
                      {permissionType === "everyone" ? (
                        <div className="cf-perm-check-circle">✓</div>
                      ) : (
                        <div className="cf-perm-radio-circle" />
                      )}
                    </div>

                    {/* 2. Board Administrators Only */}
                    <div
                      className={`cf-perm-option-card ${permissionType === "admins" ? "selected" : ""}`}
                      onClick={() => setPermissionType("admins")}
                    >
                      <div className="cf-perm-option-info">
                        <div className="cf-perm-option-title">
                          <span>Board Administrators Only</span>
                          <span>👑</span>
                        </div>
                        <div className="cf-perm-option-desc">
                          Strictly locked to Board Admins{boardAdminName ? ` (${boardAdminName})` : ""}.
                        </div>
                      </div>
                      {permissionType === "admins" ? (
                        <div className="cf-perm-check-circle">✓</div>
                      ) : (
                        <div className="cf-perm-radio-circle" />
                      )}
                    </div>

                    {/* 3. Assigned Card Members Only */}
                    <div
                      className={`cf-perm-option-card ${permissionType === "card_members" ? "selected" : ""}`}
                      onClick={() => setPermissionType("card_members")}
                    >
                      <div className="cf-perm-option-info">
                        <div className="cf-perm-option-title">
                          <span>Assigned Card Members Only</span>
                          <span>👤</span>
                        </div>
                        <div className="cf-perm-option-desc">
                          Only members assigned to the specific card can edit this field.
                        </div>
                      </div>
                      {permissionType === "card_members" ? (
                        <div className="cf-perm-check-circle">✓</div>
                      ) : (
                        <div className="cf-perm-radio-circle" />
                      )}
                    </div>

                    {/* 4. Specific Team Roles */}
                    <div
                      className={`cf-perm-option-card ${permissionType === "roles" ? "selected" : ""}`}
                      onClick={() => setPermissionType("roles")}
                    >
                      <div className="cf-perm-option-info">
                        <div className="cf-perm-option-title">
                          <span>Specific Team Roles</span>
                          <span>🛡️</span>
                        </div>
                        <div className="cf-perm-option-desc">
                          Limit editing to particular roles (e.g. Finance, Tech Lead, QA).
                        </div>
                      </div>
                      {permissionType === "roles" ? (
                        <div className="cf-perm-check-circle">✓</div>
                      ) : (
                        <div className="cf-perm-radio-circle" />
                      )}
                    </div>
                    {permissionType === "roles" && (
                      <div className="cf-perm-subselect">
                        <div className="cf-perm-subselect-label">Select Allowed Roles:</div>
                        <div className="cf-perm-chips-grid">
                          {availableRoles.map((role) => {
                            const isSelected = allowedRoles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                className={`cf-perm-chip ${isSelected ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllowedRoles((prev) =>
                                    isSelected ? prev.filter((r) => r !== role) : [...prev, role]
                                  );
                                }}
                              >
                                <span>{isSelected ? "✓" : "+"}</span>
                                <span>{role}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. Specific Individual Users */}
                    <div
                      className={`cf-perm-option-card ${permissionType === "users" ? "selected" : ""}`}
                      onClick={() => setPermissionType("users")}
                    >
                      <div className="cf-perm-option-info">
                        <div className="cf-perm-option-title">
                          <span>Specific Individual Users</span>
                          <span>👥</span>
                        </div>
                        <div className="cf-perm-option-desc">
                          Select specific individuals with editing privileges.
                        </div>
                      </div>
                      {permissionType === "users" ? (
                        <div className="cf-perm-check-circle">✓</div>
                      ) : (
                        <div className="cf-perm-radio-circle" />
                      )}
                    </div>
                    {permissionType === "users" && (
                      <div className="cf-perm-subselect">
                        <div className="cf-perm-subselect-label">Select Authorized Users:</div>
                        <div className="cf-perm-chips-grid">
                          {availableUsers.map((user) => {
                            const isSelected = allowedUsers.includes(user);
                            return (
                              <button
                                key={user}
                                type="button"
                                className={`cf-perm-chip ${isSelected ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllowedUsers((prev) =>
                                    isSelected ? prev.filter((u) => u !== user) : [...prev, user]
                                  );
                                }}
                              >
                                <span>{isSelected ? "✓" : "+"}</span>
                                <span>{user}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Access Simulator */}
                <div className="cf-perm-col-right">
                  <div className="cf-simulator-card">
                    <div className="cf-simulator-topbar">
                      <div className="cf-simulator-left-label">
                        <EyeIcon width={14} height={14} style={{ color: "#579DFF" }} />
                        <span>People</span>
                      </div>
                      <div className="cf-simulator-right-hint">
                        Preview who gets access
                      </div>
                    </div>

                    <div className="cf-simulator-list">
                      {effectiveDisplayMembers.map((member) => {
                        const badge = computeMemberAccessBadge(
                          member,
                          type === "formula" ? "formula" : permissionType,
                          allowedRoles,
                          allowedUsers
                        );
                        return (
                          <div key={member.id} className="cf-simulator-row">
                            <div className="cf-simulator-user-left">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="cf-simulator-avatar"
                                />
                              ) : (
                                <div
                                  className="cf-simulator-avatar"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#0C66E4",
                                    color: "#FFFFFF",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    borderRadius: "50%",
                                  }}
                                >
                                  {member.name.charAt(0)}
                                </div>
                              )}
                              <div className="cf-simulator-user-info">
                                <span className="cf-simulator-name">{member.name}</span>
                                <span className="cf-simulator-role">{member.role}</span>
                              </div>
                            </div>

                            <span className={`cf-access-badge ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                Card Attachment &amp; Front Display settings — Active
              </div>
            </div>
          )}
        </div>

        {/* Bottom Simulation Footer matching Screenshot */}
        <div className="cf-footer-bar">
          <div className="cf-simulation-box">
            <span>Simulating as:</span>
            <div className="cf-custom-select-wrapper" ref={roleDropdownRef}>
              <button
                type="button"
                className="cf-custom-select-trigger"
                onClick={() => setRoleMenuOpen((prev) => !prev)}
              >
                <span>{simulatedRole}</span>
                <span
                  className="cf-custom-select-chevron"
                  style={{ transform: roleMenuOpen ? "rotate(180deg)" : "none" }}
                >
                  ▾
                </span>
              </button>

              {roleMenuOpen && (
                <div className="cf-custom-select-menu">
                  {boardMembers.map((mem) => {
                    const label = `${mem.name} (${mem.role})`;
                    const isSelected = label === simulatedRole;
                    return (
                      <button
                        key={mem.id}
                        type="button"
                        className={`cf-custom-select-item ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSimulatedRole(label);
                          try {
                            localStorage.setItem("cf_simulated_role", label);
                            localStorage.setItem("cf_simulated_member_id", mem.id);
                          } catch {}
                          setRoleMenuOpen(false);
                        }}
                      >
                        <span className="cf-custom-select-item-text">{label}</span>
                        {isSelected && <span className="cf-custom-select-item-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="cf-btn-done"
            onClick={() => setView("main")}
          >
            Done
          </button>
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
    if (pLower.includes("everyone") || pLower.includes("anyone")) {
      return (
        <span className="cf-perm-badge" style={{ color: "#4BCE97" }} title={perm}>
          <span>Everyone on Board</span>
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
      {/* Hidden Import File Input */}
      <input
        type="file"
        ref={importFileRef}
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

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
      </div>

      {/* Main Dashboard Container */}
      <div className="cf-main-dashboard">
          {/* Filter & Actions Row */}
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

            <button
              type="button"
              className="cf-btn-new-field-primary"
              onClick={() => handleStartAdd()}
            >
              + New Custom Field
            </button>
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
                            title="Move Up"
                          >
                            <ArrowUpIcon width={13} height={13} />
                          </button>
                          <span className="cf-order-index">{idx + 1}</span>
                          <button
                            type="button"
                            className="cf-btn-arrow"
                            onClick={() => handleMoveField(idx, 1)}
                            disabled={idx === filteredFields.length - 1}
                            title="Move Down"
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
                            <div className="cf-field-name-title">
                              <span>{field.name}</span>
                            </div>
                            {renderTypeSubtitle(field)}
                          </div>
                        </div>
                      </td>

                      {/* Edit Permission */}
                      <td>{renderPermissionBadge(field)}</td>

                      {/* Card Front Badge Toggle */}
                      <td>
                        {field.showBadgeFront !== false ? (
                          <button
                            type="button"
                            className="cf-badge-front-pill"
                            onClick={() => handleToggleFrontBadge(field.id)}
                            title="Toggle front badge display"
                          >
                            <span>Front Badge</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cf-badge-details-pill"
                            onClick={() => handleToggleFrontBadge(field.id)}
                            title="Toggle front badge display"
                          >
                            <span>Details Only</span>
                          </button>
                        )}
                      </td>

                      {/* Scope */}
                      <td>
                        <span className="cf-scope-badge">{field.scope || "All"}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", paddingRight: 20 }}>
                        <div className="cf-actions-cell" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="cf-action-btn"
                            onClick={() => handleDuplicateField(field)}
                            title="Duplicate Field"
                          >
                            <CopyIcon width={14} height={14} />
                          </button>
                          <button
                            type="button"
                            className="cf-action-btn"
                            onClick={() => handleStartEdit(field)}
                            title="Edit Field"
                          >
                            <EditIcon width={14} height={14} />
                          </button>
                          <button
                            type="button"
                            className="cf-action-btn danger"
                            onClick={() => handleRequestDelete(field)}
                            title="Delete Field"
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
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
                  <button
                    type="button"
                    className="cf-btn-new-field-primary"
                    onClick={() => handleStartAdd()}
                  >
                    + New Custom Field
                  </button>
                  {!searchQuery && (
                    <button
                      type="button"
                      className="cf-btn-header"
                      onClick={handleLoadStarterTemplates}
                    >
                      <TemplateIcon width={14} height={14} />
                      <span>Load Starter Fields</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Bottom Footer Bar */}
      <div className="cf-footer-bar">
        <div className="cf-simulation-box">
          <span>Simulating as:</span>
          <div className="cf-custom-select-wrapper" ref={roleDropdownRef}>
            <button
              type="button"
              className="cf-custom-select-trigger"
              onClick={() => setRoleMenuOpen((prev) => !prev)}
            >
              <span>{simulatedRole}</span>
              <span
                className="cf-custom-select-chevron"
                style={{ transform: roleMenuOpen ? "rotate(180deg)" : "none" }}
              >
                ▾
              </span>
            </button>

            {roleMenuOpen && (
              <div className="cf-custom-select-menu">
                {boardMembers.map((mem) => {
                  const label = `${mem.name} (${mem.role})`;
                  const isSelected = label === simulatedRole;
                  return (
                    <button
                      key={mem.id}
                      type="button"
                      className={`cf-custom-select-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSimulatedRole(label);
                        try {
                          localStorage.setItem("cf_simulated_role", label);
                          localStorage.setItem("cf_simulated_member_id", mem.id);
                        } catch {}
                        setRoleMenuOpen(false);
                      }}
                    >
                      <span className="cf-custom-select-item-text">{label}</span>
                      {isSelected && <span className="cf-custom-select-item-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="cf-btn-done"
          onClick={handleClose}
        >
          Done
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="cf-toast">
          <CheckIcon width={16} height={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteTargetField && (
        <div className="cf-confirm-overlay" onClick={handleCancelDelete}>
          <div className="cf-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cf-confirm-header">
              <div className="cf-confirm-icon-danger">
                <TrashIcon width={20} height={20} />
              </div>
              <h3 className="cf-confirm-title">Delete Custom Field</h3>
            </div>
            <p className="cf-confirm-body">
              Are you sure you want to delete <span className="cf-confirm-field-name">"{deleteTargetField.name}"</span>? This will permanently remove this field and its values from all cards on this board.
            </p>
            <div className="cf-confirm-actions">
              <button
                type="button"
                className="cf-btn-cancel"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cf-btn-delete-confirm"
                onClick={handleConfirmDelete}
              >
                Delete Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
