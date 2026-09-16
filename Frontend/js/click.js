document.getElementById('startButton').addEventListener('click', () => {
  location.href = window.EcoQuestAccount.profile ? 'inicio.html' : 'elegir.html';
});
