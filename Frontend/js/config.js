window.EcoQuestReady.then(() => {
  const account = window.EcoQuestAccount;
  document.querySelector("#accountName").textContent = account.profile
    ? `Conectada como ${account.profile.name}`
    : "Estás usando EcoQuest como invitada. No se guardan tus datos ni tu progreso.";
  document.querySelector("#accountEnter").hidden = Boolean(account.profile);
  document.querySelector("#accountExit").hidden = !account.profile;
  document.querySelector("#accountExit").onclick = async () => {
    try {
      await account.logout();
    } catch (error) {
      const message = document.querySelector("#accountError");
      message.textContent = error.message;
      message.hidden = false;
    }
  };
});
