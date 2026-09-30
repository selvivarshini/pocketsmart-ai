/**
 * PocketSmart AI - Local Authentication Module
 * Provides browser-based session management and SHA-256 password hashing.
 */
const Auth = {
  key: "pocketsmart_users",
  sessionKey: "pocketsmart_session",

  async hash(text) {
    if (window.crypto && window.crypto.subtle) {
      try {
        const data = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (e) {
        console.warn("crypto.subtle hashing failed, using fallback", e);
      }
    }
    // Fallback hash representation for legacy browser contexts
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "h_" + Math.abs(hash).toString(16);
  },

  users() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "[]");
    } catch (e) {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.key, JSON.stringify(users));
  },

  current() {
    try {
      return JSON.parse(localStorage.getItem(this.sessionKey) || "null");
    } catch (e) {
      return null;
    }
  },

  async register(name, email, password) {
    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!name) throw new Error("Please enter your full name.");
    if (!email || !email.includes("@")) throw new Error("Please enter a valid email address.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const users = this.users();
    if (users.some(u => u.email === email)) {
      throw new Error("An account with this email address already exists. Please sign in.");
    }

    const passwordHash = await this.hash(password);
    const user = {
      id: window.crypto?.randomUUID ? crypto.randomUUID() : "usr_" + Date.now(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    this.saveUsers(users);

    const sessionData = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    return sessionData;
  },

  async login(email, password) {
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!email) throw new Error("Please enter your email address.");
    if (!password) throw new Error("Please enter your password.");

    const users = this.users();
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error("No account found with this email. Please create an account.");
    }

    const passwordHash = await this.hash(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password. Please try again.");
    }

    const sessionData = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    return sessionData;
  },

  logout() {
    localStorage.removeItem(this.sessionKey);
  },

  require() {
    return this.current();
  }
};
