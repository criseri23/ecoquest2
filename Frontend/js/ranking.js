window.EcoQuestReady.then(() => {
(() => {
  const account = window.EcoQuestAccount;
  const more = document.querySelector("#rankingMore");
  const details = document.querySelector("#rankingDetails");
  const status = document.querySelector("#rankingStatus");
  let expanded = false, loading = false;
  function avatar(user) {
    const img = document.createElement("img"); img.alt = `Foto de ${user.name}`;
    img.src = user.photoUrl ? account.apiOrigin + user.photoUrl : "../img/carpincho-crop.png";
    img.addEventListener("error", () => { img.src = "../img/carpincho-crop.png"; }, { once: true });
    return img;
  }
  function text(tag, content, className) { const e = document.createElement(tag); e.textContent = content; if (className) e.className = className; return e; }
  function renderProgress() {
    const progress = window.EcoQuestStorage.readProgress();
    document.querySelector("#rankingScore").textContent = `${progress.totalPoints} XP`;
    document.querySelector("#rankingScans").textContent = progress.scans;
    document.querySelector("#rankingSuccess").textContent = progress.successfulScans;
    document.querySelector("#rankingJoin").hidden = Boolean(account.profile);
    document.querySelector("#rankingPhoto").hidden = !account.profile;
    document.querySelector("#rankingLogout").hidden = !account.profile;
  }
  async function refresh() {
    if (loading) return; loading = true;
    try {
      await account.refresh(); renderProgress();
      const data = await account.request(`/api/ranking?limit=${expanded ? 100 : 10}`);
      const entries = document.querySelector("#rankingEntries"); entries.replaceChildren();
      for (const user of data.users) {
        const row = text("li", "", "ranking-entry" + (user.id === account.profile?.id ? " ranking-self" : ""));
        row.append(text("span", String(user.rank), "ranking-place"), avatar(user));
        const person = text("span", "", "ranking-person");person.append(text("strong", user.name), text("small", user.id === account.profile?.id ? "Vos · CABA" : "CABA"));
        row.append(person, text("strong", `${user.xp} XP`)); entries.append(row);
      }
      const podium = document.querySelector("#rankingWinners"); podium.replaceChildren();
      for (let rank = 1; rank <= 3; rank++) {
        const user = data.users[rank - 1];
        const slot = text("div", "", `podium-person podium-person-${rank}`);
        if (user) { slot.append(avatar(user), text("strong", user.name), text("small", `${user.xp} XP`)); slot.setAttribute("aria-label", `Puesto ${rank}: ${user.name}, ${user.xp} XP`); }
        else { slot.append(text("span", "", "podium-vacancy"), text("small", "Puesto libre")); }
        podium.append(slot);
      }
      status.textContent = data.users.length ? "CABA · Ordenado por XP validado. Se actualiza automáticamente." : "El podio está libre. Creá tu perfil para participar en CABA.";
    } catch (error) { status.textContent = error.message; }
    finally { loading = false; }
  }
  more.addEventListener("click", () => {
    expanded = !expanded; more.setAttribute("aria-expanded", String(expanded)); more.textContent = expanded ? "Ver menos" : "Ver más"; details.hidden = !expanded; refresh();
  });
  document.querySelector("#rankingJoin").addEventListener("click", () => { location.href = "elegir.html"; });
  async function readPhoto(file) {
    if (!file) return "";
    if (file.size > 10 * 1024 * 1024) throw new Error("Elegí una imagen de menos de 10 MB.");
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 192;
    const ctx = canvas.getContext("2d"); const side = Math.min(bitmap.width, bitmap.height);
    ctx.fillStyle = "#edf2da"; ctx.fillRect(0,0,192,192);
    ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,192,192);bitmap.close();
    return canvas.toDataURL("image/jpeg", .85);
  }
  document.querySelector("#rankingLogout").addEventListener("click", async () => { try { await account.logout(); } catch(error) { status.textContent = error.message; } });
  const photoInput = document.querySelector("#profilePhotoUpdate");
  document.querySelector("#rankingPhoto").addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", async () => {
    try { if (!photoInput.files[0]) return; const photo = await readPhoto(photoInput.files[0]); const profile = await account.request("/api/ranking/photo", { method: "PUT", body: JSON.stringify(photo) }); account.applyProfile(profile); await refresh(); }
    catch(error) { status.textContent = error.message; }
    finally { photoInput.value = ""; }
  });
  window.EcoQuestStorage.reconcileMissionRewards(); renderProgress(); refresh();
  window.addEventListener("ecoquest:progress", renderProgress);
  window.addEventListener("focus", refresh);
  setInterval(() => { if (!document.hidden) refresh(); }, 30000);
})();

});