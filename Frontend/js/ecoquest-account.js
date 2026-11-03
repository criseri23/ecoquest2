(() => {
  const key = "ecoquestAccount";
  const guestKey = "ecoquestGuestMode";
  let session;
  try { session = JSON.parse(localStorage.getItem(key)); } catch { session = null; }
  const apiOrigin = location.protocol.startsWith("http") ? ((["5500", "5501", "3000", "5173"].includes(location.port)) ? `${location.protocol}//${location.hostname}:5228` : location.origin) : "http://localhost:5228";
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(apiOrigin + path, { ...options, signal: options.signal || AbortSignal.timeout(85000), headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...options.headers } });
    } catch (error) {
      const message = error.name === "AbortError"
        ? "EcoQuest tardó demasiado en responder. Revisá que la API y MySQL estén iniciados."
        : `No se pudo conectar con EcoQuest en ${apiOrigin}. Revisá que la API esté abierta e intentá otra vez.`;
      throw new Error(message);
    }
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && session) { localStorage.removeItem(key); session = null; location.reload(); }
    if (!response.ok) {
      const fallback = response.status === 429
        ? "Hubo muchos intentos seguidos. Esperá un minuto y volvé a probar."
        : response.status >= 500
          ? `EcoQuest respondió con un error (${response.status}). Revisá MySQL en XAMPP y volvé a iniciar la API.`
          : response.status === 401
            ? "Email o nombre de usuario y contraseña incorrectos."
            : `EcoQuest respondió con un error (${response.status}). Revisá los datos e intentá otra vez.`;
      throw new Error(body.error || body.mensaje || fallback);
    }
    return body;
  }
  function applyProfile(profile) {
    if (!session || session.profile.id !== profile.id) return;
    session.profile = profile; localStorage.setItem(key, JSON.stringify(session));
    const store = window.EcoQuestStorage;
    if (store) { const p = store.readProgress(); store.writeProgress({ ...p, totalPoints: profile.xp, successfulScans: profile.validated, scans: profile.scans, completedMissionIds: profile.completedMissionIds, activity: profile.activity }); }
  }
  window.EcoQuestAccount = {
    get profile() { return this.isGuest ? null : session?.profile; },
    get isGuest() {
      try { return sessionStorage.getItem(guestKey) === "1" || !session; } catch { return !session; }
    },
    get headers() { return session?.token ? { Authorization: `Bearer ${session.token}` } : {}; },
    request, applyProfile, apiOrigin,
    save(value) {
      session = value;
      try { sessionStorage.removeItem(guestKey); } catch { }
      localStorage.setItem(key, JSON.stringify(value));
    },
    enterGuest() {
      session = null;
      try { sessionStorage.setItem(guestKey, "1"); } catch { }
      try { localStorage.removeItem(key); } catch { }
      try { localStorage.removeItem("ecoquestProgress"); localStorage.removeItem("ecoquestPendingScans"); } catch { }
    },
    async logout() {
      await request("/api/ranking/logout", { method: "POST" });
      localStorage.removeItem(key); session = null;
      try { sessionStorage.removeItem(guestKey); } catch { }
      location.href = "click.html";
    },
    async refresh() {
      if (!session) return;
      await request("/api/ranking/activity", { method: "POST" });
      const progress = await request("/api/ranking/progress");
      applyProfile(progress.profile);
      window.EcoQuestStorage?.syncAccountProgress(progress);
      return progress;
    }
  };
  document.addEventListener("click", event => {
    if (event.target.closest("[data-guest-entry]")) window.EcoQuestAccount.enterGuest();
  });
})();
