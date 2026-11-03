# EcoQuest: inicio y base de datos

## Antes de iniciar

- Windows con [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0).
- XAMPP instalado. Iniciá **MySQL** para conectar EcoQuest; iniciá también **Apache** si vas a abrir phpMyAdmin.
- Una base MySQL llamada `ecoquest`. En esta computadora ya existe. En una instalación nueva, abrí phpMyAdmin y ejecutá una sola vez:

```sql
CREATE DATABASE ecoquest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

La configuración local espera `127.0.0.1:3306`, base `ecoquest`, usuario `root` y contraseña vacía (valor inicial común de XAMPP). Si cambiaste la contraseña, actualizá `ConnectionStrings:EcoQuestDb` en `backend/EcoQuestAPI/appsettings.json` y `appsettings.Development.json`. No subas contraseñas ni claves a Git.

## Iniciar la aplicación

Abrí PowerShell en la carpeta raíz `C:\Users\Hair\OneDrive\Escritorio\Ecoquest` y ejecutá:

```powershell
dotnet restore backend\EcoQuestAPI\EcoQuestAPI.csproj
dotnet run --project backend\EcoQuestAPI\EcoQuestAPI.csproj --launch-profile http
```

Dejá esa ventana abierta. El perfil `http` levanta la aplicación en `http://localhost:5228` y abre primero `pages/click.html`. Desde esa bienvenida se elige iniciar sesión, crear una cuenta o entrar como invitada. Si no abre automáticamente, entrá a `http://localhost:5228/pages/click.html`. La página principal del juego es `http://localhost:5228/pages/inicio.html`. La API también ofrece `http://localhost:5228/api/health`; en desarrollo, Swagger está en `http://localhost:5228/swagger`.

ASP.NET Core sirve el frontend. Apache no es necesario para ver la app; solo se necesita para phpMyAdmin. **MySQL sí debe estar iniciado antes que EcoQuest**, porque la API revisa y prepara la base cuando arranca.

## Abrir y exportar la base

1. En XAMPP, confirmá que MySQL y Apache estén en estado **Running**.
2. Abrí `http://localhost/phpmyadmin/` y elegí `ecoquest` en la barra izquierda.
3. Para ver cuentas, abrí `usuarios`. Para el perfil de juego, revisá `rankingusers` y `authprofiles`; para escaneos e historial, `rankingscans`, `rankingscandetails` y `rankinghistory`.
4. Para guardar una copia, seleccioná `ecoquest`, tocá **Exportar**, elegí **Rápido** y formato **SQL**, y presioná **Exportar**. El navegador descargará un archivo `.sql`. Guardalo en un lugar seguro: contiene correos y progreso de las cuentas.

La base `ecoquest_consulta_20261029` es una copia de consulta anterior; los cambios nuevos se guardan en `ecoquest`.

## Cómo se inicializa y persiste

El inicio actual usa `Database:Provider=MySQL` y ejecuta `EnsureCreated()` para crear el esquema cuando la base está vacía. `RankingStore` crea sus tablas con `CREATE TABLE IF NOT EXISTS`. Los archivos `EcoQuestAPI/ecoquest.db` y `EcoQuestAPI/ranking.db` se importan a MySQL una sola vez; `EcoQuestSqliteImports` registra las tablas ya copiadas. En esta instalación la importación ya quedó registrada.

`EnsureCreated()` no aplica migraciones a una base existente. Si en el futuro cambia el esquema, hay que revisar y aplicar la migración correspondiente antes de distribuir la versión. El índice único actual de `usuarios.Email` fue comprobado en la base local.

## Qué datos se guardan

- Registro y hash de contraseña en `usuarios`.
- Perfil, XP y ranking en `rankingusers`; la relación con la cuenta usa `authprofiles`.
- Sesiones (token guardado como hash) en `rankingsessions`.
- Escaneos pendientes/usados y su análisis en `rankingscans` y `rankingscandetails`.
- Actividad diaria, recompensas e historial en `rankingdays`, `rankingrewards` y `rankinghistory`.

Las misiones y puntos del mapa se leen de archivos JSON del proyecto, no son tablas editables desde MySQL. La persona invitada puede recorrer y consultar la aplicación, pero inicia con 0 XP y sin racha, no participa como perfil en el ranking y sus escaneos/progreso no se guardan ni en MySQL ni en el navegador. Para conservar progreso debe iniciar sesión o registrarse.
