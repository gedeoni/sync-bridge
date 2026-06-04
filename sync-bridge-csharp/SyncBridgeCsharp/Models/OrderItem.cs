using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SyncBridgeCsharp.Models;

[Table("order_items")]
public class OrderItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("order_id")]
    public long OrderId { get; set; }

    [ForeignKey(nameof(OrderId))]
    [JsonIgnore] // Avoid circular reference issues in JSON
    public Order? Order { get; set; }

    [Required]
    [Column("product_id")]
    public long ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Required]
    [Column("qty")]
    public int Qty { get; set; }

    [Required]
    [Column("unit_price")]
    public int UnitPrice { get; set; }

    [NotMapped]
    public int LineTotal => Qty * UnitPrice;
}
