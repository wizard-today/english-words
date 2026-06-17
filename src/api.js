const API_BASE = "https://languages-server.wizard-today.deno.net";

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
      `Request failed: ${path} ${res.status} ${res.statusText}`
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

  async setCategoryCollapsed(categoryId, collapsed) {
    return apiFetch(`/categories/${categoryId}/collapsed`, {
      method: "PATCH",
      body: { collapsed },
    });
  }

  /* ── All cards ── */
  async getAllCards({ categoryIds } = {}) {
    const params = new URLSearchParams();
    if (categoryIds?.length > 0) {
      const allIds = await this._collectManyIds(categoryIds);
      params.set("categoryIds", allIds.join(","));
    }
    const query = params.toString();
    return apiFetch(`/cards${query ? `?${query}` : ""}`);
  }

  /* ── Repeat cards (repeat_date <= now()) ── */
  async getRepeatCards({ categoryIds } = {}) {
    const params = new URLSearchParams();
    if (categoryIds?.length > 0) {
      const allIds = await this._collectManyIds(categoryIds);
      params.set("categoryIds", allIds.join(","));
    }
    const query = params.toString();
    return apiFetch(`/cards/repeat${query ? `?${query}` : ""}`);
  }

  /* ── Собирает id для массива категорий + все вложенные, без дублей ── */
  async _collectManyIds(categoryIds) {
    const categories = await this.getCategories();
    const flatten = (cats) => cats.flatMap((c) => [c, ...flatten(c.nested ?? [])]);
    const all = flatten(categories);

    const collect = (id) => {
      const cat = all.find((c) => c.id === id);
      if (!cat) return [id];
      return [id, ...(cat.nested ?? []).flatMap((n) => collect(n.id))];
    };

    const result = new Set(categoryIds.flatMap((id) => collect(id)));
    return [...result];
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