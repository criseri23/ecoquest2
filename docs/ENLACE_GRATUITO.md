# Enlace gratuito para la exposición

La app se comparte con Cloudflare Quick Tunnel. No hay un plan pago ni hace falta subirla a una tienda.

El enlace de la sesión actual queda guardado en `.local-build/enlace-publico.txt`. La aplicación y las bases siguen en esta computadora: deben estar encendidos la PC, internet, la API y cloudflared. Si se cierra el túnel o se reinicia la PC, el enlace deja de funcionar. Al iniciar otro túnel se genera otra dirección; no es un alojamiento permanente.

Para volver a compartirla, desde la raíz del proyecto:

1. Iniciar la API si todavía no está funcionando:
   `dotnet run --project backend/EcoQuestAPI --urls http://localhost:5228`
2. En otra terminal ejecutar:
   `.\.local-build\cloudflared.exe tunnel --url http://localhost:5228 --no-autoupdate`
3. Copiar la dirección https://...trycloudflare.com que aparece y compartirla. Mantener ambos procesos abiertos.

Se verificó el enlace público en navegador: bienvenida, ingreso como invitado, los doce meses y conexión al ranking. Publicar la web no añade por sí solo la instalación como PWA: el proyecto todavía no contiene un manifiesto ni un service worker.

Fuente: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
