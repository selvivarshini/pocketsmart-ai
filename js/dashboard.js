/**
 * PocketSmart AI - Dashboard Analytics & Overview Module
 * Dynamically computes statistics, recent activity, and budget distribution.
 */
const Dashboard = {
  refresh() {
    const plans = Planner.plans();
    const plansCount = plans.length;

    // Calculate total planned across all saved plans
    const totalBudget = plans.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

    // Calculate remaining budget from the most recent plan (or 0)
    let remainingBudget = 0;
    if (plans.length > 0) {
      const latest = plans[0];
      const latestAllocated = (latest.allocations || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      remainingBudget = Math.max(0, (Number(latest.budget) || 0) - latestAllocated);
    }

    // Determine the most used planner category
    const counts = { home: 0, party: 0, jewelry: 0 };
    plans.forEach(p => {
      if (counts[p.type] !== undefined) {
        counts[p.type]++;
      }
    });

    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const mostUsedKey = sortedCounts[0] && sortedCounts[0][1] > 0 ? sortedCounts[0][0] : null;
    const plannerNames = {
      home: "Home Interior",
      party: "Party Planner",
      jewelry: "Jewelry Match"
    };

    // Update DOM Stat Cards
    const statPlansEl = document.getElementById("statPlans");
    const statBudgetEl = document.getElementById("statBudget");
    const statRemainingEl = document.getElementById("statRemaining");
    const statMostEl = document.getElementById("statMost");

    if (statPlansEl) statPlansEl.textContent = plansCount;
    if (statBudgetEl) statBudgetEl.textContent = plansCount > 0 ? Planner.money(totalBudget) : "₹0";
    if (statRemainingEl) statRemainingEl.textContent = plansCount > 0 ? Planner.money(remainingBudget) : "₹0";
    if (statMostEl) statMostEl.textContent = mostUsedKey ? plannerNames[mostUsedKey] : "—";

    // Render Recent Plans List (up to 4 items)
    const recentEl = document.getElementById("recentPlans");
    if (recentEl) {
      if (!plans.length) {
        recentEl.innerHTML = '<div class="empty-state">No plans yet.<br>Start your first smart plan.</div>';
      } else {
        recentEl.innerHTML = plans.slice(0, 4).map(p => {
          const icon = p.type === "home" ? "⌂" : p.type === "party" ? "✦" : "◇";
          const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
          return `
            <div class="recent-item" style="cursor: pointer;" data-view-plan-id="${p.id}">
              <div class="recent-icon">${icon}</div>
              <div style="flex:1; min-width:0;">
                <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</strong>
                <small>${dateStr} • ${p.summary || ""}</small>
              </div>
              <div class="recent-budget">${Planner.money(p.budget)}</div>
            </div>
          `;
        }).join("");

        // Attach click handlers to open recent plan
        recentEl.querySelectorAll("[data-view-plan-id]").forEach(item => {
          item.onclick = () => {
            const planId = item.dataset.viewPlanId;
            const targetPlan = plans.find(p => p.id === planId);
            if (targetPlan) renderPlanResult(targetPlan);
          };
        });
      }
    }

    // Render Aggregated Category Budget Breakdown (Top 5 Categories)
    const breakdownEl = document.getElementById("budgetBreakdown");
    if (breakdownEl) {
      if (!plans.length) {
        breakdownEl.innerHTML = '<div class="breakdown-empty">Create a plan to see your budget distribution.</div>';
      } else {
        const categorySums = {};
        let totalAllocatedOverall = 0;

        plans.forEach(p => {
          (p.allocations || []).forEach(alloc => {
            const amt = Number(alloc.amount) || 0;
            categorySums[alloc.label] = (categorySums[alloc.label] || 0) + amt;
            totalAllocatedOverall += amt;
          });
        });

        const topCategories = Object.entries(categorySums)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        if (topCategories.length) {
          breakdownEl.innerHTML = `
            <div class="breakdown">
              ${topCategories.map(([category, amount]) => {
                const percentage = totalAllocatedOverall > 0 ? Math.min(100, Math.round((amount / totalAllocatedOverall) * 100)) : 0;
                return `
                  <div class="break-row">
                    <span title="${category}" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${category}</span>
                    <div class="bar">
                      <i style="width: ${percentage}%"></i>
                    </div>
                    <strong>${Planner.money(amount)}</strong>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        } else {
          breakdownEl.innerHTML = '<div class="breakdown-empty">No category allocations found.</div>';
        }
      }
    }
  }
};
