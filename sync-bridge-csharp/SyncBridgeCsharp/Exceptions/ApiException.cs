using System;

namespace SyncBridgeCsharp.Exceptions;

public class ApiException : Exception
{
    public int Status { get; }

    public ApiException(int status, string message) : base(message)
    {
        Status = status;
    }
}
