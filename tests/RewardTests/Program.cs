using EcoQuestAPI.Services;
using EcoQuest.Logica.Services;
using Microsoft.AspNetCore.Builder;
using System.Text.Json;
var root=Path.GetFullPath(".");
Directory.CreateDirectory(Path.Combine(root,".local-build/reward-tests"));
var builder=WebApplication.CreateBuilder();
builder.Configuration["Ranking:DatabasePath"]=Path.Combine(root,".local-build/reward-tests/"+Guid.NewGuid()+".db");
var rules=RewardRules.Load(Path.Combine(root,"Frontend/data/rewards.json"));
var store=new RankingStore(builder.Configuration,builder.Environment,rules);
void Check(bool condition,string name){if(!condition)throw new Exception(name);Console.WriteLine("PASS "+name);}
JsonElement Profile(string id)=>JsonSerializer.SerializeToElement(store.Profile(id));
var user=store.Register("PruebaCalendario","testonly123","","CABA");
store.Visit(user);store.Visit(user);
Check(Profile(user).GetProperty("xp").GetInt32()==5,"daily visit once");
var today=DateOnly.Parse(rules.Today());
using(var db=store.Open()){
 for(int i=1;i<20;i++)RankingStore.Execute(db,"INSERT INTO RankingDays VALUES(@p0,@p1,1,0)",user,today.AddDays(-i).ToString("yyyy-MM-dd"));
}
store.Visit(user);store.Visit(user);
Check(Profile(user).GetProperty("xp").GetInt32()==330,"20 day streak bonuses once");
var scan=store.SaveScan(user,999,"Contenedor verde");
store.Validate(user,new[]{scan},container=>true);
Check(Profile(user).GetProperty("xp").GetInt32()==355,"10 recycling +15 first challenge");
store.Validate(user,new[]{scan},container=>true);
Check(Profile(user).GetProperty("xp").GetInt32()==355,"same scan cannot award again");
var scan2=store.SaveScan(user,999,"Contenedor verde");store.Validate(user,new[]{scan2},container=>true);
Check(Profile(user).GetProperty("xp").GetInt32()==365,"second scan only 10 XP");
Check(Profile(user).GetProperty("activity").GetProperty("challenges").GetArrayLength()==1,"one challenge per day");
Check(rules.Streak(new[]{today.AddDays(-2).ToString("yyyy-MM-dd")},rules.Today())==0,"missed day resets streak");
Check(rules.Streak(new[]{"2024-02-28","2024-02-29","2024-03-01"},"2024-03-01")==3,"leap day and month boundary");
Parallel.For(0,5,_=>store.Visit(user));Check(Profile(user).GetProperty("xp").GetInt32()==365,"concurrent visits cannot duplicate reward");
