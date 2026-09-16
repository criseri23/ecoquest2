window.EcoQuestReady.then(() => {
  function renderMonths() {
    const today = window.EcoQuestActivity.today();
    const year = Number(today.slice(0,4));
    document.querySelectorAll('.home-level-link[data-month]').forEach(link => {
      const month = Number(link.dataset.month);
      const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0,10);
      const ended = today >= nextMonth;
      const name = link.querySelector('.home-month').textContent;
      link.href = `calendario.html?month=${month}&year=${year}`;
      // El visto indica que el mes terminó, no que todos los desafíos se hicieron.
      link.querySelector('.home-check').hidden = !ended;
      link.setAttribute('aria-label', `${name} ${year}: ${ended ? 'mes finalizado. ' : ''}Abrir calendario`);
    });
  }
  renderMonths();
  window.addEventListener('ecoquest:progress', renderMonths);
  window.addEventListener('focus', renderMonths);
  document.addEventListener('visibilitychange', renderMonths);
});
