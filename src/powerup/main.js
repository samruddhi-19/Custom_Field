/* global TrelloPowerUp */
import { isAuthorized } from "../lib/auth.js";

const ICON = "https://cdn-icons-png.flaticon.com/512/1828/1828817.png";

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

  "board-buttons": function () {
    return [
      {
        icon: { dark: ICON, light: ICON },
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
            title: "Board Custom Fields",
            url: "./boardfields.html",
            height: 380,
          });
        },
      },
    ];
  },

  "card-buttons": function () {
    return [
      {
        icon: ICON,
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
