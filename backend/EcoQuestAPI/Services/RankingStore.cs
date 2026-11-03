using EcoQuest.Logica.Services;
using System.Data.Common;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace EcoQuestAPI.Services;

public sealed class RankingStore : IDisposable
{
    public sealed record PendingScan(
        string Id,
        string ServerScanId,
        string Title,
        string Badge,
        int Points,
        string Container,
        string Text,
        bool CanUseGreenContainer,
        string WasteType,
        string Confidence,
        string ScannedAt);

    public sealed record RecycledItem(string Title, string Container, int Points);

    public sealed record RecycleHistoryEntry(
        string PointId,
        string PointName,
        int Points,
        IReadOnlyList<RecycledItem> Items,
        string RecycledAt);

    private const string ConnectionString = "Data Source=EcoQuestRanking;Mode=Memory;Cache=Shared";
    private readonly SqliteConnection databaseLifetime;
    private readonly RewardRules rules;
    public RankingStore(RewardRules rules)
    {
        this.rules = rules;
        databaseLifetime = Open();
        Execute(databaseLifetime,"""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS RankingUsers(Id TEXT PRIMARY KEY, Name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                Password TEXT NOT NULL, Photo TEXT NOT NULL DEFAULT '', City TEXT NOT NULL DEFAULT 'CABA', Xp INTEGER NOT NULL DEFAULT 0,
                Validated INTEGER NOT NULL DEFAULT 0, Created TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS RankingScore ON RankingUsers(City, Xp DESC, Created, Id);
            CREATE TABLE IF NOT EXISTS RankingSessions(Token TEXT PRIMARY KEY, UserId TEXT NOT NULL, Expires TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS RankingScans(Id TEXT PRIMARY KEY, UserId TEXT NOT NULL, Points INTEGER NOT NULL,
                Container TEXT NOT NULL, Used INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS RankingScanDetails(ScanId TEXT PRIMARY KEY, Title TEXT NOT NULL, Badge TEXT NOT NULL,
                Text TEXT NOT NULL, CanUseGreenContainer INTEGER NOT NULL, WasteType TEXT NOT NULL, Confidence TEXT NOT NULL, ScannedAt TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS RankingHistory(Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId TEXT NOT NULL, PointId TEXT NOT NULL,
                PointName TEXT NOT NULL, Points INTEGER NOT NULL, Items TEXT NOT NULL, RecycledAt TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS RankingHistoryUser ON RankingHistory(UserId, Id DESC);
            CREATE TABLE IF NOT EXISTS AuthProfiles(Email TEXT PRIMARY KEY, RankingUserId TEXT NOT NULL UNIQUE);
            CREATE TABLE IF NOT EXISTS RankingDays(UserId TEXT NOT NULL, Day TEXT NOT NULL, Visited INTEGER NOT NULL DEFAULT 0, Challenge INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(UserId, Day));
            CREATE TABLE IF NOT EXISTS RankingRewards(UserId TEXT NOT NULL, Mission TEXT NOT NULL, PRIMARY KEY(UserId,Mission));
            """);
    }

    public void Dispose() => databaseLifetime.Dispose();

    public SqliteConnection Open()
    {
        var db = new SqliteConnection(ConnectionString);
        db.Open();
        return db;
    }

    public static DbCommand Command(DbConnection db,string sql,params object[] args) => Command(db, null, sql, args);

    public static DbCommand Command(DbConnection db, DbTransaction? transaction, string sql, params object[] args)
    {
        var cmd = db.CreateCommand();
        cmd.CommandText = sql;
        cmd.Transaction = transaction;
        for (var i = 0; i < args.Length; i++)
        {
            var parameter = cmd.CreateParameter();
            parameter.ParameterName = "@p" + i;
            parameter.Value = args[i] ?? DBNull.Value;
            cmd.Parameters.Add(parameter);
        }
        return cmd;
    }

    public static int Execute(DbConnection db,string sql,params object[] args) => Execute(db, null, sql, args);

    public static int Execute(DbConnection db, DbTransaction? transaction, string sql, params object[] args)
    {
        using var cmd = Command(db, transaction, sql, args);
        return cmd.ExecuteNonQuery();
    }

    public bool IsDuplicateName(DbException error) =>
        error is SqliteException sqliteError && sqliteError.SqliteErrorCode == 19;
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
        if (stored.Length != 2) return null;
        var hash=Rfc2898DeriveBytes.Pbkdf2(password,Convert.FromBase64String(stored[0]),100000,HashAlgorithmName.SHA256,32);
        return CryptographicOperations.FixedTimeEquals(hash,Convert.FromBase64String(stored[1]))?reader.GetString(0):null;
    }
    public string Session(string id)
    {
        var token=Convert.ToHexString(RandomNumberGenerator.GetBytes(32));using var db=Open();
        Execute(db,"DELETE FROM RankingSessions WHERE Expires<=@p0",DateTime.UtcNow.ToString("O"));
        Execute(db,"INSERT INTO RankingSessions VALUES(@p0,@p1,@p2)",Hash(token),id,DateTime.UtcNow.AddDays(30).ToString("O"));return token;
    }
    // Vinculamos el usuario del login con su progreso sin cambiar cuentas anteriores.
    public string LinkAccount(string email, string name, int initialXp)
    {
        using var db = Open();
        using var transaction = db.BeginTransaction();
        using var existing = Command(db, transaction, "SELECT RankingUserId FROM AuthProfiles WHERE Email=@p0", email);
        if (existing.ExecuteScalar() is string previous) return previous;

        var id = Guid.NewGuid().ToString("N");
        var displayName = name;
        int suffix = 2;
        while (true)
        {
            using var taken = Command(db, transaction, "SELECT COUNT(*) FROM RankingUsers WHERE Name=@p0", displayName);
            if (Convert.ToInt32(taken.ExecuteScalar()) == 0) break;
            displayName = name + " " + suffix++;
        }
        Execute(db, transaction, "INSERT INTO RankingUsers(Id,Name,Password,Photo,City,Xp,Created) VALUES(@p0,@p1,@p2,'','CABA',@p3,@p4)",
            id, displayName, "external", Math.Max(0, initialXp), DateTime.UtcNow.ToString("O"));
        Execute(db, transaction, "INSERT INTO AuthProfiles VALUES(@p0,@p1)", email, id);
        transaction.Commit();
        return id;
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

    public string SaveScan(string user, string container, string title, string badge, string text,
        bool canUseGreenContainer, string wasteType, string confidence)
    {
        var id = Guid.NewGuid().ToString("N");
        var scannedAt = DateTimeOffset.UtcNow.ToString("O");
        using var db = Open();
        using var transaction = db.BeginTransaction();
        Execute(db, transaction, "INSERT INTO RankingScans(Id,UserId,Points,Container) VALUES(@p0,@p1,@p2,@p3)", id, user, rules.RecyclingXp, container);
        Execute(db, transaction, "INSERT INTO RankingScanDetails VALUES(@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7)",
            id, title, badge, text, canUseGreenContainer ? 1 : 0, wasteType, confidence, scannedAt);
        transaction.Commit();
        return id;
    }

    public object Progress(string user) => new
    {
        profile = Profile(user),
        pendingScans = PendingScans(user),
        history = History(user)
    };

    private PendingScan[] PendingScans(string user)
    {
        using var db = Open();
        using var cmd = Command(db, """
            SELECT s.Id, s.Points, s.Container, d.Title, d.Badge, d.`Text`, d.CanUseGreenContainer,
                   d.WasteType, d.Confidence, d.ScannedAt
            FROM RankingScans s
            LEFT JOIN RankingScanDetails d ON d.ScanId = s.Id
            WHERE s.UserId = @p0 AND s.Used = 0
            ORDER BY COALESCE(d.ScannedAt, '') DESC, s.Id DESC
            LIMIT 20
            """, user);
        using var reader = cmd.ExecuteReader();
        var scans = new List<PendingScan>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var title = reader.IsDBNull(3) ? "Residuo reciclable" : reader.GetString(3);
            var badge = reader.IsDBNull(4) ? "Reciclable" : reader.GetString(4);
            scans.Add(new PendingScan(
                id,
                id,
                title,
                badge,
                reader.GetInt32(1),
                reader.GetString(2),
                reader.IsDBNull(5) ? "" : reader.GetString(5),
                !reader.IsDBNull(6) && reader.GetInt32(6) == 1,
                reader.IsDBNull(7) ? badge : reader.GetString(7),
                reader.IsDBNull(8) ? "media" : reader.GetString(8),
                reader.IsDBNull(9) ? "" : reader.GetString(9)));
        }
        return scans.ToArray();
    }

    private RecycleHistoryEntry[] History(string user)
    {
        using var db = Open();
        using var cmd = Command(db, "SELECT PointId, PointName, Points, Items, RecycledAt FROM RankingHistory WHERE UserId=@p0 ORDER BY Id DESC LIMIT 10", user);
        using var reader = cmd.ExecuteReader();
        var history = new List<RecycleHistoryEntry>();
        while (reader.Read())
        {
            var items = JsonSerializer.Deserialize<List<RecycledItem>>(reader.GetString(3)) ?? [];
            history.Add(new RecycleHistoryEntry(reader.GetString(0), reader.GetString(1), reader.GetInt32(2), items, reader.GetString(4)));
        }
        return history.ToArray();
    }

    public int Validate(string user, string[] ids, string pointId, string pointName, Func<string, bool> accepts)
    {
        using var db = Open();
        using var tx = db.BeginTransaction();
        var xp = 0;
        var items = new List<RecycledItem>();
        foreach (var id in ids.Distinct())
        {
            using var cmd = Command(db, tx, "SELECT Points,Container FROM RankingScans WHERE Id=@p0 AND UserId=@p1 AND Used=0", id, user);
            using var reader = cmd.ExecuteReader();
            if (!reader.Read()) continue;
            var container = reader.GetString(1);
            reader.Close();
            if (!accepts(container)) continue;
            if (Execute(db, tx, "UPDATE RankingScans SET Used=1 WHERE Id=@p0 AND UserId=@p1 AND Used=0", id, user) != 1) continue;

            using var details = Command(db, tx, "SELECT Title FROM RankingScanDetails WHERE ScanId=@p0", id);
            var title = details.ExecuteScalar() as string ?? "Residuo reciclable";
            xp += rules.RecyclingXp;
            items.Add(new RecycledItem(title, container, rules.RecyclingXp));
        }
        var count = items.Count;
        Execute(db, tx, "UPDATE RankingUsers SET Xp=Xp+@p0,Validated=Validated+@p1 WHERE Id=@p2", xp, count, user);
        using var totalCmd = Command(db, tx, "SELECT Validated FROM RankingUsers WHERE Id=@p0", user);
        var total = Convert.ToInt32(totalCmd.ExecuteScalar());
        var bonus = 0;
        foreach (var mission in rules.Missions)
            if (total >= mission.Goal && Execute(db, tx, IgnoreInsert("INSERT INTO RankingRewards VALUES(@p0,@p1)"), user, mission.Id) == 1)
                bonus += mission.Reward;
        if (count > 0)
        {
            bonus += RecordDay(db, tx, user, true);
            Execute(db, tx, "INSERT INTO RankingHistory(UserId,PointId,PointName,Points,Items,RecycledAt) VALUES(@p0,@p1,@p2,@p3,@p4,@p5)",
                user, pointId, pointName, xp, JsonSerializer.Serialize(items), DateTimeOffset.UtcNow.ToString("O"));
        }
        Execute(db, tx, "UPDATE RankingUsers SET Xp=Xp+@p0 WHERE Id=@p1", bonus, user);
        tx.Commit();
        return xp + bonus;
    }
    private List<string> ReadDays(DbConnection db, string user, string column, DbTransaction? transaction = null)
    {
        using var cmd = Command(db, transaction, $"SELECT Day FROM RankingDays WHERE UserId=@p0 AND `{column}`=1 ORDER BY Day", user);
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

    private int RecordDay(DbConnection db, DbTransaction transaction, string user, bool challenge)
    {
        var today = rules.Today();
        Execute(db, transaction, IgnoreInsert("INSERT INTO RankingDays(UserId,Day) VALUES(@p0,@p1)"), user, today);
        int bonus = 0;
        if (Execute(db, transaction, "UPDATE RankingDays SET Visited=1 WHERE UserId=@p0 AND Day=@p1 AND Visited=0", user, today) == 1) bonus += rules.VisitXp;
        if (challenge && Execute(db, transaction, "UPDATE RankingDays SET Challenge=1 WHERE UserId=@p0 AND Day=@p1 AND Challenge=0", user, today) == 1) bonus += rules.ChallengeXp;
        var streak = rules.Streak(ReadDays(db, user, "Visited", transaction), today);
        foreach (var reward in rules.RewardsUpTo(streak))
            if (streak >= reward.Days && Execute(db, transaction, IgnoreInsert("INSERT INTO RankingRewards VALUES(@p0,@p1)"), user, "streak-" + reward.Days) == 1) bonus += reward.Xp;
        return bonus;
    }

    private static string IgnoreInsert(string sql) =>
        sql.Replace("INSERT INTO", "INSERT OR IGNORE INTO", StringComparison.Ordinal);

    public object Visit(string user)
    {
        using var db = Open(); using var transaction = db.BeginTransaction();
        int bonus = RecordDay(db, transaction, user, false);
        Execute(db, transaction, "UPDATE RankingUsers SET Xp=Xp+@p0 WHERE Id=@p1", bonus, user);
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
