/**
 * PocketSmart AI - Main Application Controller
 * Coordinates authentication state, page navigation, form submissions with loading states,
 * health status polling, and interactive UI feedback.
 */
const App = {
  pageNames: {
    dashboard: "Overview",
    homePlanner: "Home Planner",
    partyPlanner: "Party Planner",
    jewelryPlanner: "Jewelry Planner",
    history: "Plan History",
    howItWorks: "How It Works"
  },

  init() {
    this.bindAuth();
    this.bindNav();
    this.bindForms();
    this.bindHistory();
    this.bindModal();
    this.checkAiStatus();

    const user = Auth.require();
    if (user) {
      this.showApp();
    } else {
      this.showAuth();
    }
  },

  showAuth() {
    const authScreen = document.getElementById("authScreen");
    const appShell = document.getElementById("appShell");
    if (authScreen) authScreen.classList.remove("hidden");
    if (appShell) appShell.classList.add("hidden");
  },

  showApp() {
    const user = Auth.require();
    if (!user) return this.showAuth();

    const authScreen = document.getElementById("authScreen");
    const appShell = document.getElementById("appShell");
    if (authScreen) authScreen.classList.add("hidden");
    if (appShell) appShell.classList.remove("hidden");

    // Personalize greeting & topbar
    const firstName = (user.name || "there").split(" ")[0];
    const initial = (user.name || "U").charAt(0).toUpperCase();

    const welcomeEl = document.getElementById("welcomeName");
    const avatarEl = document.getElementById("userAvatar");
    const todayEl = document.getElementById("todayLabel");

    if (welcomeEl) welcomeEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    }

    Dashboard.refresh();
    History.render();
  },

  async checkAiStatus() {
    const statusDot = document.getElementById("statusDot");
    const statusTitle = document.getElementById("statusTitle");
    const statusSubtitle = document.getElementById("statusSubtitle");

    try {
      const res = await fetch("/health");
      if (res.ok) {
        const data = await res.json();
        if (data.gemini_configured) {
          if (statusDot) {
            statusDot.classList.remove("fallback-mode");
            statusDot.title = `Gemini AI Connected (${data.model || "Gemini"})`;
          }
          if (statusTitle) statusTitle.textContent = "Gemini AI";
          if (statusSubtitle) statusSubtitle.textContent = `Connected (${data.model || "Active"})`;
        } else {
          if (statusDot) {
            statusDot.classList.add("fallback-mode");
            statusDot.title = "Gemini key not configured. Using local demo fallback.";
          }
          if (statusTitle) statusTitle.textContent = "Gemini AI";
          if (statusSubtitle) statusSubtitle.textContent = "Demo Mode (No API Key)";
        }
      }
    } catch (e) {
      console.warn("Health check unreachable, running in offline demo mode.");
      if (statusDot) statusDot.classList.add("fallback-mode");
      if (statusTitle) statusTitle.textContent = "Offline Mode";
      if (statusSubtitle) statusSubtitle.textContent = "Demo fallback active";
    }
  },

  bindAuth() {
    // Auth tab toggles
    document.querySelectorAll(".auth-tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const isLogin = tab.dataset.auth === "login";

        const loginForm = document.getElementById("loginForm");
        const registerForm = document.getElementById("registerForm");
        if (loginForm) loginForm.classList.toggle("hidden", !isLogin);
        if (registerForm) registerForm.classList.toggle("hidden", isLogin);
      };
    });

    // Login Form Submit
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail")?.value || "";
        const password = document.getElementById("loginPassword")?.value || "";
        try {
          await Auth.login(email, password);
          this.showApp();
          this.toast("Welcome back!");
        } catch (err) {
          this.toast(err.message || "Failed to sign in.");
        }
      };
    }

    // Register Form Submit
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("registerName")?.value || "";
        const email = document.getElementById("registerEmail")?.value || "";
        const password = document.getElementById("registerPassword")?.value || "";
        try {
          await Auth.register(name, email, password);
          this.showApp();
          this.toast("Account created successfully!");
        } catch (err) {
          this.toast(err.message || "Failed to create account.");
        }
      };
    }

    // Sign out button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Auth.logout();
        this.showAuth();
        this.toast("Signed out successfully.");
      };
    }
  },

  bindNav() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-page]");
      if (!target) return;
      this.go(target.dataset.page);

      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.remove("open");
    });

    const mobileMenu = document.getElementById("mobileMenu");
    const mobileClose = document.getElementById("mobileClose");
    const sidebar = document.getElementById("sidebar");

    if (mobileMenu && sidebar) {
      mobileMenu.onclick = () => sidebar.classList.add("open");
    }
    if (mobileClose && sidebar) {
      mobileClose.onclick = () => sidebar.classList.remove("open");
    }
  },

  go(page) {
    if (!page) return;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));

    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(n => {
      n.classList.toggle("active", n.dataset.page === page);
    });

    const breadcrumb = document.getElementById("breadcrumb");
    if (breadcrumb) {
      breadcrumb.textContent = this.pageNames[page] || "PocketSmart AI";
    }

    if (page === "dashboard") Dashboard.refresh();
    if (page === "history") History.render();

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  setLoading(button, isLoading, originalText = "") {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner"></span> Generating your AI plan...`;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalHtml || originalText || "Generate Plan";
    }
  },

  async executePlan(endpoint, payload, fallbackFn, submitBtn, successToast) {
    this.setLoading(submitBtn, true);
    let plan = null;
    let isAi = false;

    try {
      plan = await Planner.callApi(endpoint, payload);
      isAi = true;
    } catch (err) {
      console.warn("AI generation failed or unavailable:", err.message);
      this.toast(`AI service unavailable: ${err.message}. Showing smart demo allocation.`);
      plan = fallbackFn();
      isAi = false;
    } finally {
      this.setLoading(submitBtn, false);
    }

    if (plan) {
      plan.is_ai = isAi;
      Planner.save(plan);
      Dashboard.refresh();
      History.render();
      renderPlanResult(plan);
      this.toast(successToast || "Plan created successfully!");
    }
  },

  bindForms() {
    // 1. Home Interior Planner Form
    const homeForm = document.getElementById("homeForm");
    if (homeForm) {
      homeForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = homeForm.querySelector("button[type='submit']");
        const budget = Number(document.getElementById("homeBudget")?.value) || 0;
        if (budget <= 0) {
          this.toast("Please enter a valid budget greater than ₹0.");
          return;
        }

        const selectedRooms = Array.from(document.querySelectorAll("#homeRooms input:checked")).map(el => el.value);
        const data = {
          budget,
          rooms: selectedRooms.length ? selectedRooms : ["Living Room"],
          lights: Number(document.getElementById("homeLights")?.value) || 0,
          fans: Number(document.getElementById("homeFans")?.value) || 0,
          furniture: Number(document.getElementById("homeFurniture")?.value) || 0,
          dining: Number(document.getElementById("homeDining")?.value) || 0,
          notes: (document.getElementById("homeNotes")?.value || "").trim()
        };

        await this.executePlan(
          "/generate-home",
          data,
          () => Planner.home(data),
          submitBtn,
          "Home interior plan ready!"
        );
      };
    }

    // 2. Party Planner Form
    const partyForm = document.getElementById("partyForm");
    if (partyForm) {
      partyForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = partyForm.querySelector("button[type='submit']");
        const budget = Number(document.getElementById("partyBudget")?.value) || 0;
        const guests = Number(document.getElementById("partyGuests")?.value) || 0;

        if (budget <= 0) {
          this.toast("Please enter a valid budget greater than ₹0.");
          return;
        }
        if (guests <= 0) {
          this.toast("Please specify at least 1 guest.");
          return;
        }

        const data = {
          budget,
          guests,
          type: document.getElementById("partyType")?.value || "Birthday",
          venue: document.getElementById("partyVenue")?.value || "Home",
          catering: Boolean(document.getElementById("partyCatering")?.checked),
          decor: Boolean(document.getElementById("partyDecor")?.checked),
          entertainment: Boolean(document.getElementById("partyEntertainment")?.checked),
          notes: (document.getElementById("partyNotes")?.value || "").trim()
        };

        await this.executePlan(
          "/generate-party",
          data,
          () => Planner.party(data),
          submitBtn,
          "Party celebration plan ready!"
        );
      };
    }

    // 3. Jewelry Planner Form
    const jewelryForm = document.getElementById("jewelryForm");
    const jewelryImage = document.getElementById("jewelryImage");
    const imagePreview = document.getElementById("imagePreview");

    if (jewelryImage && imagePreview) {
      jewelryImage.onchange = () => {
        const file = jewelryImage.files[0];
        if (!file) {
          imagePreview.src = "";
          imagePreview.style.display = "none";
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          this.toast("Image file is larger than 8MB limit.");
          jewelryImage.value = "";
          imagePreview.src = "";
          imagePreview.style.display = "none";
          return;
        }
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
      };
    }

    if (jewelryForm) {
      jewelryForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = jewelryForm.querySelector("button[type='submit']");
        const budget = Number(document.getElementById("jewelryBudget")?.value) || 0;
        if (budget <= 0) {
          this.toast("Please enter a valid budget greater than ₹0.");
          return;
        }

        const occasion = document.getElementById("jewelryOccasion")?.value || "Party";
        const style = document.getElementById("jewelryStyle")?.value || "Elegant";
        const file = jewelryImage?.files[0] || null;

        const formData = new FormData();
        formData.append("budget", String(budget));
        formData.append("occasion", occasion);
        formData.append("style", style);
        if (file) {
          formData.append("outfit_image", file);
        }

        const fallbackData = { budget, occasion, style, image: file?.name || "" };

        await this.executePlan(
          "/generate-jewelry",
          formData,
          () => Planner.jewelry(fallbackData),
          submitBtn,
          "Jewelry styling recommendations ready!"
        );
      };
    }
  },

  bindHistory() {
    const searchInput = document.getElementById("historySearch");
    const filterSelect = document.getElementById("historyFilter");
    const clearBtn = document.getElementById("clearHistory");
    const historyList = document.getElementById("historyList");

    if (searchInput) searchInput.oninput = () => History.render();
    if (filterSelect) filterSelect.onchange = () => History.render();

    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm("Are you sure you want to clear all your saved plans?")) {
          History.clear();
          Dashboard.refresh();
          this.toast("All saved history cleared.");
        }
      };
    }

    if (historyList) {
      historyList.onclick = (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains("delete-history")) {
          if (confirm("Delete this plan?")) {
            History.delete(id);
            Dashboard.refresh();
            this.toast("Plan removed from history.");
          }
        } else if (target.classList.contains("view-history")) {
          const plan = Planner.plans().find(p => p.id === id);
          if (plan) {
            renderPlanResult(plan);
          }
        }
      };
    }
  },

  bindModal() {
    document.querySelectorAll("[data-close-modal]").forEach(el => {
      el.onclick = () => {
        const modal = document.getElementById("resultModal");
        if (modal) modal.classList.add("hidden");
      };
    });

    // Close on Escape key press
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modal = document.getElementById("resultModal");
        if (modal && !modal.classList.contains("hidden")) {
          modal.classList.add("hidden");
        }
      }
    });
  },

  toast(message) {
    const toastEl = document.getElementById("toast");
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 3200);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
