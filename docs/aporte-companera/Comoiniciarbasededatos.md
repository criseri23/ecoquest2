14. ## Cómo iniciar la base de datos


Antes de ejecutar la API hay que abrir XAMPP.

En XAMPP se debe iniciar:

MySQL

Cuando esté funcionando, la base de datos estará disponible en:

localhost:3306

También se puede entrar a phpMyAdmin para comprobar que existe:

ecoquest

y revisar la tabla:

Usuarios


15. ## Cómo ejecutar el backend desde CMD


Se utiliza CMD, no PowerShell.

Primero se abre CMD.

Después se entra a la carpeta del backend:

cd /d "C:\Users\valen\Downloads\ecoquest2-main\ecoquest2-main\backend"

Luego se puede comprobar que el proyecto compile:

dotnet build EcoQuest.sln

Si todo está correcto debería aparecer:

Build succeeded.

Después se ejecuta la API:

dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj

La API queda disponible en:

http://localhost:5228

Mientras la API esté funcionando, no hay que cerrar esa ventana de CMD.

Para detenerla:

Ctrl + C


16. ## Cómo utilizar Swagger UI


Una vez ejecutado:

dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj

se puede abrir Swagger desde el navegador:

http://localhost:5228/swagger

Swagger muestra los endpoints disponibles de la API.

Entre ellos:

POST /api/auth/registro
POST /api/auth/login


17. ## Probar el registro desde Swagger

En Swagger se busca:

POST /api/auth/registro

Se presiona:

Try it out

Luego se coloca un JSON como:

{
  "nombre": "Cal",
  "email": "cal@test.com",
  "contraseña": "123456"
}

Después se presiona:

Execute

Si todo funciona correctamente, la API responde:

{
  "mensaje": "Usuario registrado correctamente."
}

Después se puede entrar a phpMyAdmin y comprobar que el usuario fue agregado a la tabla Usuarios.

La contraseña no debería aparecer como 123456, sino como un hash.


18. ## Probar el login desde Swagger

En Swagger se busca:

POST /api/auth/login

Se presiona:

Try it out

Y se coloca:

{
  "email": "cal@test.com",
  "contraseña": "123456"
}

Después:

Execute

Si las credenciales son correctas:

{
  "mensaje": "Inicio de sesión correcto."
}

Si son incorrectas:

{
  "mensaje": "Email o contraseña incorrectos."
}

Esto fue probado y el login respondió correctamente.


19. ## Prueba desde la página web

Una vez que el backend está ejecutándose mediante CMD y el frontend está abierto con Live Server, se puede probar el sistema completo.

El recorrido sería:

click.html
    ↓
elegir.html
    ↓
login.html
    ↓
login.js
    ↓
API C#
    ↓
MySQL
    ↓
Respuesta
    ↓
inicio.html

Para registro:

registro.html
    ↓
registro.js
    ↓
POST /api/auth/registro
    ↓
C#
    ↓
MySQL

## Cada vez que quiera ejecutar EcoQuest:

1. Abrir XAMPP
       ↓
2. Iniciar MySQL
       ↓
3. Abrir CMD
       ↓
4. Entrar a backend
       ↓
5. Ejecutar dotnet build
       ↓
6. Ejecutar dotnet run
       ↓
7. Abrir Swagger o el frontend

## Para trabajar en equipo, si se realizan cambios en la estructura de la base de datos, hay que volver a compartir/exportar la base de datos o coordinar esos cambios para que ambas copias tengan la misma estructura.