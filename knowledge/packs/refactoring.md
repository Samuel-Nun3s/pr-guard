# Refactoring — AI Code Review Guidelines

Based on *Refactoring: Improving the Design of Existing Code* by Martin Fowler.

A core principle: refactoring changes *structure* without changing *observable behavior* — it must be done with tests in place.

---

## 1. Foundational Rules

**Flag (Bad):**
- PRs that mix refactoring with new features or bug fixes in a single commit — impossible to review clearly.
- Refactoring performed without automated test coverage in place.
- Large, monolithic refactoring changes instead of small, incremental steps.

**Praise (Good):**
- Refactoring and feature work separated into distinct commits.
- Small, named, incremental steps where each step leaves the codebase working.
- The Two-Hat discipline: one commit wears the "refactoring hat," another wears the "new feature hat."

---

## 2. Smell: Duplicated Code

**Flag:**
- Identical or near-identical code blocks in two or more places.
- Same algorithm repeated across different methods of the same class.
- Copy-paste with minor variation where parameterization would eliminate duplication.

**Suggest:**
- **Extract Function/Method**: pull duplicated code into a shared, named function.
- **Pull Up Method**: if duplication is in sibling classes, move to the parent.
- **Form Template Method**: if structure is the same but steps differ.

---

## 3. Smell: Long Method

**Flag:**
- Methods longer than 20-30 lines are suspicious; longer than 50 lines is a strong flag.
- Methods that require comments to separate "sections" of logic.
- Methods with 3+ levels of nesting.
- Methods mixing multiple levels of abstraction.

**Suggest:**
- **Extract Function**: pull logical sections into well-named methods.
- **Decompose Conditional**: extract complex `if`/`else` conditions into named methods.
- **Replace Temp with Query**: eliminate temp variables by replacing with method calls.
- **Replace Method with Method Object**: when a method uses many locals that resist extraction.

---

## 4. Smell: Large Class

**Flag:**
- Classes with more than ~7-10 instance variables.
- Classes with more than ~20 methods, especially if clustering into unrelated groups.
- Class names including `Manager`, `Handler`, `Processor`, `Utils`, `Helper` — unclear responsibility.
- Classes that change for multiple unrelated reasons (Divergent Change).

**Suggest:**
- **Extract Class**: identify a coherent subset of fields/methods and extract into a focused class.
- **Extract Subclass**: if the class has features that apply only to some instances.
- **Extract Interface**: identify the subset of methods clients actually use.

---

## 5. Smell: Long Parameter List

**Flag:**
- Functions with 4 or more parameters.
- Multiple parameters that are always passed together (a natural group).
- Boolean or type-code parameters that control the function's behavior.

**Suggest:**
- **Introduce Parameter Object**: group related parameters into a new object/struct.
- **Preserve Whole Object**: pass the containing object rather than extracting its fields.
- **Replace Parameter with Query**: if a parameter can be computed from another argument.
- **Remove Flag Argument**: replace `bool` parameters with two explicitly named methods.

---

## 6. Smell: Divergent Change

**Flag:**
- A single class modified in different ways for different reasons (violates Single Responsibility).
- "If I change the database logic, I touch this class. If I change reporting, I also touch this class."

**Suggest:**
- **Extract Class**: separate divergent responsibilities into distinct classes.
- **Split Phase**: if sequential steps serve different purposes, split into separate modules.

---

## 7. Smell: Shotgun Surgery

**Flag:**
- A single logical change requires touching many different classes.
- Bug fixes spreading modifications across 5+ files for one conceptual issue.

**Suggest:**
- **Move Method / Move Field**: consolidate related behavior into one place.
- **Combine Functions into Class**: group related functions that always move together.

---

## 8. Smell: Feature Envy

**Flag:**
- A method that references data or methods from another class more than from its own.
- Methods calling several getters on another object to perform calculations that belong on that object.

**Suggest:**
- **Move Method**: move the envious method to the class it's most interested in.

---

## 9. Smell: Data Clumps

**Flag:**
- Groups of 3+ data items always appearing together: `(String street, String city, String zip)` everywhere.
- If you deleted one item from the group, the rest would still belong together.

**Suggest:**
- **Introduce Parameter Object**: wrap the clump in a named object (`Address`, `DateRange`).

---

## 10. Smell: Primitive Obsession

**Flag:**
- Using raw strings for things with rules: email addresses, phone numbers, currency codes.
- Multiple primitives representing a single concept: `int day`, `int month`, `int year` instead of a `Date`.
- Integer or string type codes instead of enums or polymorphism.
- Same format validation repeated in multiple places.

**Suggest:**
- **Replace Primitive with Object**: create a small value class (`Money`, `Email`, `PhoneNumber`).
- **Replace Type Code with Enum/Class/Subclass**.

---

## 11. Smell: Switch Statements / Large Conditionals

**Flag:**
- The same `switch` on the same type code appears in multiple places.
- Long `if/else if` chains checking object types or string codes to select behavior.
- Adding a new case requires finding and updating all `switch` statements.

**Suggest:**
- **Replace Conditional with Polymorphism**: move each case's logic to the appropriate subclass.
- **Replace Type Code with State/Strategy**.
- **Introduce Null Object**: replace `if (x == null)` checks with a do-nothing implementation.

---

## 12. Smell: Lazy Class / Dead Code

**Flag:**
- Classes that do almost nothing — one method, no meaningful state.
- Methods that are never called.
- Variables assigned but never read.
- Commented-out code blocks.
- Unreachable branches of `if` statements.
- Speculative generality: abstract classes, extra parameters, hooks for "future use" with no current users.

**Suggest:**
- **Inline Class**: absorb lazy classes into their callers.
- **Remove Dead Code**: delete it — version control preserves history.
- **Collapse Hierarchy**: merge an abstract class with its single concrete implementation.

---

## 13. Smell: Message Chains / Train Wrecks

**Flag:**
- Long chains of method calls: `order.getCustomer().getAddress().getCity().toUpperCase()`.
- Code that navigates object graph structure deeply — tightly coupled to intermediate objects.

**Suggest:**
- **Hide Delegate**: add a method on the intermediate object that provides what the caller actually needs.

---

## 14. Smell: Inappropriate Intimacy

**Flag:**
- Classes that access each other's private fields through reflection or package-private hacks.
- Bidirectional associations where only one direction is actually used.
- Subclasses that depend heavily on parent class internals.

**Suggest:**
- **Move Method / Move Field** to reduce cross-class access.
- **Change Bidirectional Association to Unidirectional**.

---

## 15. Refactoring Techniques to Praise

- **Replace Loop with Pipeline**: using `map`, `filter`, `reduce` instead of imperative loops.
- **Separate Query from Modifier**: functions that return values do not mutate state; functions that mutate state do not return values.
- **Replace Constructor with Factory Function**: when construction logic is complex.
- **Encapsulate Collection**: returning read-only views; providing `add`/`remove` instead of direct collection access.
- **Introduce Null Object**: eliminating null checks with a do-nothing implementation.
- **Split Phase**: clearly separating parsing from processing from output.
