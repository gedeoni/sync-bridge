using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.Data;

public class SyncDbContext : DbContext
{
    public SyncDbContext(DbContextOptions<SyncDbContext> options) : base(options)
    {
    }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<SyncHistory> SyncHistories => Set<SyncHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique indexes
        modelBuilder.Entity<Customer>()
            .HasIndex(c => c.Email)
            .IsUnique();

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name)
            .IsUnique();

        modelBuilder.Entity<Order>()
            .HasIndex(o => o.OrderNumber)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.Email)
            .IsUnique();

        // Enum string conversion
        var syncStatusConverter = new ValueConverter<SyncStatus, string>(
            v => v == SyncStatus.Successful ? "successful" :
                 v == SyncStatus.Failed ? "failed" :
                 v == SyncStatus.Invalid ? "invalid" : "pending_retry",
            v => v == "successful" ? SyncStatus.Successful :
                 v == "failed" ? SyncStatus.Failed :
                 v == "invalid" ? SyncStatus.Invalid : SyncStatus.PendingRetry
        );

        modelBuilder.Entity<SyncHistory>()
            .Property(e => e.Status)
            .HasConversion(syncStatusConverter);

        // Relationships & Cascades
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Customer)
            .WithMany()
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany()
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
