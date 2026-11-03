# EcoQuest

## Para iniciar

1. Abrí XAMPP y encendé **MySQL**. Apache solo hace falta para abrir phpMyAdmin.
2. En PowerShell, entrá a la carpeta del proyecto y ejecutá:

```powershell
dotnet run --project backend\EcoQuestAPI\EcoQuestAPI.csproj --launch-profile http
```

3. Abrí `http://localhost:5228/pages/click.html`.

La base de MySQL se llama `ecoquest`. En phpMyAdmin, abrí esa base y elegí la tabla `Usuarios` para ver las cuentas registradas. EcoQuest crea esa tabla al iniciar si todavía no existe.

## Qué se guarda

- En MySQL se guardan las cuentas y los datos necesarios para iniciar sesión.
- El progreso del juego, los escaneos, las misiones, el historial y el ranking son datos simulados mientras la aplicación está abierta. Se borran cuando se cierra o reinicia la API.
- Los puntos del mapa y las misiones se cargan desde los archivos del proyecto.

## Importante

MySQL debe estar encendido antes de iniciar EcoQuest. Si XAMPP tiene una contraseña configurada para `root`, actualizá la conexión `EcoQuestDb` en `EcoQuestAPI/appsettings.json`.
