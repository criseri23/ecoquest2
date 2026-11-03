document.querySelectorAll("[data-account-entry]").forEach(link => {
  link.addEventListener("click", () => {
    try { sessionStorage.removeItem("ecoquestGuestMode"); } catch { }
  });
});

document.getElementById("guestButton").addEventListener("click", () => {
  window.EcoQuestAccount.enterGuest();
  location.href = "inicio.html";
});
