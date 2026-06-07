const API_BASE = "https://words-notion-server.wizard-today.deno.net/";

async function apiFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    let error = {};
    try {
      error = await res.json();
    } catch {}
    throw new Error(
      error.error ??
      `Request failed: ${res.status} ${res.statusText}`
    );
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return null;
}

export class Api {
  /* ── Repeats ── */
  async getRepeats() {
    return apiFetch("/repeats");
  }

  /* ── Categories ── */
  async getCategories() {
    return apiFetch("/categories");
  }

  /* ── All cards ── */
  async getAllCards({ categoryId } = {}) {
    const params = new URLSearchParams();
    if (categoryId != null) {
      params.set("categoryId", categoryId);
    }
    const query = params.toString();
    return apiFetch(`/cards${query ? `?${query}` : ""}`);
  }

  /* ── Repeat cards (repeat_date <= now()) ── */
  async getRepeatCards({ categoryId } = {}) {
    const params = new URLSearchParams();
    if (categoryId != null) {
      params.set("categoryId", categoryId);
    }
    const query = params.toString();
    return apiFetch(`/cards/repeat${query ? `?${query}` : ""}`);
  }

  /* ── Mark learned ── */
  async markCardLearned(cardId, repeat_date_timestamp, repeat_after) {
    await apiFetch(`/cards/${cardId}/learned`, {
      method: "POST",
      body: { repeat_date_timestamp, repeat_after },
    });
  }

  /* ── Mark not learned ── */
  async markCardNotLearned(cardId) {
    await apiFetch(`/cards/${cardId}/not-learned`, {
      method: "POST",
    });
  }
}
