# Datos y ranking de EcoQuest

EcoQuest usa la base MySQL local `ecoquest` de XAMPP para las cuentas, el ranking, el progreso y los escaneos asociados a cuentas. El frontend y la API se sirven con `dotnet run --project backend/EcoQuestAPI` en `http://localhost:5228`.

## Ver la base

1. Iniciá Apache y MySQL en XAMPP.
2. Abrí `http://localhost/phpmyadmin/` y seleccioná `ecoquest`.
3. `Usuarios` contiene las cuentas de registro; `RankingUsers`, `RankingScans`, `RankingScanDetails`, `RankingHistory`, `RankingDays` y `RankingRewards` contienen el perfil y su progreso.

En el primer inicio, EcoQuest copia los datos existentes de `EcoQuestAPI/ecoquest.db` y `EcoQuestAPI/ranking.db` a MySQL. La tabla `EcoQuestSqliteImports` registra qué tablas ya se importaron, así no se vuelven a copiar cada vez que arranca. Los dos archivos SQLite originales se conservan sin cambios como respaldo.

## Cómo se guarda el progreso

- Las cuentas registradas, sesiones, XP, misiones, actividad diaria, escaneos pendientes e historial se leen y escriben en MySQL.
- El modo invitado inicia con 0 XP; no crea un perfil de ranking ni guarda escaneos, rachas o progreso en MySQL o en el navegador.
- El servidor calcula los puntos al validar escaneos cerca de un contenedor del catálogo de CABA. Una validación no puede repetirse para reclamar XP de nuevo.
- Los nombres y las fotos del ranking son visibles en el ranking. Las contraseñas se guardan con hash; las sesiones guardan tokens con hash.

## Ejecución local

Mantené MySQL de XAMPP encendido antes de iniciar la API. La configuración local usa el usuario `root` sin contraseña, como viene XAMPP por defecto; si cambiaste esa contraseña, actualizá `ConnectionStrings:EcoQuestDb` en `EcoQuestAPI/appsettings.json`.

Para ver los datos en phpMyAdmin, elegí la base `ecoquest`; la base `ecoquest_consulta_20261029` es solo una copia de consulta anterior y no se sincroniza.
