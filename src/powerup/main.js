/* global TrelloPowerUp */
import { isAuthorized } from "../lib/auth.js";

const ICON_DARK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect><line x1="7" y1="8" x2="13" y2="8"></line><circle cx="16.5" cy="8" r="1.5" fill="#0052cc"></circle><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="11" y2="16"></line><polyline points="14 16 15.5 17.5 18 14.5"></polyline></svg>');
const ICON_LIGHT = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect><line x1="7" y1="8" x2="13" y2="8"></line><circle cx="16.5" cy="8" r="1.5" fill="#ffffff"></circle><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="11" y2="16"></line><polyline points="14 16 15.5 17.5 18 14.5"></polyline></svg>');

const TRELLO_COLOR_MAP = {
  blue: "blue",
  green: "green",
  yellow: "yellow",
  orange: "orange",
  red: "red",
  purple: "purple",
  gray: "light-gray",
};

function resolveBadgeColor(color) {
  if (!color) return null;
  const c = color.toLowerCase();
  if (TRELLO_COLOR_MAP[c]) return TRELLO_COLOR_MAP[c];
  if (c.includes("de350b") || c.includes("e53935") || c.includes("f87168") || c.includes("red")) return "red";
  if (c.includes("0052cc") || c.includes("1e88e5") || c.includes("579dff") || c.includes("blue")) return "blue";
  if (c.includes("36b37e") || c.includes("4bce97") || c.includes("43a047") || c.includes("green")) return "green";
  if (c.includes("ffab00") || c.includes("fbc02d") || c.includes("yellow")) return "yellow";
  if (c.includes("ff5630") || c.includes("fb8c00") || c.includes("orange")) return "orange";
  if (c.includes("6554c0") || c.includes("8e24aa") || c.includes("7c5cfc") || c.includes("purple")) return "purple";
  if (c.includes("00b8d9") || c.includes("00acc1") || c.includes("teal")) return "sky";
  return null;
}

function formatBadge(field, value) {
  if (value === undefined || value === null || value === "") return null;

  switch (field.type) {
    case "text":
      return {
        title: field.name,
        text: String(value),
        color: null,
      };

    case "number": {
      let numVal = Number(value);
      let numStr = isNaN(numVal) ? String(value) : (field.decimalPlaces !== undefined && field.decimalPlaces !== null && field.decimalPlaces !== "" ? numVal.toFixed(Number(field.decimalPlaces)) : String(value));
      const prefix = field.prefix || "";
      const suffix = field.suffix ? ` ${field.suffix}` : "";
      return {
        title: field.name,
        text: `# ${field.name}: ${prefix}${numStr}${suffix}`,
        color: "green",
      };
    }

    case "dropdown": {
      if (!field.options || !Array.isArray(field.options)) return null;
      const opt = field.options.find((o) => o.id === value) || field.options.find((o) => o.text === value);
      if (!opt) return null;
      const optText = opt.text;
      const badgeColor = resolveBadgeColor(opt.color) || "blue";
      return {
        title: field.name,
        text: `● ${optText}`,
        color: badgeColor,
      };
    }

    case "date": {
      const isPast = new Date(value) < new Date(new Date().setHours(0, 0, 0, 0));
      return {
        title: field.name,
        text: `📅 ${value}`,
        color: isPast ? "red" : null,
      };
    }

    case "checkbox": {
      if (!value) return null;
      if (field.checklistItems && Array.isArray(field.checklistItems) && field.checklistItems.length > 0) {
        const total = field.checklistItems.length;
        const checkedCount = field.checklistItems.filter((it) => typeof value === "object" && value?.[it.id]).length;
        if (checkedCount === 0) return null;
        return {
          title: field.name,
          text: `✓ ${checkedCount}/${total}`,
          color: checkedCount === total ? "green" : "blue",
        };
      }
      return {
        title: field.name,
        text: `✓ ${field.name}`,
        color: "green",
      };
    }

    case "rating": {
      const rating = parseInt(value, 10);
      if (!rating || rating <= 0) return null;
      return {
        title: field.name,
        text: "★".repeat(Math.min(rating, 5)),
        color: "yellow",
      };
    }

    case "yesno": {
      if (value === undefined || value === null) return null;
      const isYes = Boolean(value);
      const text = isYes ? (field.yesLabel || "Yes") : (field.noLabel || "No");
      return {
        title: field.name,
        text: `${isYes ? "✓" : "✕"} ${text}`,
        color: isYes ? "green" : "orange",
      };
    }

    case "formula": {
      if (value === undefined || value === null || value === "") return null;
      const symb = field.unitSymbol || (field.returnFormat === "currency" ? "$" : "");
      let formattedText = String(value);
      if (typeof value === "number") {
        if (field.returnFormat === "currency") formattedText = `${symb}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        else if (field.returnFormat === "decimal") formattedText = `${symb}${value.toFixed(2)}`;
        else if (field.returnFormat === "percentage") formattedText = `${(value * 100).toFixed(1)}%`;
        else formattedText = `${symb}${value.toLocaleString()}`;
      }
      return {
        title: field.name,
        text: `📝 ${field.name}: ${formattedText} 🔒`,
        color: "purple",
      };
    }

    case "conditional": {
      if (!value) return null;
      return {
        title: field.name,
        text: `✓ ${value}`,
        color: "green",
      };
    }

    default:
      return null;
  }
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

TrelloPowerUp.initialize({
  // Trello calls this to decide whether to show the "Authorize" prompt.
  "authorization-status": async function (t) {
    return { authorized: await isAuthorized(t) };
  },

  "show-authorization": function (t) {
    return t.popup({
      title: "Authorize Custom Fields",
      url: "./auth.html",
      height: 240,
    });
  },

  "show-settings": function (t) {
    return t.popup({
      title: "Custom Fields Settings",
      url: "./settings.html",
      height: 240,
    });
  },

  "board-buttons": function (t, options) {
    return [
      {
        icon: { dark: ICON_DARK, light: ICON_LIGHT },
        text: "Custom Fields",
        callback: async function (t) {
          const auth = await isAuthorized(t);
          if (!auth) {
            return t.popup({
              title: "Authorize Custom Fields",
              url: "./auth.html",
              height: 240,
            });
          }
          return t.modal({
            title: "Custom Fields Pro",
            accentColor: "#1D2125",
            url: "./boardfields.html",
            fullscreen: false,
            height: 640,
          });
        },
      },
    ];
  },

  "card-buttons": function (t, options) {
    return [
      {
        icon: ICON_DARK,
        text: "Custom Fields Pro",
        callback: async function (t) {
          return t.popup({
            title: "Custom Fields Pro",
            url: "./cardfields.html",
            height: 380,
          });
        },
      },
    ];
  },

  "card-back-section": function (t, options) {
    return {
      title: "Custom Fields Pro",
      icon: ICON_DARK,
      content: {
        type: "iframe",
        url: t.signUrl("./cardfields.html"),
        height: 520,
      },
    };
  },

  "card-badges": async function (t) {
    const [schema, cardValues] = await Promise.all([
      t.get("board", "shared", "custom_fields_schema", []),
      t.get("card", "shared", "custom_fields_values", null),
    ]);

    if (!Array.isArray(schema) || schema.length === 0) return [];
    if (!cardValues || typeof cardValues !== "object") return [];

    const values = cardValues;
    const badges = [];
    schema.forEach((field) => {
      if (field.showBadgeFront === false) return;
      if (!checkConditionalRule(field, schema, values)) return;
      const val = field.type === "formula" ? evaluateFormula(field.formula, schema, values) : values[field.id];
      if (val === undefined || val === null || val === "") return;
      const badge = formatBadge(field, val);
      if (badge) {
        badges.push({
          text: badge.text,
          color: badge.color,
          refresh: 10,
        });
      }
    });

    return badges;
  },
});

