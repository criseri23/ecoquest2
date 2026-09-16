(() => {
  const key = "ecoquestAccount";
  let session;
  try { session = JSON.parse(localStorage.getItem(key)); } catch { session = null; }
  const apiOrigin = location.protocol.startsWith("http") ? ((["5500", "5501", "3000", "5173"].includes(location.port)) ? `${location.protocol}//${location.hostname}:5228` : location.origin) : "http://localhost:5228";
  async function request(path, options = {}) {
    const response = await fetch(apiOrigin + path, { ...options, signal: options.signal || AbortSignal.timeout(85000), headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && session) { localStorage.removeItem(key); session = null; location.reload(); }
    if (!response.ok) throw new Error(body.error || body.mensaje || (response.status === 401 ? "Tu sesión venció. Volvé a iniciar sesión." : "No se pudo conectar. Intentá nuevamente."));
    return body;
  }
  function applyProfile(profile) {
    if (!session || session.profile.id !== profile.id || profile.xp < session.profile.xp) return;
    session.profile = profile; localStorage.setItem(key, JSON.stringify(session));
    const store = window.EcoQuestStorage;
    if (store) { const p = store.readProgress(); store.writeProgress({ ...p, totalPoints: profile.xp, successfulScans: profile.validated, scans: profile.scans, completedMissionIds: profile.completedMissionIds, activity: profile.activity }); }
  }
  window.EcoQuestAccount = {
    get profile() { return session?.profile; },
    get headers() { return session?.token ? { Authorization: `Bearer ${session.token}` } : {}; },
    request, applyProfile, apiOrigin,
    save(value) { session = value; localStorage.setItem(key, JSON.stringify(value)); },
    async logout() { await request("/api/ranking/logout", { method: "POST" }); localStorage.removeItem(key); location.reload(); },
    async refresh() { if (session) applyProfile((await request("/api/ranking/activity", { method: "POST" })).profile); }
  };
})();
