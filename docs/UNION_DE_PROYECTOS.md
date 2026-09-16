# Unión de las dos carpetas — 15/09/2026

El proyecto principal sigue siendo Ecoquest. EcoQuest-main se conserva intacto.
Antes de integrar se guardó una copia del proyecto principal en `.local-build/antes-union-20260915-203452.zip`.

## Qué se incorporó

- Las pantallas de bienvenida, elección, registro y login, con las cuatro imágenes de la compañera y controles HTML funcionales.
- Usuario con PasswordHash, repositorio de usuarios, AuthService, solicitudes de registro/login, migraciones y soporte para MySQL.
- Sus instrucciones y scripts originales están en `docs/aporte-companera` para conservar el aporte. Las rutas que aparecen allí corresponden a su computadora; para esta versión se usan las instrucciones de este documento.
- El login ahora devuelve una sesión real y el perfil de progreso. Registro y login se abren desde Config o Ranking. Las cuentas antiguas siguen entrando por nombre; las nuevas entran por email.
- Se conservaron calendario, mapa, puntos, ranking, logros y el encabezado compartido de la versión principal. Los archivos comunes de la otra carpeta tenían versiones anteriores de estas pantallas.

## Cómo se guardan los datos

En esta PC se usa SQLite por defecto. La API crea `backend/EcoQuestAPI/ecoquest.db` con Usuarios y las tablas de la capa de datos. `ranking.db` conserva el progreso, premios, residuos, fotos y sesiones que ya funcionaban. AuthProfiles vincula cada email autenticado con su perfil; no se juntan cuentas solo por tener el mismo nombre.

La experiencia preexistente de un usuario de la base de datos se importa al vincularlo por primera vez. A partir de ahí, ranking.db es la fuente del XP que muestran todas las pantallas. Los campos anteriores Nivel/Experiencia/Monedas de Usuario se conservan por compatibilidad, pero no son un segundo contador activo.

La carpeta de la compañera contiene código y scripts de estructura; no contiene una exportación con los usuarios de su servidor MySQL. No se copió su ranking.db encima del original. Para traer datos que estén en su PC hace falta exportar esa base.

Las bases locales no se suben a GitHub. Se preserva el progreso invitado por separado de las cuentas.

## Ejecutar en esta PC

Desde la raíz del proyecto:

```powershell
dotnet run --project backend/EcoQuestAPI
```

Abrir http://localhost:5228/ para ver la bienvenida, o `/pages/inicio.html` para el recorrido.

## Usar MySQL

Se mantiene el proveedor MySQL utilizado por la compañera. Para usar una base MySQL preparada con sus migraciones:

```powershell
$env:Database__Provider = 'MySQL'
$env:ConnectionStrings__EcoQuestDb = 'server=localhost;port=3306;database=ecoquest;user=TU_USUARIO;password=TU_CLAVE'
dotnet run --project backend/EcoQuestAPI
```

No publicar credenciales en GitHub. No ejecutar los scripts de creación o modificación encima de datos existentes sin revisar primero su estructura. Esta unión se probó con SQLite; en esta computadora no se encontró un servicio MySQL para verificar esa conexión.

## Pruebas y comportamiento

`dotnet run --project tests/RewardTests/Tests.csproj` usa bases separadas en .local-build. Comprueba premios diarios, rachas, duplicados, contraseñas, registro, vinculación de cuentas y sesiones.
También se verificó en navegador: bienvenida → registro → Inicio → calendario → cerrar sesión → login → ranking, con el mismo usuario y XP.

Los números de Inicio abren el calendario del mes y año indicados. El visto significa «mes finalizado», no «todos los desafíos completados». Depende de la fecha de Buenos Aires y no aparece durante el mes actual ni en meses futuros. Los desafíos cumplidos siguen registrados por separado en el calendario.
