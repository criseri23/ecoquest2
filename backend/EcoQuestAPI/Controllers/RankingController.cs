using EcoQuestAPI.Services;
using EcoQuest.Datos.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;

namespace EcoQuestAPI.Controllers;
[ApiController, Route("api/ranking")]
public sealed class RankingController(RankingStore store,IRecyclingPointRepository points):ControllerBase
{
    public record Account(string Name,string Password,string Photo="",string City="CABA");
    public record Verification(string[] ScanIds,string PointId,double Lat,double Lng,double Accuracy);
    private string? UserId()=>store.Authenticate(Request.Headers.Authorization.ToString());
    [HttpGet] public IActionResult List([FromQuery]int limit=10)=>Ok(new {city="CABA",users=store.Leaders(Math.Clamp(limit,1,100))});
    [HttpPost("register"),EnableRateLimiting("accounts")]
    public IActionResult Register(Account a) {
        try {var id=store.Register(a.Name??"",a.Password??"",a.Photo??"",a.City);return Ok(new {token=store.Session(id),profile=store.Profile(id)});}
        catch(ArgumentException e){return BadRequest(new {error=e.Message});}
        catch(SqliteException e)when(e.SqliteErrorCode==19){return Conflict(new {error="Ese nombre de usuario ya está ocupado."});}
    }
    [HttpPost("login"),EnableRateLimiting("accounts")]
    public IActionResult Login(Account a) {
        if(a.Password is null||a.Password.Length>128)return Unauthorized();
        var id=store.Login(a.Name??"",a.Password);return id is null?Unauthorized(new {error="Nombre o contraseña incorrectos."}):Ok(new {token=store.Session(id),profile=store.Profile(id)});
    }
    [HttpPost("activity")] public IActionResult Visit() => UserId() is {} id ? Ok(store.Visit(id)) : Unauthorized();
    [HttpGet("me")]public IActionResult Me()=>UserId() is {} id?Ok(store.Profile(id)):Unauthorized();
    [HttpPost("logout")]public IActionResult Logout() {using var db=store.Open();var h=Request.Headers.Authorization.ToString();if(h.StartsWith("Bearer "))RankingStore.Execute(db,"DELETE FROM RankingSessions WHERE Token=@p0",RankingStore.Hash(h[7..]));return NoContent();}
    [HttpPut("photo")]public IActionResult SetPhoto([FromBody]string photo) {
        if(UserId() is not {} id)return Unauthorized();
        try{RankingStore.ValidatePhoto(photo);using var db=store.Open();RankingStore.Execute(db,"UPDATE RankingUsers SET Photo=@p0 WHERE Id=@p1",photo,id);return Ok(store.Profile(id));}catch(ArgumentException e){return BadRequest(new {error=e.Message});}
    }
    [HttpGet("photo/{id}")]public IActionResult Photo(string id) {
        using var db=store.Open();using var cmd=RankingStore.Command(db,"SELECT Photo FROM RankingUsers WHERE Id=@p0",id);var photo=cmd.ExecuteScalar() as string;
        return string.IsNullOrEmpty(photo)?NotFound():File(Convert.FromBase64String(photo.Split(',')[1]),"image/jpeg");
    }
    [HttpPost("verify")]public async Task<IActionResult> Verify(Verification v,CancellationToken ct) {
        if(UserId() is not {} id)return Unauthorized();
        if(v.ScanIds is null||v.ScanIds.Length is <1 or >20||!double.IsFinite(v.Lat)||!double.IsFinite(v.Lng)||!double.IsFinite(v.Accuracy)||v.Accuracy is <=0 or >150)return BadRequest(new {error="Necesitamos una ubicación precisa y entre 1 y 20 residuos."});
        var point=(await points.GetAllAsync(ct)).FirstOrDefault(p=>p.Id==v.PointId);
        if(point is null)return BadRequest(new {error="Elegí un contenedor de CABA."});
        var rad=Math.PI/180;var a=Math.Pow(Math.Sin((point.Lat-v.Lat)*rad/2),2)+Math.Cos(v.Lat*rad)*Math.Cos(point.Lat*rad)*Math.Pow(Math.Sin((point.Lng-v.Lng)*rad/2),2);
        var distance=6371000*2*Math.Asin(Math.Sqrt(Math.Clamp(a,0,1)));
        if(distance>150)return BadRequest(new {error="Acercate al contenedor para validar los residuos."});
        var awarded=store.Validate(id,v.ScanIds,point.Accepts);return Ok(new {awardedPoints=awarded,profile=store.Profile(id)});
    }
}
