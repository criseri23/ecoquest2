using Microsoft.EntityFrameworkCore;
using EcoQuest.Logica.Services;
using EcoQuestAPI.Services;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using EcoQuest.Logica;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
var useMySql = builder.Configuration["Database:Provider"] == "MySQL";
if (!useMySql)
{
    var connection = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(
        builder.Configuration.GetConnectionString("EcoQuestDb") ?? "Data Source=ecoquest.db");
    if (!Path.IsPathRooted(connection.DataSource))
        connection.DataSource = Path.Combine(builder.Environment.ContentRootPath, connection.DataSource);
    builder.Configuration["ConnectionStrings:EcoQuestDb"] = connection.ToString();
}

builder.Services.AddSingleton(RewardRules.Load(Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "..", "Frontend", "data", "rewards.json"))));
builder.Services.AddSingleton<RankingStore>();
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode=429;
    options.AddPolicy("accounts", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit=20,Window=TimeSpan.FromMinutes(1),QueueLimit=0 }));
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();
builder.Services.AddEcoQuestApplication(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Prepara MySQL y copia los archivos SQLite actuales una sola vez al iniciar.
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<EcoQuest.Datos.Context.EcoQuestDbContext>();
    if (useMySql)
    {
        // XAMPP usa MariaDB 10.4; su GET_LOCK no acepta el timeout -1 del migrador de EF 10.
        // La base nueva se crea desde el modelo actual sin tocar ninguna tabla existente.
        database.Database.EnsureCreated();
        var rankingStore = scope.ServiceProvider.GetRequiredService<RankingStore>();
        rankingStore.ImportLegacySqlite(
            Path.Combine(builder.Environment.ContentRootPath, "ecoquest.db"),
            Path.Combine(builder.Environment.ContentRootPath, "ranking.db"));
    }
    else
    {
        database.Database.EnsureCreated();
    }
}


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRateLimiter();

var frontendPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "Frontend"));

if (Directory.Exists(frontendPath))
{
    var frontendFiles = new PhysicalFileProvider(frontendPath);

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = frontendFiles,
    });

    app.MapGet("/", () => Results.Redirect("/pages/click.html"));
}

app.MapControllers();

app.Run();
