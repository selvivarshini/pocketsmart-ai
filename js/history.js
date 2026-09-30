/**
 * PocketSmart AI - History Management Module
 * Enables searching, filtering, inspecting, and deleting saved plans.
 */
const History = {
  list() {
    return Planner.plans();
  },

  delete(id) {
    const user = Auth.current();
    if (!user) return;
    const key = `pocketsmart_plans_${user.id}`;
    const remaining = this.list().filter(p => p.id !== id);
    localStorage.setItem(key, JSON.stringify(remaining));
    this.render();
  },

  clear() {
    const user = Auth.current();
    if (!user) return;
    localStorage.removeItem(`pocketsmart_plans_${user.id}`);
    this.render();
  },

  render() {
    const container = document.getElementById("historyList");
    if (!container) return;

    const searchTerm = (document.getElementById("historySearch")?.value || "").toLowerCase().trim();
    const filterCategory = document.getElementById("historyFilter")?.value || "all";

    const allPlans = this.list();

    // Filter by category and search keywords
    const filtered = allPlans.filter(p => {
      const matchesCategory = filterCategory === "all" || p.type === filterCategory;
      const haystack = `${p.title || ""} ${p.summary || ""} ${p.type || ""}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state">No matching plans found in your history.</div>';
      return;
    }

    container.innerHTML = filtered.map(p => {
      const icon = p.type === "home" ? "⌂" : p.type === "party" ? "✦" : "◇";
      const dateStr = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Saved Plan";

      const totalPlanned = (p.allocations || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const remaining = Math.max(0, (Number(p.budget) || 0) - totalPlanned);

      return `
        <div class="history-item">
          <div class="recent-icon">${icon}</div>
          <div class="history-main">
            <strong>${p.title || "Custom Plan"}</strong>
            <small>${p.summary || ""} • ${dateStr}</small>
            <small style="color: var(--ink-secondary); margin-top: 2px;">
              Planned: <b>${Planner.money(totalPlanned)}</b> • Remaining: <b>${Planner.money(remaining)}</b>
            </small>
          </div>
          <div class="history-amount">${Planner.money(p.budget)}</div>
          <div class="history-actions">
            <button class="small-btn view-history" data-id="${p.id}">View Plan</button>
            <button class="small-btn delete delete-history" data-id="${p.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }
};
