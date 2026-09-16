window.EcoQuestReady.then(() => {
  const missions = window.EcoQuestMissions;
  const colors = ['bronze', 'green', 'gold', 'blue', 'purple', 'coral'];

  // Reciclaje y rachas usan la misma tarjeta, con progreso real.
  function card({name, description, current, goal, reward, complete, locked, previousName, href, index}) {
    const tag = locked || complete ? 'article' : 'a';
    const action = locked || complete ? 'aria-disabled="true"' : `href="${href}"`;
    return `<${tag} class="achievement-card${complete ? ' is-complete' : ''}${locked ? ' is-locked' : ''}" ${action} aria-label="${name}: ${current} de ${goal}. ${locked ? 'Bloqueado.' : complete ? 'Completado. Premio recibido.' : 'En progreso.'} ${reward} XP.">
      <svg class="achievement-art" viewBox="21 875 1024 203" preserveAspectRatio="none" aria-hidden="true"><image href="../img/Nombre de usuario (14).png" width="1080" height="1920"/></svg>
      <h2>${name}</h2><p>${complete ? 'Completado · bonus recibido' : description}</p>
      <div class="achievement-progress"><progress max="${goal}" value="${current}" aria-label="${name}: ${current} de ${goal}"></progress><span class="achievement-count">${current}/${goal}</span></div>
      <span class="achievement-reward reward-${colors[index % colors.length]}">+${reward} XP</span>
      ${locked ? `<div class="achievement-lock" aria-hidden="true"><span class="achievement-padlock">🔒</span><span><strong>${name}</strong><small>Completá ${previousName}</small></span></div>` : ''}
    </${tag}>`;
  }
  function render() {
    const progress = window.EcoQuestStorage.readProgress();
    const total = Math.max(0, Math.floor(progress.successfulScans));
    const summary = window.EcoQuestActivity.summary(progress);
    document.querySelector('#missionXp').textContent = progress.totalPoints;
    document.querySelector('#missionStreak').textContent = summary.streak;
    document.querySelector('#achievementsList').innerHTML = missions.map((mission, index) => card({
      ...mission, index, current: Math.min(total, mission.goal), complete: progress.completedMissionIds.includes(mission.id),
      description: `Validá ${mission.goal} fotos de reciclaje`, locked: index > 0 && total < missions[index - 1].goal,
      previousName: missions[index - 1]?.name, href: 'escanear.html'
    })).join('');
    document.querySelector('#streakAchievements').innerHTML = '<header class="streak-heading"><h2>Logros de racha</h2><a href="calendario.html">Ver mi calendario</a></header><div class="achievements-list">' + summary.rewards.map((reward, index) => {
      const complete = summary.claimed.includes(reward.days);
      return card({name: `Racha de ${reward.days} días`, description: `Entrá ${reward.days} días seguidos`, current: complete ? reward.days : Math.min(summary.streak, reward.days), goal: reward.days,
        reward: reward.xp, complete, locked: !complete && index > 0 && !summary.claimed.includes(summary.rewards[index - 1].days),
        previousName: `la racha de ${summary.rewards[index - 1]?.days} días`, href: 'calendario.html', index});
    }).join('') + '</div>';
  }
  window.EcoQuestStorage.reconcileMissionRewards();
  render();
  window.addEventListener('ecoquest:progress', render);
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', render);
});
