# Ranking de CABA

El ranking usa una base SQLite propia (`EcoQuestAPI/ranking.db`, excluida de Git). No modifica las tablas anteriores. Se puede cambiar la ruta con `Ranking:DatabasePath`.

- Abrir `/pages/ranking.html`, crear perfil con nombre, contraseña, foto opcional y declaración de participación en CABA. Nombre y foto son públicos.
- Registro e ingreso generan sesiones de 30 días; contraseñas con PBKDF2 y sal aleatoria, tokens guardados como hashes en servidor. Registro e ingreso tienen límite de solicitudes por IP.
- Top 10 / Top 100 ordenados por XP descendente, con desempate por fecha de creación e ID. Podio vacío si faltan participantes. Actualización cada 30 segundos y al volver a la ventana.
- La foto se recorta en el navegador a JPEG de 192 px; puede cambiarse desde Ranking. El servidor limita formato y tamaño.
- Cada usuario tiene almacenamiento local separado. El XP de invitado no se importa a la cuenta: el ranking acepta únicamente escaneos registrados por la API con sesión iniciada y validados cerca de un contenedor del catálogo de CABA (150 m, precisión informada de hasta 150 m).
- La API calcula puntos y bonus de logros, consumiendo cada escaneo una sola vez en una transacción. No hay endpoint para enviar un total de XP arbitrario.

## Ejecución y límites

`dotnet run --project backend/EcoQuestAPI` sirve frontend y API. Todas las personas deben usar la misma instancia/URL para compartir ranking. Dos copias locales del proyecto tienen bases independientes. Para acceso remoto se requiere alojar esta instancia con HTTPS y almacenamiento persistente; respaldar la base y no subirla a Git.

La ubicación la informa el navegador: no es un sistema antifraude de GPS. No se agregó recuperación de contraseñas ni correo electrónico. SQLite y el Top 100 están indexados, pero no se realizó una prueba de carga de miles de usuarios.

## Verificación realizada

Base aislada de prueba: registro por interfaz, ingreso y contraseña incorrecta, nombres duplicados, fotos, rechazo de otra ciudad, orden del podio, tamaños móviles, autenticación requerida, distancia al contenedor, propiedad del escaneo y repetición de validaciones. Cuatro escaneos de 10 XP producen 90 XP (40 + 50 de logro) una sola vez. Los datos de prueba no se copian a la base de uso normal.
