#
## Comandos
<!-- COMO INCIOO PROYECTO -->
```powershell
cd C:\Users\Hair\OneDrive\Escritorio\Ecoquest\backend
dotnet build EcoQuest.sln
dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj
```

Al ejecutar la API, el frontend queda disponible en:

```text
http://localhost:5228/pages/inicio.html
```http://localhost:5228/pages/inicio.html link oficial



<!-- COMO ACTUALIZAR  -->
cd "C:\Users\Hair\OneDrive\Escritorio\Ecoquest"
git switch main
git add .
git commit -m "Actualizo EcoQuest"
git pull --rebase origin main
git push origin main