const formulario = document.getElementById('registroForm');
const mensaje = document.getElementById('mensaje');
formulario.addEventListener('submit', async event => {
  event.preventDefault();
  const boton = formulario.querySelector('button');
  boton.disabled = true;
  mensaje.textContent = 'Creando cuenta…';
  try {
    const datos = await window.EcoQuestAccount.request('/api/auth/registro', {
      method: 'POST', body: JSON.stringify({nombre: formulario.elements.nombre.value, email: formulario.elements.email.value, contraseña: formulario.elements.password.value})
    });
    window.EcoQuestAccount.save(datos);
    location.href = 'inicio.html';
  } catch (error) { mensaje.textContent = error.message; }
  finally { boton.disabled = false; }
});
