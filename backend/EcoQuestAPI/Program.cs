using EcoQuest.Logica.Services;
using EcoQuestAPI.Services;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using EcoQuest.Logica;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

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

    app.MapGet("/", () => Results.Redirect("/pages/inicio.html"));
}

app.MapControllers();

app.Run();
