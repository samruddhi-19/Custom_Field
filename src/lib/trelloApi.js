// Wrapper over the Trello REST API and Power-Up storage.

import { APP_KEY, getToken, clearToken } from "./auth.js";

export const NOT_AUTHORIZED = "NOT_AUTHORIZED";

async function apiFetch(t, path, { method = "GET", params = {} } = {}) {
  const token = await getToken(t);
  if (!token) throw new Error(NOT_AUTHORIZED);

  const url = new URL(`https://api.trello.com/1${path}`);
  if (APP_KEY) {
    url.searchParams.set("key", APP_KEY);
  }
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, { method });

  // Token revoked or expired
  if (res.status === 401) {
    await clearToken(t);
    throw new Error(NOT_AUTHORIZED);
  }

  if (!res.ok) {
    throw new Error(`Trello API error ${res.status}: ${await res.text()}`);
  }

  return res.status === 204 ? null : res.json();
}

// Confirms the stored token is still valid. Used by the settings popup.
export function getCurrentMember(t) {
  return apiFetch(t, "/members/me", {
    params: { fields: "id,username,fullName,avatarUrl,initials" },
  });
}

// Custom Field Schema on Board
export async function getBoardSchema(t) {
  if (!t || typeof t.get !== "function") {
    try {
      const raw = localStorage.getItem("custom_fields_schema");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
  try {
    const schema = await t.get("board", "shared", "custom_fields_schema", []);
    return Array.isArray(schema) ? schema : [];
  } catch {
    try {
      const raw = localStorage.getItem("custom_fields_schema");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export function saveBoardSchema(t, schema) {
  if (!t || typeof t.set !== "function") {
    try {
      localStorage.setItem("custom_fields_schema", JSON.stringify(schema));
    } catch {}
    return Promise.resolve();
  }
  try {
    localStorage.setItem("custom_fields_schema", JSON.stringify(schema));
  } catch {}
  return t.set("board", "shared", "custom_fields_schema", schema);
}

// Custom Field Values on Card
export async function getCardFieldValues(t) {
  const values = await t.get("card", "shared", "custom_fields_values", {});
  return (values && typeof values === "object") ? values : {};
}

export function saveCardFieldValues(t, values) {
  return t.set("card", "shared", "custom_fields_values", values);
}
