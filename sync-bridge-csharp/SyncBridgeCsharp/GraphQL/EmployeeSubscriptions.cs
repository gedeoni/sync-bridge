using HotChocolate;
using HotChocolate.Types;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.GraphQL;

public class EmployeeSubscriptions
{
    [Subscribe]
    [Topic]
    public Employee EmployeeCreated([EventMessage] Employee employee) => employee;
}
