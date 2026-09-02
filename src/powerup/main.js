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

function formatBadge(field, value) {
  if (value === undefined || value === null || value === "") return null;

  switch (field.type) {
    case "text":
      return {
        title: field.name,
        text: String(value),
        color: null,
      };

    case "number":
      return {
        title: field.name,
        text: `${field.name}: ${value}`,
        color: null,
      };

    case "dropdown": {
      if (!field.options || !Array.isArray(field.options)) return null;
      const opt = field.options.find((o) => o.id === value);
      if (!opt) return null;
      return {
        title: field.name,
        text: opt.text,
        color: TRELLO_COLOR_MAP[opt.color] || null,
      };
    }

    case "date": {
      const isPast = new Date(value) < new Date(new Date().setHours(0, 0, 0, 0));
      return {
        title: field.name,
        text: value,
        color: isPast ? "red" : null,
      };
    }

    case "checkbox":
      if (!value) return null;
      return {
        title: field.name,
        text: `✓ ${field.name}`,
        color: "green",
      };

    case "rating": {
      const rating = parseInt(value, 10);
      if (!rating || rating <= 0) return null;
      return {
        title: field.name,
        text: "★".repeat(Math.min(rating, 5)),
        color: "yellow",
      };
    }

    default:
      return null;
  }
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
            url: "./boardfields.html",
            fullscreen: false,
            height: 560,
          });
        },
      },
    ];
  },

  "card-buttons": function (t, options) {
    return [
      {
        icon: ICON_DARK,
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
          return t.popup({
            title: "Custom Fields",
            url: "./cardfields.html",
            height: 380,
          });
        },
      },
    ];
  },

  "card-badges": async function (t) {
    const [schema, values] = await Promise.all([
      t.get("board", "shared", "custom_fields_schema", []),
      t.get("card", "shared", "custom_fields_values", {}),
    ]);

    if (!Array.isArray(schema) || !values) return [];

    const badges = [];
    schema.forEach((field) => {
      if (field.showBadgeFront === false) return;
      const val = values[field.id];
      const badge = formatBadge(field, val);
      if (badge) {
        badges.push({
          text: badge.text,
          color: badge.color,
        });
      }
    });

    return badges;
  },

  "card-detail-badges": async function (t) {
    const [schema, values] = await Promise.all([
      t.get("board", "shared", "custom_fields_schema", []),
      t.get("card", "shared", "custom_fields_values", {}),
    ]);

    if (!Array.isArray(schema) || !values) return [];

    const detailBadges = [];
    schema.forEach((field) => {
      const val = values[field.id];
      const badge = formatBadge(field, val);
      if (badge) {
        detailBadges.push({
          title: field.name,
          text: badge.text,
          color: badge.color,
          callback: function (t) {
            return t.popup({
              title: "Custom Fields",
              url: "./cardfields.html",
              height: 380,
            });
          },
        });
      }
    });

    return detailBadges;
  },
});
