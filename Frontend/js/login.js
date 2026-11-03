const formulario = document.getElementById('loginForm');
const mensaje = document.getElementById('mensaje');
formulario.addEventListener('submit', async event => {
  event.preventDefault();
  const boton = formulario.querySelector('button');
  boton.disabled = true;
  mensaje.textContent = 'Ingresando…';
  const identifier = formulario.elements.email.value.trim();
  const contraseña = formulario.elements.password.value;
  try {
    const datos = await window.EcoQuestAccount.request('/api/auth/login', {
      method: 'POST', body: JSON.stringify({email: identifier, contraseña})
    });
    window.EcoQuestAccount.save(datos);
    location.href = 'inicio.html';
  } catch (error) { mensaje.textContent = error.message; }
  finally { boton.disabled = false; }
});
