const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");

btnLogin.addEventListener("click", function () {
    try { sessionStorage.removeItem("ecoquestGuestMode"); } catch { }
    window.location.href = "login.html";
});

btnRegistro.addEventListener("click", function () {
    try { sessionStorage.removeItem("ecoquestGuestMode"); } catch { }
    window.location.href = "registro.html";
});

document.getElementById("btnGuest").addEventListener("click", function () {
    window.EcoQuestAccount.enterGuest();
    window.location.href = "inicio.html";
});
