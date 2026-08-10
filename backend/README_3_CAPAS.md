# EcoQuest - Backend en 3 capas

La solucion del backend queda organizada segun la guia del profesor:

```text
EcoQuest.sln
|-- EcoQuest.Datos   -> Capa de datos
|-- EcoQuest.Logica  -> Capa de negocio
`-- EcoQuestAPI      -> Capa de presentacion Web API
```

## Referencias

```text
EcoQuestAPI -> EcoQuest.Logica -> EcoQuest.Datos
```

La API no referencia directamente a Datos. `EcoQuest.Logica` registra la capa de datos internamente con `AddEcoQuestApplication`.

## Responsabilidades

- `EcoQuest.Datos`: entidades, `EcoQuestDbContext`, repositorio de puntos de reciclaje oficiales y fallback local.
- `EcoQuest.Logica`: DTOs, interfaces, servicios de negocio, analisis IA y conversion de datos a respuestas JSON.
- `EcoQuestAPI`: controllers HTTP, CORS, Swagger/OpenAPI y publicacion del frontend estatico.
- `Frontend`: HTML/CSS/JS desacoplado que consume la Web API con `fetch`.

## Comandos

```powershell
cd C:\Users\Hair\OneDrive\Escritorio\Ecoquest\backend
dotnet build EcoQuest.sln
dotnet run --project .\EcoQuestAPI\EcoQuestAPI.csproj
```

Al ejecutar la API, el frontend queda disponible en:

```text
http://localhost:5228/pages/inicio.html
```
