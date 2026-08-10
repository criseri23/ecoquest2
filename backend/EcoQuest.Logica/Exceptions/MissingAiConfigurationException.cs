namespace EcoQuest.Logica.Exceptions;

public sealed class MissingAiConfigurationException : Exception
{
    public MissingAiConfigurationException(string message)
        : base(message)
    {
    }
}
