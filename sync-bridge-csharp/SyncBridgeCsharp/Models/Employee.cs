using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SyncBridgeCsharp.Models;

[Table("employees")]
public class Employee
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("employee_id")]
    public string EmployeeId { get; set; } = string.Empty;

    [Required]
    [Column("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Column("middle_name")]
    public string? MiddleName { get; set; }

    [Required]
    [Column("last_name")]
    public string LastName { get; set; } = string.Empty;

    [Column("gender")]
    public string? Gender { get; set; }

    [Required]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("phone_number")]
    public string? PhoneNumber { get; set; }

    [Column("date_of_birth")]
    public DateTimeOffset? DateOfBirth { get; set; }

    [Column("nationality")]
    public string? Nationality { get; set; }

    [Column("job_level")]
    public string? JobLevel { get; set; }

    [Column("department")]
    public string? Department { get; set; }

    [Column("location")]
    public string? Location { get; set; }

    [Column("bank_account_number")]
    public string? BankAccountNumber { get; set; }

    [Column("company")]
    public string? Company { get; set; }

    [Column("job_title")]
    public string? JobTitle { get; set; }

    [Column("cost_center")]
    public string? CostCenter { get; set; }

    [Column("start_date")]
    public DateTimeOffset? StartDate { get; set; }

    [Column("employee_status")]
    public string? EmployeeStatus { get; set; }

    [Column("manager_id")]
    public string? ManagerId { get; set; }

    [Column("manager_email")]
    public string? ManagerEmail { get; set; }

    [Column("last_modified_on")]
    public DateTimeOffset? LastModifiedOn { get; set; }

    [Column("last_modified")]
    public long? LastModified { get; set; }

    [NotMapped]
    public string FullName
    {
        get
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(FirstName)) parts.Add(FirstName);
            if (!string.IsNullOrWhiteSpace(MiddleName)) parts.Add(MiddleName);
            if (!string.IsNullOrWhiteSpace(LastName)) parts.Add(LastName);
            return string.Join(" ", parts);
        }
    }
}
