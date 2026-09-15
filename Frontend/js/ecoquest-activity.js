window.EcoQuestReady = window.EcoQuestReady.then(() => {
  const rules = window.EcoQuestRules;
  class Activity {
    static today() { return new Intl.DateTimeFormat('en-CA', {timeZone: rules.timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
    static previous(day) { const date = new Date(day+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()-1); return date.toISOString().slice(0,10); }
    static summary(progress, today = this.today()) {
      const activity = progress.activity || {}, visits = new Set(activity.visits || []);
      let cursor = visits.has(today) ? today : this.previous(today), streak = 0;
      while (visits.has(cursor)) { streak++; cursor = this.previous(cursor); }
      const claimed = activity.claimedStreakDays || [];
      const rewards = [...rules.streakRewards];
      for (let days = Math.max(...rules.streakRewards.map(reward => reward.days)) + rules.repeatStreakDays; days <= Math.max(streak, ...claimed, 30)+30; days += rules.repeatStreakDays) rewards.push({days, xp:rules.repeatStreakXp});
      const next = rewards.find(reward => !claimed.includes(reward.days));
      return {streak, rewards, next, remaining:Math.max(0,next.days-streak), claimed, visits:[...visits], challenges:activity.challenges || [], level:1+Math.floor(progress.totalPoints/rules.levelXp)};
    }
    static record(progress, challenge = false) {
      const today = this.today();
      const activity = progress.activity ||= {visits:[],challenges:[],claimedStreakDays:[]};
      let bonus = 0;
      if (!activity.visits.includes(today)) { activity.visits.push(today); bonus += rules.visitXp; }
      if (challenge && !activity.challenges.includes(today)) { activity.challenges.push(today); bonus += rules.challengeXp; }
      const summary = this.summary(progress);
      for (const reward of summary.rewards) if (summary.streak >= reward.days && !activity.claimedStreakDays.includes(reward.days)) {
        activity.claimedStreakDays.push(reward.days); bonus += reward.xp;
      }
      return bonus;
    }
  }
  window.EcoQuestActivity = Activity;
  const store = window.EcoQuestStorage;
  function render() {
    const progress = store.readProgress(), summary = Activity.summary(progress);
    for (const [selector,value] of [['[data-total-xp]',progress.totalPoints],['[data-level]',summary.level],['[data-streak]',summary.streak]]) document.querySelectorAll(selector).forEach(node => node.textContent = value);
  }
  let busy = false;
  async function visit() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      if (window.EcoQuestAccount.profile) await window.EcoQuestAccount.refresh();
      else { const progress = store.readProgress(), bonus = Activity.record(progress); if (bonus) { progress.totalPoints += bonus; store.writeProgress(progress); } }
      document.querySelector('#activityError')?.remove();
    } catch {
      if (!document.querySelector('#activityError')) { const node = document.createElement('p'); node.id='activityError'; node.textContent='No se pudo sincronizar la racha. Volvé a intentar con conexión.'; document.body.append(node); }
    } finally { busy = false; render(); }
  }
  window.addEventListener('ecoquest:progress',render);
  window.addEventListener('focus',visit);
  document.addEventListener('visibilitychange',visit);
  setInterval(visit,60000);
  visit(); render();
});
