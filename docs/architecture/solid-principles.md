# SOLID Principles Implementation

Dokumentasi implementasi SOLID principles dalam Laundry SaaS Platform.

## 📐 SOLID Overview

SOLID adalah prinsip-prinsip desain yang membuat kode lebih maintainable, scalable, dan mudah di-test.

## 🔷 S - Single Responsibility Principle

Setiap class/module memiliki satu alasan untuk berubah.

### Implementasi

#### Repositories
```typescript
// ✅ Good - Single responsibility: Data access
class OrderRepository {
  async findAll(outletId: string): Promise<Order[]> { }
  async findById(id: string, outletId: string): Promise<Order | null> { }
}

// ❌ Bad - Multiple responsibilities
class OrderRepository {
  async findAll() { }
  async calculateTotal() { } // Business logic!
  async sendEmail() { } // Notification logic!
}
```

#### Services
```typescript
// ✅ Good - Single responsibility: Business logic
class OrderService {
  async createOrder(data: CreateOrderDTO): Promise<Order> {
    // Business logic only
  }
}

// ❌ Bad - Data access mixed with business logic
class OrderService {
  async createOrder() {
    await prisma.order.create(); // Direct DB access!
  }
}
```

## 🔷 O - Open/Closed Principle

Software entities terbuka untuk ekstensi, tertutup untuk modifikasi.

### Implementasi: Payment Processors

```typescript
// Interface - Open for extension
interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<boolean>;
}

// ✅ Good - Can add new processors without modifying existing code
class MidtransProcessor implements PaymentProcessor { }
class XenditProcessor implements PaymentProcessor { }
class ManualProcessor implements PaymentProcessor { }
```

## 🔷 L - Liskov Substitution Principle

Subtypes harus dapat menggantikan base types tanpa merusak fungsionalitas.

### Implementasi: Repositories

```typescript
// Base interface
interface IBaseRepository<T> {
  findById(id: string, outletId?: string): Promise<T | null>;
  findAll(outletId?: string): Promise<T[]>;
}

// ✅ Good - Can substitute any repository
class OrderRepository implements IBaseRepository<Order> { }
class OutletRepository implements IBaseRepository<Outlet> { }

// Services can use any repository implementation
class OrderService {
  constructor(private repository: IBaseRepository<Order>) { }
}
```

## 🔷 I - Interface Segregation Principle

Clients tidak boleh dipaksa bergantung pada interface yang tidak mereka gunakan.

### Implementasi: Service Interfaces

```typescript
// ✅ Good - Small, focused interfaces
interface IOrderService {
  createOrder(data: CreateOrderDTO): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
}

interface IOrderReportingService {
  getDailyReport(outletId: string, date: Date): Promise<Report>;
  getMonthlyReport(outletId: string, month: number): Promise<Report>;
}

// ❌ Bad - Large interface forcing implementation of unused methods
interface IOrderService {
  createOrder(): Promise<Order>;
  updateOrderStatus(): Promise<Order>;
  generateInvoice(): Promise<Invoice>; // Not all services need this
  sendNotification(): Promise<void>; // Not all services need this
}
```

## 🔷 D - Dependency Inversion Principle

High-level modules tidak boleh bergantung pada low-level modules. Keduanya harus bergantung pada abstractions.

### Implementasi: Dependency Injection

```typescript
// ✅ Good - Depend on abstractions
class OrderService {
  constructor(
    private orderRepository: IOrderRepository, // Interface, not implementation
    private paymentService: IPaymentService    // Interface, not implementation
  ) {}
}

// ❌ Bad - Depend on concrete implementations
class OrderService {
  constructor(
    private orderRepository: OrderRepository, // Concrete class
    private paymentService: PaymentService    // Concrete class
  ) {}
}
```

## 📁 Folder Structure Reflecting SOLID

```
src/
├── repositories/        # Single Responsibility: Data access
│   └── interfaces/      # Dependency Inversion: Abstractions
├── services/            # Single Responsibility: Business logic
│   └── interfaces/      # Dependency Inversion: Abstractions
├── controllers/         # Single Responsibility: HTTP handling
├── components/          # Single Responsibility: UI rendering
└── types/              # Interface Segregation: Focused types
```

## ✅ Best Practices

1. **One Class, One Responsibility** - Setiap class hanya melakukan satu hal
2. **Use Interfaces** - Bergantung pada abstractions, bukan implementations
3. **Composition over Inheritance** - Gunakan composition untuk reusability
4. **Small Interfaces** - Buat interface yang kecil dan focused
5. **Dependency Injection** - Inject dependencies melalui constructor

## 📚 Referensi

- [SOLID Principles - Wikipedia](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
