namespace EcoQuest.Logica.Exceptions;

public sealed class InvalidWasteImageException : Exception
{
    public InvalidWasteImageException(string message)
        : base(message)
    {
    }
}
