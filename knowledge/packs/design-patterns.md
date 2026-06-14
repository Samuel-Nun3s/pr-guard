# Design Patterns — AI Code Review Guidelines

Based on *Design Patterns: Elements of Reusable Object-Oriented Software* by Gamma, Helm, Johnson, and Vlissides (GoF).

The goal is NOT to flag any deviation from patterns, but to identify where patterns are misapplied, where they would clearly solve a present problem, or where core OOP principles are violated.

---

## 1. Core GoF Principles

**Flag (Bad):**
- Code tightly coupled to concrete classes rather than interfaces or abstract types.
- Subclassing used purely for code reuse when the relationship is not truly IS-A.
- Inheritance hierarchies with 4+ levels.
- Modifying existing, working classes to add new functionality (violates Open/Closed Principle).
- Client code hardcoding `new ConcreteClass()` everywhere instead of receiving instances through factories or injection.

**Praise (Good):**
- Programming to interfaces: parameter types and field types are interfaces, not concrete classes.
- Composition over inheritance: behavior assembled through object references rather than class extension.
- Open for extension, closed for modification: new behavior added by implementing an interface, not by editing existing classes.

---

## 2. Creational Patterns

### Singleton
**Flag (Bad):**
- Singleton used for convenience (global state) rather than genuine single-instance requirements.
- Mutable Singleton shared across threads without synchronization.
- Singleton holding business state — makes testing impossible (tests cannot reset state between runs).

**Praise (Good):**
- Singleton applied only for truly unique resources (thread pool, registry, logger configuration).
- Prefer passing the instance via dependency injection over `getInstance()` static methods in business logic.

### Factory Method / Abstract Factory
**Flag (Bad):**
- `new ConcreteProduct()` spread throughout business logic when the concrete type may vary.
- `switch`/`if-else` on type codes to instantiate different classes — should be a factory.
- Client code importing and instantiating multiple concrete implementations directly.

**Praise (Good):**
- A factory method or class centralizing all instantiation decisions.
- Adding a new product type requires only adding a new class, not modifying client code.

### Builder
**Flag (Bad):**
- Constructors with 5+ parameters, especially when many are optional (telescoping constructor anti-pattern).
- Constructors with multiple booleans and integers of the same type easy to confuse: `new User("john", true, false, null, 3)`.
- Complex object construction logic scattered across multiple call sites.

**Praise (Good):**
- Builder constructing complex objects step by step with named methods: `User.builder().name("John").role(ADMIN).active(true).build()`.
- Immutable objects built through a Builder, with validation before construction completes.

---

## 3. Structural Patterns

### Adapter
**Flag (Bad):**
- Direct use of a third-party library's concrete classes scattered throughout the codebase — impossible to swap without touching every call site.
- External API calls made directly in domain logic (business rules calling HTTP clients, SDKs, ORMs directly).

**Praise (Good):**
- An adapter interface wrapping all third-party dependencies at the boundary.
- When swapping a vendor or library requires changing only the adapter, not the business logic.

### Decorator
**Flag (Bad):**
- Adding functionality by subclassing: `LoggingFoo extends Foo`, `CachingFoo extends Foo` — class explosion when behaviors must be combined.
- Behavior added by modifying an existing class instead of wrapping it.

**Praise (Good):**
- Decorator used to add cross-cutting concerns (logging, caching, validation, rate-limiting) without modifying base classes.
- Decorators implementing the same interface as the decorated object — transparent to callers.
- Composition of decorators: `new LoggingRepo(new CachingRepo(new PostgresRepo(...)))`.

### Facade
**Flag (Bad):**
- Client code interacting directly with a complex subsystem across multiple calls to accomplish one user-facing operation.
- Leaking internal subsystem types into the client API.

**Praise (Good):**
- A Facade class providing a simple, coherent interface to a complex subsystem.
- Facade used at module/service boundaries to hide implementation details.

### Proxy
**Flag (Bad):**
- Lazy-loading, access control, or remote invocation logic mixed directly into the business object.

**Praise (Good):**
- Virtual Proxy deferring expensive resource loading until actually needed.
- Protection Proxy enforcing access control without modifying the real subject.

---

## 4. Behavioral Patterns

### Strategy
**Flag (Bad):**
- Long `if/else if` or `switch` blocks selecting algorithm variants based on a type code or flag.
- Algorithms hardcoded into a class when they might need to vary independently.
- Different behaviors passed via boolean/enum parameters that fundamentally change what a function does.

**Praise (Good):**
- Strategy encapsulating a family of algorithms: `sorter.sort(data)` where `sorter` can be `QuickSort`, `MergeSort`, etc.
- Strategies injected at construction time — the context is decoupled from implementations.
- New algorithm variants added by creating a new Strategy class, without touching the context class.

### Observer
**Flag (Bad):**
- Direct method calls from one component to another when the caller shouldn't need to know who is listening.
- Event systems implemented with hardcoded lists of dependent update calls.
- Memory leaks: observers never unsubscribed/deregistered when destroyed.

**Praise (Good):**
- Observer/event bus decoupling event producers from consumers.
- Clear contract: observers subscribe to specific event types; the subject doesn't know concrete observer types.

### Command
**Flag (Bad):**
- Operations needing undo/redo implemented as direct method calls with no encapsulation.
- Request queuing or scheduling coupled to specific operation implementations.

**Praise (Good):**
- Command used when operations need to be queued, logged, undone, or executed remotely.
- Commands encapsulating all information needed to execute without runtime lookups.

### Template Method
**Flag (Bad):**
- Identical algorithmic structure duplicated in multiple subclasses, with only specific steps varying.
- Copy-paste code between sibling classes differing in only one or two method calls.

**Praise (Good):**
- Template Method defining an algorithm skeleton in a base class, deferring variable steps to subclasses.
- Prefer Strategy (composition) over Template Method when flexibility matters — Template Method locks hierarchy.

### State
**Flag (Bad):**
- Booleans or enums representing object state combined with large `if/else` chains checking state in every method.
- State logic spread across the entire class rather than encapsulated.
- A class with many fields only valid in certain states (temporary field smell).

**Praise (Good):**
- State pattern used when an object's behavior changes substantially depending on its state.
- Each state encapsulated in a dedicated State class with its own methods.
- Transitions between states made explicit and enforced.

### Chain of Responsibility
**Flag (Bad):**
- Long `if/else if` chains selecting handlers — adding a new handler requires modifying the chain.
- Request processing logic tightly coupled to specific handler implementations.

**Praise (Good):**
- Chain of Responsibility for middleware, processing pipelines, or escalation logic.
- Each handler focused on one concern, with clear pass-or-handle logic.
- The chain assembled externally (dependency injection), not hardcoded inside handlers.

---

## 5. Pattern Misuse — Flag as Overengineering

**Flag (Bad):**
- A factory for a single, concrete, never-varying product — no polymorphism needed.
- Singleton for an object that is simply convenient globally but has no uniqueness requirement.
- Observer with a single hardcoded observer — just use a direct call.
- Abstract Factory when there is only one product family and no realistic prospect of adding another.
- Strategy pattern where there is currently only one algorithm and no plans to add another.
- Command pattern for operations that will never need queuing, undo, or replay.
- Decorator chain for concerns that a framework (middleware, AOP) already handles natively.

**Rule:** Patterns solve present, demonstrated problems — not hypothetical future requirements. Flag when a pattern adds structural complexity without delivering tangible benefit today.

**Praise (Good):**
- Patterns introduced only when the problem they solve is clearly present.
- Refactoring toward a pattern incrementally as complexity grows, rather than imposing it upfront.
- Pattern choice justified in the PR description or a code comment.

---

## 6. SOLID Principles

### Single Responsibility (S)
- **Flag:** Classes or modules with multiple unrelated reasons to change.
- **Praise:** Every class has a single, clearly stated purpose.

### Open/Closed (O)
- **Flag:** Adding new behavior by modifying existing classes (editing `switch` cases, adding `if` blocks to existing methods).
- **Praise:** New behavior added by creating new classes/implementations accepted via interfaces.

### Liskov Substitution (L)
- **Flag:** Subclasses overriding methods in ways that violate the parent's contract: throwing exceptions where the parent doesn't, changing return type semantics, ignoring parameters.
- **Praise:** Subclasses usable anywhere the parent is used, without callers knowing the concrete type.

### Interface Segregation (I)
- **Flag:** Fat interfaces with many methods where clients only use a subset — forces clients to depend on things they don't need.
- **Praise:** Small, focused interfaces — each client depends only on the methods it uses.

### Dependency Inversion (D)
- **Flag:** High-level modules importing and depending directly on low-level modules (domain logic importing database libraries directly).
- **Praise:** High-level modules depending on abstractions (interfaces), with concrete implementations injected from outside.
