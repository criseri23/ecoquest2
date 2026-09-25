using System.Net;
using EcoQuest.Datos.Entities;
using EcoQuest.Datos.Repositories;

void Check(bool condition, string name)
{
    if (!condition) throw new Exception(name);
    Console.WriteLine("PASS " + name);
}

var offline = new OfficialRecyclingPointRepository(new FakeFactory(false));
var points = await offline.GetAllAsync(default);
Check(points.OfType<StreetContainerPoint>().Count(p => p.ContainerColor == "verde") > 4000,
    "offline catalog includes the complete green-container file, not the 1000-record EPOK subset");
Check(points.Select(p => p.Id).Distinct().Count() == points.Count, "stable unique point IDs");
Check(points.All(p => p.Lat is > -34.75 and < -34.5 && p.Lng is > -58.6 and < -58.3), "CABA coordinates are valid");
foreach (var area in new[] { ("Agronomia", -34.5914, -58.4891), ("Caballito", -34.6175, -58.4347), ("Belgrano", -34.5618, -58.4540) })
    Check(points.Any(p => p is StreetContainerPoint { ContainerColor: "verde" } &&
        Math.Abs(p.Lat - area.Item2) < .004 && Math.Abs(p.Lng - area.Item3) < .004), "nearby green containers in " + area.Item1);

var partial = await new OfficialRecyclingPointRepository(new FakeFactory(true)).GetAllAsync(default);
Check(partial.Any(p => p.Id == "live-black"), "one failed layer does not discard another successful layer");
Check(partial.OfType<SpecialGreenPoint>().Any(), "failed layer uses official bundled copy");
Check(partial.First(p => p.Id == "live-black").Address == "DIRECCION 123", "black-container address is parsed");
using var cancelled = new CancellationTokenSource();
cancelled.Cancel();
try { await new OfficialRecyclingPointRepository(new FakeFactory(false)).GetAllAsync(cancelled.Token); throw new Exception("Cancellation swallowed"); }
catch (OperationCanceledException) { Console.WriteLine("PASS caller cancellation is preserved"); }

sealed class FakeFactory(bool partial) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(new Handler(partial));
}
sealed class Handler(bool partial) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (partial && request.RequestUri!.Query.Contains("contenedores_negros"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""
            {"features":[{"id":"live-black","geometry":{"coordinates":[-58.4,-34.6]},"properties":{"DireccionNormalizada":"DIRECCION 123"}}]}
            """) });
        throw new HttpRequestException("Offline fixture");
    }
}
