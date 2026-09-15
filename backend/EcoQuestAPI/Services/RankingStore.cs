using EcoQuest.Logica.Services;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace EcoQuestAPI.Services;

public sealed class RankingStore
{
    private readonly string connectionString;
    private readonly RewardRules rules;
    public RankingStore(IConfiguration config, IWebHostEnvironment env, RewardRules rules)
    {
        this.rules = rules;
        var path = config["Ranking:DatabasePath"] ?? Path.Combine(env.ContentRootPath, "ranking.db");
        connectionString = new SqliteConnectionStringBuilder { DataSource=path, DefaultTimeout=15 }.ToString();
        using var db=Open();
        Execute(db,"""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS RankingUsers(Id TEXT PRIMARY KEY, Name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                Password TEXT NOT NULL, Photo TEXT NOT NULL DEFAULT '', City TEXT NOT NULL DEFAULT 'CABA', Xp INTEGER NOT NULL DEFAULT 0,
                Validated INTEGER NOT NULL DEFAULT 0, Created TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS RankingScore ON RankingUsers(City, Xp DESC, Created, Id);
            CREATE TABLE IF NOT EXISTS RankingSessions(Token TEXT PRIMARY KEY, UserId TEXT NOT NULL, Expires TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS RankingScans(Id TEXT PRIMARY KEY, UserId TEXT NOT NULL, Points INTEGER NOT NULL,
                Container TEXT NOT NULL, Used INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS RankingDays(UserId TEXT NOT NULL, Day TEXT NOT NULL, Visited INTEGER NOT NULL DEFAULT 0, Challenge INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(UserId, Day));
            CREATE TABLE IF NOT EXISTS RankingRewards(UserId TEXT NOT NULL, Mission TEXT NOT NULL, PRIMARY KEY(UserId,Mission));
            """);
    }
    public SqliteConnection Open() { var db=new SqliteConnection(connectionString); db.Open(); return db; }
    public static SqliteCommand Command(SqliteConnection db,string sql,params object[] args)
    { var cmd=db.CreateCommand();cmd.CommandText=sql;for(int i=0;i<args.Length;i++)cmd.Parameters.AddWithValue("@p"+i,args[i]);return cmd; }
    public static int Execute(SqliteConnection db,string sql,params object[] args) { using var cmd=Command(db,sql,args);return cmd.ExecuteNonQuery(); }
    public static string Hash(string token)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    public string? Authenticate(string? header)
    {
        if(header is null || !header.StartsWith("Bearer "))return null;
        using var db=Open();using var cmd=Command(db,"SELECT UserId FROM RankingSessions WHERE Token=@p0 AND Expires>@p1",Hash(header[7..]),DateTime.UtcNow.ToString("O"));
        return cmd.ExecuteScalar() as string;
    }
    public string Register(string name,string password,string photo,string city)
    {
        name=name.Trim();
        if(!Regex.IsMatch(name,@"^[\p{L}\p{N}_ -]{3,24}$") || password.Length<8 || password.Length>128 || city!="CABA")
            throw new ArgumentException("Usá un nombre de 3 a 24 caracteres, una contraseña de 8 a 128 caracteres y seleccioná CABA.");
        ValidatePhoto(photo);
        var salt=RandomNumberGenerator.GetBytes(16);
        var hash=Rfc2898DeriveBytes.Pbkdf2(password,salt,100000,HashAlgorithmName.SHA256,32);
        var id=Guid.NewGuid().ToString("N");using var db=Open();
        Execute(db,"INSERT INTO RankingUsers(Id,Name,Password,Photo,City,Created) VALUES(@p0,@p1,@p2,@p3,'CABA',@p4)",id,name,Convert.ToBase64String(salt)+":"+Convert.ToBase64String(hash),photo,DateTime.UtcNow.ToString("O"));
        return id;
    }
    public string? Login(string name,string password)
    {
        using var db=Open();using var cmd=Command(db,"SELECT Id,Password FROM RankingUsers WHERE Name=@p0",name.Trim());using var reader=cmd.ExecuteReader();
        if(!reader.Read())return null;
        var stored=reader.GetString(1).Split(':');
        var hash=Rfc2898DeriveBytes.Pbkdf2(password,Convert.FromBase64String(stored[0]),100000,HashAlgorithmName.SHA256,32);
        return CryptographicOperations.FixedTimeEquals(hash,Convert.FromBase64String(stored[1]))?reader.GetString(0):null;
    }
    public string Session(string id)
    {
        var token=Convert.ToHexString(RandomNumberGenerator.GetBytes(32));using var db=Open();
        Execute(db,"DELETE FROM RankingSessions WHERE Expires<=@p0",DateTime.UtcNow.ToString("O"));
        Execute(db,"INSERT INTO RankingSessions VALUES(@p0,@p1,@p2)",Hash(token),id,DateTime.UtcNow.AddDays(30).ToString("O"));return token;
    }
    public object Profile(string id)
    {
        using var db=Open();using var cmd=Command(db,"SELECT Name,Xp,Validated,Photo FROM RankingUsers WHERE Id=@p0",id);using var r=cmd.ExecuteReader();r.Read();
        var name=r.GetString(0);var xp=r.GetInt32(1);var validated=r.GetInt32(2);var hasPhoto=r.GetString(3).Length>0;r.Close();
        using var rewards=Command(db,"SELECT Mission FROM RankingRewards WHERE UserId=@p0",id);using var rr=rewards.ExecuteReader();var completed=new List<string>();while(rr.Read())completed.Add(rr.GetString(0));rr.Close();
        using var scans=Command(db,"SELECT COUNT(*) FROM RankingScans WHERE UserId=@p0",id);
        return new {id,name,xp,validated,scans=Convert.ToInt32(scans.ExecuteScalar()),city="CABA",photoUrl=hasPhoto?$"/api/ranking/photo/{id}":null,completedMissionIds=completed.Where(x=>!x.StartsWith("streak-")).ToArray(),level=rules.Level(xp),activity=Activity(id, completed)};
    }
    public object[] Leaders(int limit)
    {
        using var db=Open();using var cmd=Command(db,"SELECT Id,Name,Xp,Photo FROM RankingUsers WHERE City='CABA' ORDER BY Xp DESC,Created,Id LIMIT @p0",limit);
        using var r=cmd.ExecuteReader();var rows=new List<object>();while(r.Read())rows.Add(new {id=r.GetString(0),name=r.GetString(1),xp=r.GetInt32(2),rank=rows.Count+1,photoUrl=r.GetString(3).Length>0?$"/api/ranking/photo/{r.GetString(0)}":null});return rows.ToArray();
    }
    public string SaveScan(string user,int points,string container)
    {
        var id=Guid.NewGuid().ToString("N");using var db=Open();Execute(db,"INSERT INTO RankingScans(Id,UserId,Points,Container) VALUES(@p0,@p1,@p2,@p3)",id,user,rules.RecyclingXp,container);return id;
    }
    public int Validate(string user,string[] ids,Func<string,bool> accepts)
    {
        using var db=Open();using var tx=db.BeginTransaction();int xp=0,count=0;
        foreach(var id in ids.Distinct()) {
            using var cmd=Command(db,"SELECT Points,Container FROM RankingScans WHERE Id=@p0 AND UserId=@p1 AND Used=0",id,user);using var r=cmd.ExecuteReader();
            if(!r.Read())continue;var points=r.GetInt32(0);var container=r.GetString(1);r.Close();
            if(!accepts(container))continue;
            if(Execute(db,"UPDATE RankingScans SET Used=1 WHERE Id=@p0 AND UserId=@p1 AND Used=0",id,user)==1){xp+=rules.RecyclingXp;count++;}
        }
        Execute(db,"UPDATE RankingUsers SET Xp=Xp+@p0,Validated=Validated+@p1 WHERE Id=@p2",xp,count,user);
        using var totalCmd=Command(db,"SELECT Validated FROM RankingUsers WHERE Id=@p0",user);var total=Convert.ToInt32(totalCmd.ExecuteScalar());int bonus=0;
        foreach(var mission in rules.Missions)if(total>=mission.Goal && Execute(db,"INSERT OR IGNORE INTO RankingRewards VALUES(@p0,@p1)",user,mission.Id)==1)bonus+=mission.Reward;
        if(count > 0) bonus += RecordDay(db,user,true);
        Execute(db,"UPDATE RankingUsers SET Xp=Xp+@p0 WHERE Id=@p1",bonus,user);tx.Commit();return xp+bonus;
    }
    private List<string> ReadDays(SqliteConnection db, string user, string column)
    {
        using var cmd = Command(db, $"SELECT Day FROM RankingDays WHERE UserId=@p0 AND {column}=1 ORDER BY Day", user);
        using var reader = cmd.ExecuteReader();
        var dates = new List<string>();
        while (reader.Read()) dates.Add(reader.GetString(0));
        return dates;
    }

    private object Activity(string user, List<string> completed)
    {
        using var db = Open();
        var visits = ReadDays(db, user, "Visited");
        var challenges = ReadDays(db, user, "Challenge");
        var today = rules.Today();
        int streak = rules.Streak(visits, today);
        var claimed = completed.Where(id => id.StartsWith("streak-")).Select(id => int.Parse(id[7..])).ToArray();
        var next = rules.RewardsUpTo(Math.Max(streak, claimed.DefaultIfEmpty(0).Max())).First(r => !claimed.Contains(r.Days));
        return new { today, visits, challenges, streak, claimedStreakDays = claimed, nextDays = next.Days, nextXp = next.Xp, daysRemaining = Math.Max(0,next.Days-streak) };
    }

    private int RecordDay(SqliteConnection db, string user, bool challenge)
    {
        var today = rules.Today();
        Execute(db, "INSERT OR IGNORE INTO RankingDays(UserId,Day) VALUES(@p0,@p1)", user, today);
        int bonus = 0;
        if (Execute(db, "UPDATE RankingDays SET Visited=1 WHERE UserId=@p0 AND Day=@p1 AND Visited=0", user, today) == 1) bonus += rules.VisitXp;
        if (challenge && Execute(db, "UPDATE RankingDays SET Challenge=1 WHERE UserId=@p0 AND Day=@p1 AND Challenge=0", user, today) == 1) bonus += rules.ChallengeXp;
        var streak = rules.Streak(ReadDays(db, user, "Visited"), today);
        foreach (var reward in rules.RewardsUpTo(streak))
            if (streak >= reward.Days && Execute(db, "INSERT OR IGNORE INTO RankingRewards VALUES(@p0,@p1)", user, "streak-" + reward.Days) == 1) bonus += reward.Xp;
        return bonus;
    }

    public object Visit(string user)
    {
        using var db = Open(); using var transaction = db.BeginTransaction();
        int bonus = RecordDay(db, user, false);
        Execute(db, "UPDATE RankingUsers SET Xp=Xp+@p0 WHERE Id=@p1", bonus, user);
        transaction.Commit();
        return new { awardedPoints = bonus, profile = Profile(user) };
    }

    public static void ValidatePhoto(string photo)
    {
        if(photo.Length==0)return;
        if(photo.Length>180000 || !photo.StartsWith("data:image/jpeg;base64,"))throw new ArgumentException("La foto debe ser JPEG y pesar menos de 130 KB.");
        try {var bytes=Convert.FromBase64String(photo.Split(',')[1]);if(bytes.Length<4||bytes[0]!=255||bytes[1]!=216||bytes[^2]!=255||bytes[^1]!=217)throw new FormatException();}
        catch(FormatException){throw new ArgumentException("La foto no es válida.");}
    }
}
