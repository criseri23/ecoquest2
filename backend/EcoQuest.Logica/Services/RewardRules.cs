using System.Text.Json;
namespace EcoQuest.Logica.Services;

public sealed class RewardRules
{
    public string TimeZone { get; set; } = "America/Argentina/Buenos_Aires";
    public int VisitXp { get; set; }
    public int RecyclingXp { get; set; }
    public int ChallengeXp { get; set; }
    public int LevelXp { get; set; }
    public int RepeatStreakDays { get; set; }
    public int RepeatStreakXp { get; set; }
    public List<StreakReward> StreakRewards { get; set; } = [];
    public List<MissionReward> Missions { get; set; } = [];
    public static RewardRules Load(string path) => JsonSerializer.Deserialize<RewardRules>(File.ReadAllText(path), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    public string Today() => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(TimeZone)).ToString("yyyy-MM-dd");
    public int Level(int xp) => 1 + Math.Max(0, xp) / LevelXp;
    public int Streak(IEnumerable<string> dates, string today)
    {
        var days = dates.ToHashSet();
        var date = DateOnly.Parse(today);
        if (!days.Contains(today)) date = date.AddDays(-1);
        int count = 0;
        while (days.Contains(date.ToString("yyyy-MM-dd"))) { count++; date = date.AddDays(-1); }
        return count;
    }
    public List<StreakReward> RewardsUpTo(int days)
    {
        var rewards = new List<StreakReward>(StreakRewards);
        for (int day = StreakRewards.Max(r => r.Days) + RepeatStreakDays; day <= days + RepeatStreakDays; day += RepeatStreakDays)
            rewards.Add(new StreakReward { Days = day, Xp = RepeatStreakXp });
        return rewards;
    }
}
public sealed class StreakReward { public int Days { get; set; } public int Xp { get; set; } }
public sealed class MissionReward { public string Id { get; set; } = ""; public string Name { get; set; } = ""; public int Goal { get; set; } public int Reward { get; set; } }
