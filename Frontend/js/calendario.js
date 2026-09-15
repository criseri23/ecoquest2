window.EcoQuestReady.then(() => {
  const store = window.EcoQuestStorage, activity = window.EcoQuestActivity, rules = window.EcoQuestRules;
  const today = activity.today();
  let year = Number(today.slice(0,4)), month = Number(today.slice(5,7))-1;
  const requested = Number(new URLSearchParams(location.search).get('month'));
  if (requested >= 1 && requested <= 12) month = requested-1;
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const icons = [0,1,2,3,2,4,1,4,1,5,6,7,5,6,5,7,3,4,1,0,1,5,1,2,3,1,5,0,3,7,0];
  const art = (file,box,width,height,cls) => `<svg class="${cls}" viewBox="${box}" aria-hidden="true"><image href="../img/${file}" width="${width}" height="${height}"/></svg>`;
  function render() {
    const progress = store.readProgress(), summary = activity.summary(progress), prefix = `${year}-${String(month+1).padStart(2,'0')}`;
    const days = new Date(Date.UTC(year,month+1,0)).getUTCDate(), offset = (new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
    const completed = summary.challenges.filter(day => day.startsWith(prefix+'-')).length;
    document.querySelector('#monthName').textContent=names[month]; document.querySelector('#yearLabel').textContent=year;
    document.querySelector('#monthCount').textContent=`${completed} / ${days}`;
    const bar=document.querySelector('#monthProgress');bar.max=days;bar.value=completed;
    document.querySelector('#calendarDays').innerHTML='<span></span>'.repeat(offset)+Array.from({length:days},(_,i)=>{
      const day=i+1, key=`${prefix}-${String(day).padStart(2,'0')}`, done=summary.challenges.includes(key), icon=icons[i];
      return `<button class="calendar-day${key===activity.today()?' today':''}" data-day="${key}" aria-label="${day} de ${names[month]}: ${done?'completado':key===activity.today()?'desafío de hoy':key>activity.today()?'próximamente':'sin completar'}">${art('ChatGPT Image 14 sept 2026, 21_18_37.png','170 170 930 950',1254,1254,'tile-art')}<span class="day-number">${day}</span>${art('ChatGPT Image 14 sept 2026, 21_18_45.png',`${[75,425,785,1155][icon%4]} ${icon<4?185:530} 320 360`,1536,1024,'day-icon')}${done?'<span class="day-check">✓</span>':''}</button>`;
    }).join('');
    document.querySelector('#nextMessage').innerHTML=`Te faltan <b>${summary.remaining}</b> días de uso para tu próxima recompensa. Entrá cada día para mantenerla.`;
    document.querySelector('#nextXp').textContent=`+${summary.next.xp} XP`;
    document.querySelector('#rewardRules').innerHTML=`<p>Entrar a la app: +${rules.visitXp} XP una vez al día. Cada residuo validado: +${rules.recyclingXp} XP. Primer residuo validado del día: +${rules.challengeXp} XP extra y un desafío completado.</p><p>Rachas: ${rules.streakRewards.map(r=>`${r.days} días → +${r.xp} XP`).join('; ')}. Después, cada ${rules.repeatStreakDays} días: +${rules.repeatStreakXp} XP. Cada hito se cobra una sola vez.</p><p>Un nivel cada ${rules.levelXp} XP. Si no entrás un día, tu racha reinicia; conservás tus XP y logros. Se usa la fecha de Buenos Aires. ${window.EcoQuestAccount.profile?'Tu cuenta guarda el progreso en el servidor.':'Como invitado, el progreso queda en este navegador.'}</p>`;
  }
  function move(amount){month+=amount;if(month<0){month=11;year--}if(month>11){month=0;year++}render()}
  document.querySelector('#previousMonth').onclick=()=>move(-1);document.querySelector('#nextMonth').onclick=()=>move(1);
  const dialog=document.querySelector('#dayDialog');document.querySelector('#closeDay').onclick=()=>dialog.close();
  document.querySelector('#calendarDays').onclick=event=>{
    const button=event.target.closest('[data-day]');if(!button)return;
    const key=button.dataset.day, done=store.readProgress().activity.challenges.includes(key), current=key===activity.today();
    document.querySelector('#dayTitle').textContent=key.split('-').reverse().join('/');
    document.querySelector('#dayDescription').textContent=done?`Desafío completado. Los ${rules.challengeXp} XP extra ya se sumaron.`:current?`Escaneá y validá al menos un residuo en un punto compatible del mapa. Ganás ${rules.recyclingXp} XP por residuo y ${rules.challengeXp} XP extra por el desafío de hoy.`:key>activity.today()?'Este desafío estará disponible ese día.':'Este día terminó sin completar el desafío.';
    const action=document.querySelector('#dayAction');action.hidden=!current||done;action.style.display=action.hidden?'none':'block';dialog.showModal();
  };
  window.addEventListener('ecoquest:progress',render);window.addEventListener('storage',render);render();
});
