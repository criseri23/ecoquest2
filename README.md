# EcoQuest

Aplicación web educativa para separar residuos, consultar puntos de reciclaje de CABA y participar en actividades de juego.

## Requisitos

- .NET **SDK 10**. Comprobalo desde PowerShell con `dotnet --version`.
- MySQL o MariaDB. En Windows podés usar **XAMPP**.
- Navegador web e Internet para descargar paquetes y utilizar Gemini.
- Una clave propia de Gemini para analizar fotografías.

## 1. Descargar desde GitHub

1. En [el repositorio](https://github.com/criseri23/ecoquest2), elegí **Code → Download ZIP**.
2. Extraé todo el ZIP; no ejecutes archivos dentro del comprimido.
3. Podés renombrar la carpeta extraída como **EcoQuest**. El nombre no es obligatorio: abrí la carpeta que contiene **backend** y **Frontend**. Si quedaron carpetas anidadas, usá la carpeta interna que contiene ambas.

```text
EcoQuest/
  backend/
    EcoQuestAPI/
    EcoQuest.Datos/
    EcoQuest.Logica/
  Frontend/
```

## 2. Encender MySQL y crear la base

1. Abrí **XAMPP Control Panel** y pulsá **Start** en **MySQL**.
2. Para usar phpMyAdmin, iniciá también **Apache** y abrí <http://localhost/phpmyadmin>. Apache solo hace falta para phpMyAdmin; EcoQuest se sirve desde .NET.
3. Creá la base llamada exactamente **ecoquest**, en minúsculas. Podés ejecutar esto en la pestaña **SQL**:

```sql
CREATE DATABASE IF NOT EXISTS ecoquest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

El backend crea la tabla **Usuarios** automáticamente al iniciar. No necesitás crearla a mano ni importar un SQL. La base `ecoquest` sí debe existir previamente.

## 3. Revisar la conexión

Abrí `backend/EcoQuestAPI/appsettings.json` y revisá `ConnectionStrings:EcoQuestDb`. Ejemplo para XAMPP con `root` sin contraseña:

```json
"ConnectionStrings": {
  "EcoQuestDb": "server=127.0.0.1;port=3306;database=ecoquest;user=root;password="
}
```

Este fragmento va dentro del JSON existente: conservá las demás opciones. Si MySQL tiene otra contraseña, usuario o puerto, adaptá esos valores. No publiques credenciales privadas.

## 4. Ejecutar el proyecto

Abrí PowerShell en la carpeta raíz **EcoQuest**. Podés escribir `powershell` en la barra de direcciones del Explorador. Ejecutá por separado:

```powershell
cd backend
cd EcoQuestAPI
dotnet restore
dotnet run --launch-profile http
```

Cuando aparezca `Now listening on: http://localhost:5228`, abrí:

**[Iniciar EcoQuest](http://localhost:5228/pages/click.html)**

Dejá MySQL encendido y la terminal abierta mientras usás la aplicación. Para detener la API, presioná **Ctrl+C**. No abras los HTML con doble clic.

Como alternativa, desde la raíz EcoQuest podés ejecutar directamente:

```powershell
dotnet run --project backend\EcoQuestAPI\EcoQuestAPI.csproj --launch-profile http
```

## 5. Configurar Gemini para analizar fotos

La descarga no incluye una clave privada. Detené la API y, desde `backend/EcoQuestAPI`, configurá tu clave en la misma ventana de PowerShell antes de ejecutar:

```powershell
$env:GEMINI_API_KEY = "PEGAR_TU_CLAVE_PROPIA"
dotnet run --launch-profile http
```

Reemplazá el texto de ejemplo por una clave válida. La variable dura durante esa sesión de PowerShell. Sin clave, el análisis informa que falta configurar la IA; las demás pantallas no requieren esa clave. Permití el acceso a la ubicación para validar residuos en un punto cercano.

## Qué se guarda

- **MySQL:** cuentas y hash de contraseña. Se pueden consultar en phpMyAdmin, base `ecoquest`, tabla `Usuarios`.
- **SQLite en memoria:** sesiones, XP, escaneos, misiones, rachas, historial y ranking. Se reinician al detener o reiniciar la API.
- **JSON:** catálogo de puntos y reglas de recompensas.
- **Modo invitada:** permite recorrer la aplicación; no guarda escaneos ni asigna XP del servidor.

## Recorrido de prueba

1. Registrate, iniciá sesión o entrá como invitada.
2. Con Gemini configurado, analizá una foto reciclable. Con una cuenta, el escaneo queda pendiente.
3. Elegí un punto compatible en el mapa. Para validar, necesitás estar a 150 metros o menos, con una precisión de ubicación mayor que 0 y de hasta 150 metros.
4. Consultá el progreso, misiones, calendario y ranking.

La pantalla **Mascota** muestra una animación y el aviso **Próximamente**: no implementa cuidados ni accesorios.

## Documentación

- [Documentación completa en PDF](docs/EcoQuest_documentacion_revisada.pdf)
- [Documento editable en Word](docs/EcoQuest_documentacion_revisada.docx)
- [Swagger de la API](http://localhost:5228/swagger), disponible con el perfil de desarrollo y la API iniciada.
