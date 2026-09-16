const formulario = document.getElementById('loginForm');
const mensaje = document.getElementById('mensaje');
formulario.addEventListener('submit', async event => {
  event.preventDefault();
  const boton = formulario.querySelector('button');
  boton.disabled = true;
  mensaje.textContent = 'Ingresando…';
  const email = formulario.elements.email.value.trim();
  const contraseña = formulario.elements.password.value;
  // Las cuentas anteriores todavía pueden entrar por su nombre.
  const anterior = !email.includes('@');
  try {
    const datos = await window.EcoQuestAccount.request(anterior ? '/api/ranking/login' : '/api/auth/login', {
      method: 'POST', body: JSON.stringify(anterior ? {name: email, password: contraseña} : {email, contraseña})
    });
    window.EcoQuestAccount.save(datos);
    location.href = 'inicio.html';
  } catch (error) { mensaje.textContent = error.message; }
  finally { boton.disabled = false; }
});
