const API_BASE = "https://words-notion-server.wizard-today.deno.net";

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

  /* ── All cards ── */
  async getAllCards({ categoryId } = {}) {
    const params = new URLSearchParams();
    if (categoryId != null) {
      const categoryIds = await this._collectCategoryIds(categoryId);
      params.set("categoryIds", categoryIds.join(","));
    }
    const query = params.toString();
    return apiFetch(`/cards${query ? `?${query}` : ""}`);
  }

  /* ── Repeat cards (repeat_date <= now()) ── */
  async getRepeatCards({ categoryId } = {}) {
    const params = new URLSearchParams();
    if (categoryId != null) {
      const categoryIds = await this._collectCategoryIds(categoryId);
      params.set("categoryIds", categoryIds.join(","));
    }
    const query = params.toString();
    return apiFetch(`/cards/repeat${query ? `?${query}` : ""}`);
  }

  /* ── Собирает id категории и всех вложенных рекурсивно ── */
  async _collectCategoryIds(categoryId) {
    const categories = await this.getCategories();

    const collect = (id, cats) => {
      const ids = [id];
      const category = cats.find((c) => c.id === id);
      if (category?.nested?.length) {
        for (const nested of category.nested) {
          ids.push(...collect(nested.id, nested.nested ? cats.concat(nested.nested) : cats));
        }
      }
      return ids;
    };

    // Строим плоский список всех категорий для удобного поиска
    const flatten = (cats) =>
      cats.flatMap((c) => [c, ...flatten(c.nested ?? [])]);

    const allCategories = flatten(categories);
    return collect(categoryId, allCategories);
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
