using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SyncBridgeCsharp.Models;

[Table("orders")]
public class Order
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("order_number")]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    [Column("customer_id")]
    public long CustomerId { get; set; }

    [ForeignKey(nameof(CustomerId))]
    public Customer? Customer { get; set; }

    public List<OrderItem> Items { get; set; } = new();

    [Required]
    [Column("status")]
    public string Status { get; set; } = string.Empty;

    [Required]
    [Column("currency")]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [Required]
    [Column("amount")]
    public int Amount { get; set; }

    [Column("placed_at")]
    public DateTime PlacedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
