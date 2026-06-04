using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SyncBridgeCsharp.Models;

[Table("sync_history")]
public class SyncHistory
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("payload")]
    public string Payload { get; set; } = string.Empty;

    [Required]
    [Column("status")]
    public SyncStatus Status { get; set; } = SyncStatus.PendingRetry;

    [Column("failure_reason")]
    [MaxLength(255)]
    public string? FailureReason { get; set; }

    [Column("retries")]
    public int Retries { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
