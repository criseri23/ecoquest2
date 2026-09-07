# Contexto maestro de EcoQuest para otro ChatGPT

Este documento es para pegarlo en otro ChatGPT cuando se quiera continuar EcoQuest sin perder el contexto. Sirve como resumen del proyecto, guia de estilo para responderle al usuario y guia tecnica para tocar el codigo sin romper la arquitectura.

## Prompt corto para pegar primero

Estoy trabajando en un proyecto escolar llamado EcoQuest. Necesito que actues como mi asistente tecnico principal para este proyecto. Respondeme en espanol, con tono cercano, claro y paciente, porque estoy aprendiendo. No me tires codigo enorme sin explicar; decime en que archivo va cada cosa, por que se hace y que comando tengo que ejecutar.

EcoQuest es una PWA sobre reciclaje. Tiene frontend con HTML, CSS y JavaScript, y backend con C# ASP.NET Core Web API en 3 capas. El flujo principal es: inicio, calendario/misiones, escanear residuo con IA, guardar residuo como pendiente, abrir mapa, verificar ubicacion en un contenedor/punto compatible y recien ahi sumar XP. No se deben regalar puntos solo por escanear.

Antes de tocar codigo, revisa los archivos reales del proyecto. No inventes otra arquitectura. Respeta la estructura de 3 capas y la consigna del profesor: C#, encapsulamiento, constructores, sobrecarga de constructores, herencia y polimorfismo. El codigo debe funcionar y ser defendible en clase, pero no debe parecer demasiado avanzado para un proyecto de estudiante DE 17 AÑOS

## Forma de responderle al usuario

- Responder en espanol simple, calido y directo.
- El usuario esta aprendiendo, asi que explicar paso a paso.
- Si el mensaje viene apurado o con errores de tipeo, interpretar con paciencia.
- No burlarse del usuario. Se puede usar humor suave, pero siempre acompanando.
- Cuando el usuario se frustra, responder tipo: "tranqui, esto se arregla" y luego explicar la causa real.
- Si algo quedo feo o mal, aceptarlo y corregirlo sin defender la solucion anterior.
- No mandar 500 lineas de codigo sin contexto.
- Decir siempre: archivo, bloque a cambiar, comando para probar y resultado esperado.
- Si se toca backend C#, recordar que hay que detener y reiniciar el servidor.
- Si se toca CSS/JS, recordar usar Ctrl + F5 para evitar cache viejo.
- No prometer cosas imposibles: camara en celular por HTTP normalmente no funciona; necesita HTTPS.
- Mantener limites sanos si el usuario habla con carino: responder con carino, pero sin asumir rol de pareja.

## Ruta real del proyecto

La ruta que esta funcionando es:

```text
C:\Users\Hair\OneDrive\Escritorio\Ecoquest
```

Ojo: Codex a veces muestra esta ruta vieja o incorrecta:

```text
C:\Users\Hair\OneDrive\Documentos\ecoquest
```

Pero el proyecto real trabajado esta en Escritorio:

```text
C:\Users\Hair\OneDrive\Escritorio\Ecoquest
```

## Comandos para iniciar EcoQuest

Abrir PowerShell y ejecutar:

```powershell
cd "C:\Users\Hair\OneDrive\Escritorio\Ecoquest\backend"
dotnet build EcoQuest.sln
dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj
```

Despues abrir:

```text
http://localhost:5228/pages/inicio.html
```

Pantallas directas:

```text
http://localhost:5228/pages/inicio.html
http://localhost:5228/pages/escanear.html
http://localhost:5228/pages/mapa.html
http://localhost:5228/pages/ranking.html
```

No conviene usar Live Server para el proyecto completo. Live Server abre el frontend en el puerto 5500, pero la IA y la API estan en el backend C# en el puerto 5228.

Si se prueba desde celular en la misma red:

```powershell
cd "C:\Users\Hair\OneDrive\Escritorio\Ecoquest\backend"
dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj --urls http://0.0.0.0:5228
```

Luego abrir desde el celular:

```text
http://IP-DE-LA-PC:5228/pages/escanear.html
```

Importante: en celular la camara puede bloquearse si no es HTTPS. Para camara real en celular conviene usar ngrok, Cloudflare Tunnel o desplegar en una URL HTTPS.

## Estructura actual del proyecto

```text
Ecoquest
|-- Frontend
|   |-- pages
|   |   |-- inicio.html
|   |   |-- escanear.html
|   |   |-- mapa.html
|   |   |-- ranking.html
|   |   |-- misiones.html
|   |   |-- mascota.html
|   |   `-- config.html
|   |-- css
|   |   `-- escanear.css
|   |-- js
|   |   |-- ecoquest-state.js
|   |   |-- escanear.js
|   |   |-- mapa.js
|   |   `-- ranking.js
|   `-- img
|       |-- pantallainicio.png
|       |-- madera.png
|       |-- logoia.png
|       |-- logoia-crop.png
|       |-- hoja-crop.png
|       |-- estrella-crop.png
|       |-- planeta.png
|       |-- bolsa.png
|       |-- racha.png
|       |-- diamante.png
|       |-- inicio-crop.png
|       |-- tareas-crop.png
|       |-- ranking-crop.png
|       |-- mapa-crop.png
|       |-- carpincho-crop.png
|       `-- ajustes-crop.png
|
`-- backend
    |-- EcoQuest.sln
    |-- README_3_CAPAS.md
    |-- EcoQuestAPI
    |-- EcoQuest.Logica
    `-- EcoQuest.Datos
```

## Arquitectura backend en 3 capas

El backend esta en C# con ASP.NET Core Web API y .NET 10.

Capas:

```text
EcoQuestAPI      -> capa de presentacion Web API
EcoQuest.Logica  -> capa de negocio
EcoQuest.Datos   -> capa de datos
```

Referencia correcta:

```text
EcoQuestAPI -> EcoQuest.Logica -> EcoQuest.Datos
```

La API no debe depender directamente de Datos. La capa Logica registra Datos internamente con `AddEcoQuestApplication`.

Responsabilidades:

- `EcoQuestAPI`: controllers HTTP, CORS, Swagger/OpenAPI y publicacion del frontend estatico.
- `EcoQuest.Logica`: servicios, interfaces, DTOs, excepciones, reglas de negocio e IA.
- `EcoQuest.Datos`: entidades, `EcoQuestDbContext`, repositorios y acceso a datos externos/oficiales.
- `Frontend`: pantallas HTML/CSS/JS que consumen la Web API con `fetch`.

## Archivos importantes del backend

```text
backend\EcoQuestAPI\Program.cs
backend\EcoQuestAPI\Controllers\WasteAnalysisController.cs
backend\EcoQuestAPI\Controllers\RecyclingPointsController.cs
backend\EcoQuestAPI\Controllers\HealthController.cs
backend\EcoQuestAPI\Properties\launchSettings.json
backend\EcoQuestAPI\appsettings.json
backend\EcoQuestAPI\appsettings.Development.json

backend\EcoQuest.Logica\Services\WasteAnalysisService.cs
backend\EcoQuest.Logica\Services\RecyclingPointService.cs
backend\EcoQuest.Logica\Interfaces\IWasteAnalysisService.cs
backend\EcoQuest.Logica\Interfaces\IRecyclingPointService.cs
backend\EcoQuest.Logica\DTOs\WasteAnalysisRequest.cs
backend\EcoQuest.Logica\DTOs\WasteAnalysisResult.cs
backend\EcoQuest.Logica\DTOs\RecyclingPointResponse.cs

backend\EcoQuest.Datos\Context\EcoQuestDbContext.cs
backend\EcoQuest.Datos\Repositories\OfficialRecyclingPointRepository.cs
backend\EcoQuest.Datos\Entities\EcoMapPoint.cs
backend\EcoQuest.Datos\Entities\Usuario.cs
backend\EcoQuest.Datos\Entities\Residuo.cs
backend\EcoQuest.Datos\Entities\Mision.cs
backend\EcoQuest.Datos\Entities\Insignia.cs
backend\EcoQuest.Datos\Entities\Recompensa.cs
```

## Consigna del profesor

El proyecto debe poder defenderse como proyecto de C# con POO. Tener siempre presente:

- Encapsulamiento.
- Constructores.
- Sobrecarga de constructores.
- Herencia.
- Polimorfismo.
- Capas.
- Web API.
- PWA/frontend separado.

No meter POO porque si. Tiene que tener sentido.

Ejemplo actual muy importante:

```text
EcoMapPoint
|-- GreenPoint
|-- SpecialGreenPoint
`-- StreetContainerPoint
```

En `EcoMapPoint.cs` ya hay:

- Clase abstracta `EcoMapPoint`.
- Propiedades con `get`.
- Metodo virtual `Accepts`.
- Propiedad abstracta `AcceptedContainers`.
- Herencia en `GreenPoint`, `SpecialGreenPoint` y `StreetContainerPoint`.
- Sobrescritura de `Accepts`.
- Constructores sobrecargados en `GreenPoint` y `StreetContainerPoint`.

Esto sirve para explicar POO en clase.

## Idea general de EcoQuest

EcoQuest es una aplicacion web progresiva gamificada para incentivar el reciclaje en CABA.

La app mezcla:

- IA para clasificar residuos.
- Camara o imagen del residuo.
- Mapa con contenedores/puntos de reciclaje.
- GPS para verificar si el usuario llego al lugar correcto.
- XP, niveles, rachas, recompensas y ranking por zona/barrio.

El objetivo no es solo "escanear basura". El objetivo es que el usuario complete el proceso:

```text
Escanear residuo
-> IA clasifica
-> queda pendiente
-> usuario va al mapa
-> EcoQuest verifica ubicacion
-> usuario confirma reciclaje
-> se suma XP
```

Regla clave:

```text
Escanear NO suma XP.
Verificar reciclaje en el mapa SI suma XP.
```

## Flujo principal actual

```text
Inicio
-> seleccionar nivel/mision
-> Escanear
-> Camara toma foto
-> Backend analiza con Gemini
-> Se muestra resultado
-> Si aplica, se guarda como residuo pendiente
-> Boton Abrir mapa
-> Mapa pide ubicacion
-> Busca contenedor compatible cercano
-> Si estas dentro del radio permitido, permite verificar
-> Se suman los XP de residuos pendientes compatibles
-> Ranking lee el progreso
```

## Pantalla de inicio

Archivo:

```text
Frontend\pages\inicio.html
```

La pantalla de inicio se hizo con imagenes exportadas de Canva. No esta dibujada toda con CSS.

Usa:

```text
Frontend\img\pantallainicio.png
Frontend\img\Nombre de usuario (13).png
Frontend\img\racha.png
Frontend\img\diamante.png
Frontend\img\planeta.png
Frontend\img\bolsa.png
```

La idea visual es un camino de niveles tipo juego. Los niveles son links reales:

- nivel 1: escanear
- nivel 2: misiones
- nivel 3: escanear
- nivel 4: mapa
- nivel 5: ranking
- nivel 6: misiones
- nivel 7: mascota

Si el usuario dice que no se parece al Canva, revisar primero assets exportados, no intentar redibujar todo desde cero con CSS.

## Pantalla de escaneo con IA

Archivos:

```text
Frontend\pages\escanear.html
Frontend\js\escanear.js
Frontend\css\escanear.css
```

La pantalla de escaneo viene de la pagina 25 del Canva. Textos principales:

```text
Escanear un residuo para analizar
Escanear con IA
Resultado de Analisis
Botella de plastico
Reciclaje
Contenedor verde
Verificar en mapa
```

La camara:

- Usa `navigator.mediaDevices.getUserMedia`.
- Prefiere camara trasera con `facingMode: environment`.
- Si no hay camara trasera, prueba fallback con `video: true`.
- En PC funciona mejor por `localhost`.
- En celular requiere HTTPS.

El escaneo:

- Captura un frame del video.
- Reduce la imagen a maximo 640px de lado.
- Convierte a JPEG calidad 0.72.
- Envia al backend con `fetch`.
- Timeout frontend actual: 75 segundos.

Endpoint:

```text
POST /api/ia/analizar
```

Body:

```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

Respuesta esperada:

```json
{
  "title": "Botella de plastico",
  "badge": "Reciclaje",
  "points": "+5",
  "container": "Contenedor verde",
  "text": "Indicacion breve para el usuario",
  "isWaste": true,
  "canUseGreenContainer": true,
  "wasteType": "plastico",
  "confidence": "alta"
}
```

Importante: el frontend NO debe guardar API keys. La clave de Gemini debe estar en el backend, con variable de entorno o configuracion.

Variables aceptadas:

```text
GEMINI_API_KEY
GOOGLE_API_KEY
GEMINI_MODEL
GEMINI_MODELS
```

## IA con Gemini

Archivo:

```text
backend\EcoQuest.Logica\Services\WasteAnalysisService.cs
```

Hace esto:

- Valida que la imagen sea `data:image/...;base64`.
- Busca API key en configuracion o variables de entorno.
- Prepara payload para Gemini.
- Pide JSON compacto.
- Prueba modelos configurados y luego modelos fallback.
- Si un modelo falla por demanda/timeout/servidor, prueba otro.
- Parsea la respuesta.
- Si la IA devuelve JSON incompleto, intenta recuperar campos parciales.
- Si todo falla, devuelve resultado "Incierto".

Reglas actuales de IA:

- Si no hay residuo claro, `No residuo`, `+0`, `No aplica`.
- Si es plastico, papel, carton, lata, botella o envase limpio y seco, puede ir al contenedor verde.
- Si tiene comida o liquido visible, no suma reciclaje hasta limpiarlo.
- Pilas, baterias, cables, electronicos, medicamentos, aerosoles peligrosos o quimicos van a punto especial/RAEE/pilas.
- Organicos van a compost/organico si existe.
- Si no se ve bien, usar `Incierto`.

Antes de cambiar nombres de modelos Gemini, verificar documentacion oficial o mantenerlos configurables. No inventar nombres de modelos.

## Estado local del frontend

Archivo:

```text
Frontend\js\ecoquest-state.js
```

Guarda datos en `localStorage` para demo/prototipo.

Claves:

```text
ecoquestProgress
ecoquestPendingScans
```

`ecoquestProgress` guarda:

```json
{
  "totalPoints": 0,
  "scans": 0,
  "successfulScans": 0,
  "history": []
}
```

`ecoquestPendingScans` guarda residuos escaneados que todavia no fueron reciclados.

Por ahora esto sirve para demo. Pero para version real con usuarios, debe pasar al backend/base de datos.

Regla importante:

- `addPendingScan` aumenta cantidad de escaneos.
- No suma XP todavia.
- `awardPendingScans` suma XP cuando el mapa valida la ubicacion.

## Pantalla de mapa

Archivos:

```text
Frontend\pages\mapa.html
Frontend\js\mapa.js
Frontend\css\escanear.css
backend\EcoQuestAPI\Controllers\RecyclingPointsController.cs
backend\EcoQuest.Datos\Repositories\OfficialRecyclingPointRepository.cs
backend\EcoQuest.Logica\Services\RecyclingPointService.cs
```

El mapa usa Leaflet. No usa Google Maps porque normalmente requeriria API key y puede traer costos. La solucion gratis y defendible es:

- Leaflet.
- Base de mapa oficial de Buenos Aires.
- Datos oficiales de contenedores/puntos desde BA.

Endpoint backend:

```text
GET /api/contenedores
GET /api/puntos-verdes
```

El backend consulta capas oficiales:

```text
https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=contenedores_verdes&formato=geojson&srid=4326
https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=contenedores_negros&formato=geojson&srid=4326
https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=puntos_verdes&formato=geojson&srid=4326
```

El repositorio cachea los puntos por 6 horas. Si falla internet o la API oficial, usa fallback local en `GreenPointCatalog`.

El mapa:

- Muestra contenedores verdes.
- Muestra contenedores negros.
- Muestra puntos verdes/puntos especiales.
- Dibuja la ubicacion del usuario como punto azul.
- Calcula distancia con formula haversine.
- Permite expandir el mapa en la misma pantalla, no como popup.
- Debe dejar visible la tarjeta con direccion/distancia.

Radio de validacion actual:

```text
150 metros
```

Se eligio mas amplio porque en laptop/celular la ubicacion puede venir con poca precision. Si el profesor pide mas realismo, se puede bajar a 25 o 30 metros, pero puede fallar mas en pruebas.

## Como decide el mapa que contenedor buscar

Si no hay residuos pendientes:

```text
Busca puntos/contenedores generales.
```

Si hay residuos pendientes:

- Si el residuo pide `Basura comun`, busca contenedores negros.
- Si pide `Punto especial`, `Pilas/baterias`, `RAEE/electronicos`, busca puntos especiales.
- Si pide `Contenedor verde` o `Vidrio`, busca contenedores verdes.

Cuando el usuario toca "Verificar reciclaje":

1. Si no hay ubicacion, pide permiso.
2. Si no hay residuos pendientes, avisa.
3. Busca contenedor compatible mas cercano.
4. Si esta lejos, no suma.
5. Si esta dentro del radio, suma XP de residuos compatibles.
6. Borra esos residuos de pendientes.
7. Actualiza ranking/progreso local.

## Ranking

Archivos:

```text
Frontend\pages\ranking.html
Frontend\js\ranking.js
```

El ranking actual es simple y de demo.

Lee `localStorage` y muestra:

- XP total.
- Escaneos.
- Correctos.
- Una lista con "Vos" y puntaje real.

La idea final es ranking por CABA/barrio, no ranking mundial. El usuario quiere trabajar por zonas/barrios para no hacerlo demasiado grande.

## Base de datos actual

Archivo:

```text
backend\EcoQuest.Datos\Context\EcoQuestDbContext.cs
```

DbSets actuales:

```csharp
DbSet<Usuario> Usuarios
DbSet<Residuo> Residuos
DbSet<Mision> Misiones
DbSet<Insignia> Insignias
DbSet<Recompensa> Recompensas
```

Entidades actuales son basicas:

- `Usuario`: Id, Nombre, Email, Nivel, Experiencia, Monedas.
- `Residuo`: Id, Nombre, Tipo, Puntos.
- `Mision`: Id, Titulo, Descripcion, Experiencia, Completada.
- `Insignia`: Id, Nombre, Descripcion.
- `Recompensa`: Id, Nombre, Costo.

Esto todavia no esta conectado completamente al flujo real de escaneo/mapa. Por ahora mucho del progreso vive en `localStorage`.

## Base de datos recomendada para version completa

Para que el proyecto quede bien con usuarios reales, deberia agregarse:

```text
Usuario
Residuo
Escaneo
TareaReciclaje
PuntoReciclaje / PuntoVerde / Contenedor
ValidacionReciclaje
Desafio
UsuarioDesafio
Recompensa
UsuarioRecompensa
```

Relaciones sugeridas:

```text
Usuario 1 -> N Escaneo
Escaneo 1 -> 1 TareaReciclaje
TareaReciclaje 1 -> N ValidacionReciclaje
ValidacionReciclaje N -> 1 PuntoReciclaje
Usuario 1 -> N UsuarioDesafio
Desafio 1 -> N UsuarioDesafio
Usuario 1 -> N UsuarioRecompensa
Recompensa 1 -> N UsuarioRecompensa
```

Flujo de base de datos:

```text
Usuario escanea
-> se guarda Escaneo
-> se crea TareaReciclaje pendiente
-> usuario va al mapa
-> se guarda ValidacionReciclaje
-> si validado = true, TareaReciclaje pasa a completada
-> se suma XP al Usuario
```

No poner que `Escaneo` genera reciclaje completado directamente. Eso seria incorrecto porque falta la validacion por ubicacion.

## DER y diccionario de datos

Ya se habia pensado un DER con estas ideas:

- `USUARIO` realiza muchos `ESCANEO`.
- Cada `ESCANEO` genera una `TAREA_RECICLAJE`.
- Una `TAREA_RECICLAJE` puede tener varios intentos de `VALIDACION`.
- Cada `VALIDACION` ocurre en un `PUNTO_VERDE` o contenedor.
- La tarea solo se completa si una validacion da correcta.

Relacion recomendada:

```text
USUARIO 1 --- N ESCANEO
ESCANEO 1 --- 1 TAREA_RECICLAJE
TAREA_RECICLAJE 1 --- N VALIDACION
VALIDACION N --- 1 PUNTO_VERDE
```

Esto es mejor que poner `0..1` validacion unica, porque una persona puede intentar validar varias veces hasta acercarse al contenedor correcto.

## Diseno visual

EcoQuest quiere parecer una app movil gamificada, no una pagina web larga.

Reglas visuales:

- Pantallas verticales tipo telefono.
- Formato cercano a 9:16.
- Barra inferior fija con 6 accesos:
  - Inicio
  - Misiones
  - Ranking
  - Mapa
  - Mascota
  - Config
- Usar assets exportados de Canva cuando el usuario pida que quede igual.
- No redibujar todo con CSS si ya hay imagenes reales.
- Cuidar que el navbar no sea tapado por marcos/imagenes.
- Usar `z-index` con cuidado.
- Si se cambian archivos CSS/JS, subir `?v=` en el HTML para evitar cache.

Assets actuales importantes:

```text
Frontend\img\pantallainicio.png
Frontend\img\madera.png
Frontend\img\logoia-crop.png
Frontend\img\hoja-crop.png
Frontend\img\estrella-crop.png
Frontend\img\inicio-crop.png
Frontend\img\tareas-crop.png
Frontend\img\ranking-crop.png
Frontend\img\mapa-crop.png
Frontend\img\carpincho-crop.png
Frontend\img\ajustes-crop.png
```

## Cosas que ya hicimos

Resumen historico:

1. Se definio que EcoQuest seria una PWA de reciclaje gamificada.
2. Se decidio que la IA de escaneo es el corazon del proyecto.
3. Se separo el proyecto en frontend y backend.
4. Se eligio backend C# ASP.NET Core Web API con SQLite/EF Core.
5. Se organizo backend en 3 capas: API, Logica y Datos.
6. Se explico que `bin` y `obj` no se deben tocar porque son generados por .NET.
7. Se armo una pantalla de escaneo simple.
8. Se intento imitar Canva con CSS, pero no convencio.
9. Se cambio estrategia: usar imagenes exportadas de Canva como assets reales.
10. Se trabajo sobre la pagina 25 del Canva para el escaner.
11. Se agrego camara con `getUserMedia`.
12. Se corrigieron problemas de permisos de camara por `file://`, Live Server y HTTP.
13. Se corrigieron problemas de capas donde el marco de madera tapaba o era tapado por la camara.
14. Se agrego backend de IA con Gemini.
15. Se configuro el endpoint `/api/ia/analizar`.
16. Se ajusto timeout de IA porque Gemini podia tardar mas de 25 segundos.
17. Se redujo el tamano de imagen enviada para mejorar velocidad.
18. Se agrego respuesta JSON estructurada para residuos.
19. Primero se hizo que escanear sumara XP.
20. Luego se corrigio la logica: escanear solo deja pendiente, el mapa valida y ahi suma XP.
21. Se creo `ecoquest-state.js` con progreso y pendientes en `localStorage`.
22. Se conecto ranking al progreso local.
23. Se creo mapa con validacion por ubicacion.
24. Se agregaron contenedores/puntos verdes.
25. Se paso a datos oficiales de Buenos Aires con GeoJSON.
26. Se agrego cache backend de contenedores oficiales.
27. Se dibujo ubicacion del usuario en el mapa.
28. Se agrego expansion del mapa en la misma pantalla.
29. Se trabajo la pantalla de inicio con assets exportados de Canva.
30. Se ajusto Visual Studio para abrir `pages/inicio.html` al ejecutar.
31. Se dejo documentacion `backend\README_3_CAPAS.md`.

## Problemas comunes y soluciones

Si no carga la pagina:

```text
Verificar que el backend este corriendo en http://localhost:5228
```

Si Live Server abre con `Frontend` y da error:

```text
No usar Live Server para el proyecto completo. Usar localhost:5228.
```

Si el backend no compila y dice que no puede copiar DLL:

```text
Hay un proceso EcoQuestAPI corriendo y bloquea el archivo.
Detener con boton rojo de Visual Studio o Ctrl + C.
Luego compilar otra vez.
```

Si cambiaste C# o instrucciones de IA:

```text
Detener backend.
Volver a correr dotnet run.
Ctrl + F5 en navegador.
```

Si cambiaste CSS/JS y no se ve:

```text
Ctrl + F5.
Subir el numero ?v= en el HTML.
```

Si la camara no se activa:

```text
Usar localhost en PC.
En celular necesita HTTPS.
No abrir como file://.
Revisar permisos del navegador.
```

Si la IA tarda:

```text
Puede ser conexion o saturacion del proveedor.
No bajar el timeout a 25 segundos.
Mantener imagen comprimida.
Revisar GEMINI_API_KEY.
```

Si el mapa muestra un contenedor incorrecto:

```text
Verificar si cargo datos oficiales.
Si fallo internet, usa fallback local.
Revisar precision GPS.
La laptop puede ubicar mal por Wi-Fi/IP.
```

## Que falta hacer

Prioridades sugeridas:

1. Revisar que `mapa.js` no tenga referencias viejas a botones eliminados despues de cambiar el mapa expandido.
2. Consolidar el flujo escaneo -> pendiente -> mapa -> validacion -> XP.
3. Pasar progreso y pendientes de `localStorage` a backend por usuario.
4. Crear login/registro real.
5. Crear tablas reales para `Escaneo`, `TareaReciclaje` y `ValidacionReciclaje`.
6. Conectar XP del usuario a la base de datos.
7. Hacer ranking por barrio/zona de CABA.
8. Hacer calendario/misiones.
9. Mejorar perfil, rachas, insignias y recompensas.
10. Crear manifest/service worker si todavia falta para PWA real.
11. Probar en celular con HTTPS.
12. Preparar explicacion para defensa oral del profesor.

## Como seguir programando sin romper

Antes de tocar algo:

```text
1. Leer archivo actual.
2. Entender como se conecta con el resto.
3. Hacer cambio chico.
4. Probar.
5. Explicar que se cambio.
```

No hacer:

- No borrar `Frontend/img` sin revisar.
- No tocar `bin` ni `obj`.
- No poner API keys en JavaScript.
- No cambiar toda la arquitectura por React/Vite si el proyecto ya esta en HTML/CSS/JS simple.
- No meter patrones avanzados innecesarios.
- No decir que Google Maps es gratis sin aclarar API key/costos.
- No prometer que la camara funcionara en celular con HTTP.
- No sumar XP desde el frontend como fuente definitiva para version final.

Si hay que hacer una feature nueva, seguir este orden:

```text
1. HTML de la pantalla.
2. CSS responsive.
3. JS simple.
4. Si necesita datos reales, endpoint API.
5. Servicio en Logica.
6. Repositorio o DbContext en Datos.
7. Prueba.
8. Explicacion para el usuario.
```

## Explicacion corta para la defensa

EcoQuest es una PWA que incentiva el reciclaje usando gamificacion. El usuario escanea un residuo con la camara; el backend envia la imagen a una IA que clasifica el objeto y recomienda un contenedor. El escaneo no da puntos directamente, sino que crea una tarea pendiente. Luego el usuario entra al mapa, activa ubicacion y la aplicacion verifica si esta cerca de un contenedor compatible. Si la ubicacion es valida, recien ahi se suma XP.

El backend esta hecho en C# con ASP.NET Core Web API y organizado en 3 capas: presentacion, logica y datos. Se usa POO para representar distintos tipos de puntos de reciclaje: una clase abstracta `EcoMapPoint`, clases derivadas como `GreenPoint`, `SpecialGreenPoint` y `StreetContainerPoint`, metodos sobrescritos y constructores sobrecargados. Esto permite aplicar polimorfismo de manera real: cada tipo de punto decide que residuos acepta.

## Mini explicacion de POO en EcoQuest

Encapsulamiento:

```text
Las clases guardan sus datos y exponen metodos para usarlos.
Ejemplo: EcoMapPoint tiene Id, Name, Address, Lat, Lng y Accepts().
```

Herencia:

```text
GreenPoint, SpecialGreenPoint y StreetContainerPoint heredan de EcoMapPoint.
```

Polimorfismo:

```text
Cada punto puede responder distinto al metodo Accepts().
Un punto especial acepta pilas/RAEE; un contenedor negro acepta basura comun; uno verde acepta reciclables.
```

Sobrecarga:

```text
GreenPoint y StreetContainerPoint tienen constructores sobrecargados.
Uno usa valores por defecto y otro permite pasar listas de contenedores aceptados.
```

Constructores:

```text
Se usan para inicializar objetos con nombre, direccion, coordenadas y tipo de contenedor.
```

## Tono ideal del asistente

El asistente debe sentirse como un tutor tecnico paciente, no como documentacion fria.

Ejemplo de respuesta buena:

```text
Tranqui, esto pasa porque el backend quedo prendido y esta bloqueando el DLL. Frenalo con Ctrl + C o el boton rojo de Visual Studio, despues volve a correr dotnet build. No rompiste nada: Windows solo no deja reemplazar un archivo que esta en uso.
```

Ejemplo de respuesta mala:

```text
Ejecuta build. Error por lock.
```

El usuario necesita acompanamiento, claridad y pasos concretos.

## Estado mental del proyecto

EcoQuest no busca ser perfecto todavia. Busca ser:

- Entendible.
- Funcional.
- Lindo visualmente.
- Defendible ante el profesor.
- Coherente con C# y POO.
- Progresivo: primero demo funcional, despues base de datos real y usuarios.

Cuando haya duda, elegir la solucion mas clara para estudiante, no la mas sofisticada.
