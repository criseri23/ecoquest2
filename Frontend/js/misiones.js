window.EcoQuestReady.then(() => {
(() => {
  const missions = window.EcoQuestMissions;
  const art = (file, box) => `<svg class="achievement-art" viewBox="${box}" preserveAspectRatio="none" aria-hidden="true"><image href="../img/${file}" width="1080" height="1920"/></svg>`;
  function render() {
    const progress = window.EcoQuestStorage?.readProgress() || {};
    const total = Math.max(0, Math.floor(Number(progress.successfulScans) || 0));
    document.querySelector("#missionXp").textContent = Math.max(0, Number(progress.totalPoints) || 0);
    document.querySelector("#missionStreak").textContent = window.EcoQuestActivity.summary(progress).streak;
    const summary = window.EcoQuestActivity.summary(progress);
    document.querySelector('#streakAchievements').innerHTML = '<h2>Logros de racha</h2><a href="calendario.html">Ver mi calendario</a>' + summary.rewards.map(reward => {
      const done = summary.claimed.includes(reward.days);
      return `<article class="streak-achievement"><strong>${done ? '✓' : summary.streak < reward.days ? '🔒' : '🔥'} ${reward.days} días de racha</strong><span>+${reward.xp} XP</span><progress value="${done ? reward.days : Math.min(summary.streak,reward.days)}" max="${reward.days}" aria-label="Racha de ${reward.days} días"></progress><small>${done ? 'Completado · recompensa recibida' : `${summary.streak}/${reward.days} días de uso consecutivos`}</small></article>`;
    }).join('');
    document.querySelector("#achievementsList").innerHTML = missions.map(({id, name, goal, reward}, index) => {
      const current = Math.min(total, goal), complete = (progress.completedMissionIds || []).includes(id);
      const locked = index > 0 && total < missions[index - 1].goal;
      const previousName = index > 0 ? missions[index - 1].name : "";
      const colors = ["bronze", "green", "gold", "blue", "purple", "coral"];
      const tag = locked || complete ? "article" : "a";
      const action = locked || complete ? 'aria-disabled="true"' : `href="${complete ? "mapa.html" : "escanear.html"}"`;
      return `<${tag} class="achievement-card${complete ? " is-complete" : ""}${locked ? " is-locked" : ""}" ${action} aria-label="${name}: ${current} de ${goal} residuos validados. ${locked ? `Bloqueado. Completá ${previousName}.` : complete ? "Completado. Recompensa recibida." : "Seguir reciclando."} ${complete ? "Bonus recibido" : "Recompensa"}: ${reward} XP.">
        ${art("Nombre de usuario (14).png", "21 875 1024 203")}
        <h2>${name}</h2><p>${complete ? "Completado · bonus recibido" : `Validá ${goal} fotos de reciclaje`}</p>
        <div class="achievement-progress"><progress max="${goal}" value="${current}" aria-label="${name}: ${current} de ${goal}"></progress><span class="achievement-count">${current}/${goal}</span></div>
        <span class="achievement-reward reward-${colors[index % colors.length]}"><span>+${reward} XP</span></span>
        ${locked ? `<div class="achievement-lock" aria-hidden="true"><span class="achievement-padlock">🔒</span><span><strong>${name}</strong><small>Completá ${previousName}</small></span></div>` : ""}
      </${tag}>`;
    }).join("");
  }
  window.EcoQuestStorage.reconcileMissionRewards();
  render();
  window.addEventListener("pageshow", render);
  window.addEventListener("ecoquest:progress", render);
  window.addEventListener("storage", event => { if (event.key === window.EcoQuestStorage.progressKey || event.key === null) render(); });
})();

});