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

// Fetch Current Card details (including assigned member IDs)
export async function getCurrentCard(t) {
  if (!t || typeof t.card !== "function") return null;
  try {
    const cardData = await t.card("id", "name", "idMembers", "members").catch(() => null);
    return cardData || null;
  } catch (err) {
    console.warn("Failed to get current card:", err);
    return null;
  }
}

// Fetch Board Members from Trello Power-Up / Board API
export async function getBoardMembers(t) {
  if (!t) return [];
  try {
    let boardData = null;
    if (typeof t.board === "function") {
      boardData = await t.board("id", "name", "members", "memberships").catch(() => null);
      if (!boardData || !boardData.members) {
        boardData = await t.board("all").catch(() => null);
      }
    }

    if (boardData?.members && Array.isArray(boardData.members) && boardData.members.length > 0) {
      const adminIds = new Set(
        (boardData.memberships || [])
          .filter((m) => m.memberType === "admin")
          .map((m) => m.idMember)
      );

      // Load any board role assignments saved by our powerup
      let roleMap = {};
      if (typeof t.get === "function") {
        try {
          roleMap = (await t.get("board", "shared", "custom_fields_member_roles", {})) || {};
        } catch {}
      }

      return boardData.members.map((m, idx) => {
        const isAdmin = adminIds.has(m.id) || (idx === 0 && adminIds.size === 0);
        const assignedRole = roleMap[m.id] || (isAdmin ? "Board Administrator" : "Team Member");
        return {
          id: m.id || `mem_${idx}`,
          name: m.fullName || m.username || `Member ${idx + 1}`,
          username: m.username || "",
          role: assignedRole,
          roles: isAdmin ? [assignedRole, "Board Admin", "Admin"] : [assignedRole],
          isAdmin: isAdmin,
          isGuest: assignedRole.toLowerCase().includes("guest") || assignedRole.toLowerCase().includes("client"),
          avatar: m.avatar || m.avatarUrl || null,
          initials: m.initials || (m.fullName ? m.fullName.slice(0, 2).toUpperCase() : "BM"),
        };
      });
    }

    // Fallback: If REST API token is available, query board endpoint
    const token = await getToken(t).catch(() => null);
    if (token && boardData?.id) {
      const members = await apiFetch(t, `/boards/${boardData.id}/members`, {
        params: { fields: "id,fullName,username,avatarUrl,initials" },
      }).catch(() => null);
      const memberships = await apiFetch(t, `/boards/${boardData.id}/memberships`).catch(() => []);
      if (Array.isArray(members) && members.length > 0) {
        const adminIds = new Set(
          (memberships || []).filter((m) => m.memberType === "admin").map((m) => m.idMember)
        );
        return members.map((m, idx) => {
          const isAdmin = adminIds.has(m.id) || idx === 0;
          return {
            id: m.id,
            name: m.fullName || m.username || `Member ${idx + 1}`,
            username: m.username || "",
            role: isAdmin ? "Board Administrator" : "Team Member",
            roles: isAdmin ? ["Board Admin", "Admin"] : ["Team Member"],
            isAdmin: isAdmin,
            isGuest: false,
            avatar: m.avatarUrl || null,
            initials: m.initials || (m.fullName ? m.fullName.slice(0, 2).toUpperCase() : "BM"),
          };
        });
      }
    }
  } catch (err) {
    console.warn("Failed to get board members:", err);
  }

  return [];
}

export function saveBoardMemberRoles(t, roleMap) {
  if (!t || typeof t.set !== "function") return Promise.resolve();
  return t.set("board", "shared", "custom_fields_member_roles", roleMap);
}

