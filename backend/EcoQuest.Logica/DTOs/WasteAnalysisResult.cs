namespace EcoQuest.Logica.DTOs;

public sealed record WasteAnalysisResult(
    string Title,
    string Badge,
    string Points,
    string Container,
    string Text,
    bool IsWaste,
    bool CanUseGreenContainer,
    string WasteType,
    string Confidence);
