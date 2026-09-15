// Las pantallas y el servidor leen las mismas reglas.
window.EcoQuestReady = fetch(window.EcoQuestAccount.apiOrigin + "/data/rewards.json")
  .then(response => { if (!response.ok) throw new Error("No se pudieron cargar las reglas de XP."); return response.json(); })
  .then(rules => { window.EcoQuestRules = rules; })
  .catch(error => { const message = document.createElement("p"); message.textContent = "No se pudo cargar el progreso. Abrí EcoQuest desde el servidor y recargá."; document.body.append(message); throw error; });
