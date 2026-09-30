/**
 * PocketSmart AI - Planner & Recommendation Engine
 * Handles API generation requests, deterministic fallback logic, and modal rendering.
 */
const Planner = {
  apiBase: "", // Relative path ensures calls route directly to the FastAPI server

  money(n) {
    const val = Number(n) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  },

  save(plan) {
    const user = Auth.current();
    if (!user) return;
    const key = `pocketsmart_plans_${user.id}`;
    let plans = [];
    try {
      plans = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      plans = [];
    }

    const planToSave = {
      ...plan,
      id: window.crypto?.randomUUID ? crypto.randomUUID() : "plan_" + Date.now(),
      createdAt: new Date().toISOString()
    };
    plans.unshift(planToSave);
    localStorage.setItem(key, JSON.stringify(plans));
    return planToSave;
  },

  plans() {
    const user = Auth.current();
    if (!user) return [];
    try {
      return JSON.parse(localStorage.getItem(`pocketsmart_plans_${user.id}`) || "[]");
    } catch (e) {
      return [];
    }
  },

  async callApi(endpoint, payload) {
    const url = `${this.apiBase}${endpoint}`;
    const isFormData = payload instanceof FormData;

    const options = {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
      headers: isFormData ? {} : { "Content-Type": "application/json" }
    };

    const response = await fetch(url, options);
    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  },

  // Deterministic Local Fallback Planners
  home(data) {
    const budget = Number(data.budget) || 50000;
    const rooms = data.rooms && data.rooms.length ? data.rooms : ["Living Room"];
    const lights = Number(data.lights) || 0;
    const fans = Number(data.fans) || 0;
    const furniture = Number(data.furniture) || 0;
    const dining = Number(data.dining) || 0;

    const base = [
      { label: "Modular Furniture & Storage", amount: Math.round(budget * 0.40), reason: `Primary investment for ${rooms.join(", ")} seating and essentials.` },
      { label: "Lighting & Electrical Fixtures", amount: Math.round(budget * 0.18), reason: `Covers ${lights} light fixtures, wiring, and ambient room accents.` },
      { label: "Fans & Climate Control", amount: Math.round(budget * 0.12), reason: `High-efficiency BLDC ceiling fans (${fans} units) and switches.` },
      { label: "Dining & Kitchen Area", amount: Math.round(budget * 0.15), reason: `Table set and dining nook storage optimization.` },
      { label: "Finishing & Decorative Accents", amount: Math.round(budget * 0.10), reason: "Curtains, paint touch-ups, and soft furnishings." }
    ];

    const plannedSum = base.reduce((acc, curr) => acc + curr.amount, 0);
    const buffer = Math.max(0, budget - plannedSum);
    if (buffer > 0) {
      base.push({ label: "Contingency / Buffer", amount: buffer, reason: "Reserved for unexpected installation or delivery charges." });
    }

    return {
      type: "home",
      title: "Home Interior Plan",
      budget,
      is_ai: false,
      summary: `${rooms.join(", ")} • ${lights} lights • ${fans} fans • ${furniture} furniture items`,
      allocations: base,
      tips: [
        "Opt for modular plywood (BWP grade) for wet zones like kitchen and dining to avoid rework.",
        "Choose BLDC ceiling fans to reduce monthly household energy consumption by up to 50%.",
        "Prioritize warm 3000K-4000K recessed ceiling LEDs to enhance room warmth without harsh shadows.",
        "Negotiate bundle discounts directly with local timber and hardware fabricators."
      ],
      details: data
    };
  },

  party(data) {
    const budget = Number(data.budget) || 25000;
    const guests = Number(data.guests) || 20;
    const active = [];

    if (data.catering) active.push({ label: "Catering & Refreshments", ratio: 0.50, reason: `High priority catering catering to ~${guests} guests.` });
    if (data.decor) active.push({ label: "Theme Decor & Florals", ratio: 0.25, reason: `Backdrop, balloon/floral arches, and table centrepieces for ${data.venue}.` });
    if (data.entertainment) active.push({ label: "Entertainment, Music & Sound", ratio: 0.15, reason: "DJ speaker rental, party host, or interactive celebration games." });

    if (!active.length) {
      active.push({ label: "General Event Essentials", ratio: 0.85, reason: "Event space prep and refreshments." });
    }

    const totalRatio = active.reduce((acc, cur) => acc + cur.ratio, 0);
    const allocations = active.map(item => ({
      label: item.label,
      amount: Math.round((budget * item.ratio) / totalRatio),
      reason: item.reason
    }));

    const used = allocations.reduce((acc, curr) => acc + curr.amount, 0);
    allocations.push({
      label: "Buffer & Incidentals",
      amount: Math.max(0, budget - used),
      reason: "Unexpected extra guests, ice, packaging, or last-minute supplies."
    });

    return {
      type: "party",
      title: "Party Budget Plan",
      budget,
      is_ai: false,
      summary: `${guests} guests • ${data.type} • Venue: ${data.venue}`,
      allocations,
      tips: [
        "Finalize exact guest RSVPs 48 hours prior to lock in catering plate counts with minimum wastage.",
        "Focus decoration spending on a single photo-worthy backdrop rather than spreading thin across the entire hall.",
        "Pre-curate music playlists on Spotify or Apple Music to save on DJ costs for medium gatherings.",
        "Order seasonal welcome drinks in batch carafes instead of individual branded canned beverages."
      ],
      details: data
    };
  },

  jewelry(data) {
    const budget = Number(data.budget) || 30000;
    const occasion = data.occasion || "Party";
    const style = data.style || "Elegant";

    const allocations = [
      { label: "Necklace / Statement Centerpiece", amount: Math.round(budget * 0.44), reason: `Focal piece designed to complement ${occasion} attire.` },
      { label: "Earrings / Jhumkas", amount: Math.round(budget * 0.24), reason: "Harmonizing drops or studs framing the face." },
      { label: "Bangles / Bracelet / Kadas", amount: Math.round(budget * 0.18), reason: "Hand jewelry adding subtle movement and sparkle." },
      { label: "Rings & Stylist Touch", amount: Math.round(budget * 0.14), reason: "Adjustable cocktail ring or delicate accents." }
    ];

    const recommendations = [
      {
        name: `${style} Statement Necklace`,
        description: `Handcrafted ${style.toLowerCase()} finish featuring coordinated stone inlays suited for ${occasion.toLowerCase()}.`,
        budget_amount: Math.round(budget * 0.44),
        why: `Pairs naturally with the neckline and tone expected at a ${occasion.toLowerCase()}.`
      },
      {
        name: "Matching Drop Earrings",
        description: "Comfort-fit studs or drop chandeliers echoing the motif of the primary piece.",
        budget_amount: Math.round(budget * 0.24),
        why: "Balances the upper styling without overwhelming your hairstyle."
      },
      {
        name: "Coordinated Hand Wear",
        description: "Openable cuff or dual bangles with subtle gemstone or metallic highlights.",
        budget_amount: Math.round(budget * 0.18),
        why: "Adds graceful balance when holding clutch bags or greeting attendees."
      }
    ];

    return {
      type: "jewelry",
      title: "Jewelry Recommendation Plan",
      budget,
      is_ai: false,
      summary: `${occasion} • ${style} Style`,
      recommendations,
      allocations,
      tips: [
        "Always check BIS hallmark certifications (HUID) when investing in precious 18K/22K gold jewelry.",
        "For heavy bridal or occasional statement looks, consider high-grade 925 sterling silver with gold polish for 70% cost savings.",
        "Store pearl and Kundan pieces in moisture-free fabric pouches, never in plastic or velvet boxes.",
        "Apply perfumes and hairsprays completely before putting on your jewelry to prevent tarnishing."
      ],
      details: data
    };
  }
};

/**
 * Renders the generated plan result into the reusable modal.
 */
function renderPlanResult(plan) {
  if (!plan) return;

  const totalPlanned = (plan.allocations || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = Math.max(0, plan.budget - totalPlanned);

  const isAi = Boolean(plan.is_ai || (plan.title && plan.title.toLowerCase().startsWith("ai")));

  let html = `
    <div class="result-header">
      <div class="result-source-badge ${isAi ? 'ai' : 'fallback'}">
        ${isAi ? '✦ Powered by Google Gemini' : '◫ Demo Fallback Plan'}
      </div>
      <h2>${plan.title || "Your Customized Plan"}</h2>
      <p class="muted">${plan.summary || ""}</p>

      <div class="result-totals-bar">
        <div>
          <span>Total Budget</span>
          <strong>${Planner.money(plan.budget)}</strong>
        </div>
        <div class="total-highlight">
          <span>Total Planned</span>
          <strong>${Planner.money(totalPlanned)}</strong>
        </div>
        <div>
          <span>Remaining Balance</span>
          <strong>${Planner.money(remaining)}</strong>
        </div>
      </div>
    </div>
  `;

  // Render Jewelry pieces if present
  if (plan.recommendations && plan.recommendations.length) {
    html += `
      <div class="form-section" style="margin-top:0;">
        <span class="step">💎</span>
        <div>
          <h2>Recommended Jewelry Pieces</h2>
          <p class="muted">Curated to harmonize with your occasion and style.</p>
        </div>
      </div>
      <div class="recommendation-grid">
        ${plan.recommendations.map((rec, idx) => `
          <div class="rec-card">
            <div>
              <div class="rec-symbol">${["◇", "◈", "✦", "○"][idx % 4]}</div>
              <h3>${rec.name || "Curated Piece"}</h3>
              <p>${rec.description || rec.why || "Styled for your occasion."}</p>
            </div>
            <div class="rec-footer">
              <span class="rec-amount">${rec.budget_amount ? Planner.money(rec.budget_amount) : "Included"}</span>
              <span class="muted" style="font-size:10px;">${rec.why ? "Matched" : "Essential"}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Render Image Preview in result if present
  if (plan.image_saved) {
    html += `
      <div style="margin: 16px 0; padding: 12px; background: #fafbf9; border: 1px solid var(--line); border-radius: 12px; display: flex; align-items: center; gap: 14px;">
        <img src="${plan.image_saved}" alt="Referenced outfit" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;">
        <div>
          <strong style="font-size: 13px; display: block;">Referenced Outfit Analyzed</strong>
          <small class="muted">Gemini evaluated the color palette, neckline, and styling of your upload.</small>
        </div>
      </div>
    `;
  }

  // Render Allocations Breakdown
  html += `
    <div class="form-section">
      <span class="step">₹</span>
      <div>
        <h2>Budget Allocations</h2>
        <p class="muted">Category distribution designed to keep you within limits.</p>
      </div>
    </div>
  `;

  html += (plan.allocations || []).map(alloc => {
    const percent = plan.budget > 0 ? Math.min(100, Math.round((alloc.amount / plan.budget) * 100)) : 0;
    return `
      <div class="allocation-card">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <strong style="font-size:14px;">${alloc.label}</strong>
            <span class="muted" style="font-size:12px; font-weight:600;">${percent}%</span>
          </div>
          ${alloc.reason ? `<small class="muted" style="display:block; margin-top:2px;">${alloc.reason}</small>` : ""}
          <div class="allocation-bar">
            <i style="width: ${percent}%;"></i>
          </div>
        </div>
        <div class="amount">${Planner.money(alloc.amount)}</div>
      </div>
    `;
  }).join("");

  // Render Smart Tips if available
  if (plan.tips && plan.tips.length) {
    html += `
      <div class="panel" style="margin-top: 24px; background: #fafbf9; border-color: var(--line);">
        <div class="panel-head" style="margin-bottom: 12px;">
          <div>
            <span class="eyebrow" style="color:var(--green)">SMART SAVINGS ADVICE</span>
            <h2 style="font-size: 16px;">Expert Practical Tips</h2>
          </div>
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: var(--ink-secondary);">
          ${plan.tips.map(tip => `<li>${tip}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  // Render Footer note
  html += `
    <p class="muted" style="margin-top: 20px; font-size: 12px; text-align: center;">
      ${isAi ? "Generated using Google Gemini with structured financial parameters." : "Generated via local PocketSmart deterministic financial model."}
    </p>
  `;

  const modalEl = document.getElementById("resultContent");
  if (modalEl) {
    modalEl.innerHTML = html;
    document.getElementById("resultModal").classList.remove("hidden");
  }
}
