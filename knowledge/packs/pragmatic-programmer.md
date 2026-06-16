# The Pragmatic Programmer — AI Code Review Guidelines

Based on *The Pragmatic Programmer* by Andrew Hunt and David Thomas.

---

## 1. DRY — Don't Repeat Yourself

**Core principle:** "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."

**Flag (Bad):**
- The same logic, formula, or rule expressed in two or more places — even if the code looks different.
- Constants defined multiple times: `MAX_SIZE = 100` in three different files.
- Validation rules duplicated between frontend, backend, and database.
- The same data transformation written in multiple functions.
- Documentation that duplicates what the code clearly says (doc drift is worse than no doc).
- Generated code duplicating manually maintained code — one source of truth should generate the other.

**Praise (Good):**
- A single source of truth: business rules, formulas, and constants defined exactly once.
- Accessor functions that centralize logic — changing a field's computation requires changing one place.
- Configuration-driven behavior instead of hardcoded repeated magic values.

**Suggest:** When duplication is found, identify the single authoritative location and propose consolidation.

---

## 2. Orthogonality

**Core principle:** Two components are orthogonal if changes in one do not affect the other.

**Flag (Bad):**
- A change to the database schema requires changes to the UI layer directly.
- A module that modifies global state as a side effect.
- Functions that do input, processing, AND output — three responsibilities, three sources of coupling.
- Code that depends on specific ordering of method calls (temporal coupling).
- Mixing UI logic with business logic in the same class.
- Hardcoded environment assumptions: specific file paths, hostnames, or env-specific constants in production code.

**Praise (Good):**
- Layered architecture where each layer knows only about the layer directly below it.
- Dependency injection: components receive their dependencies rather than creating them.
- Pure functions: given the same input, always return the same output with no side effects.
- Configuration isolated from code: environment variables, config files, secrets management.
- Components that can be tested in isolation without large dependency graphs.

---

## 3. Don't Live with Broken Windows

**Flag (Bad):**
- Disabled tests (`@Ignore`, `skip`, `xit`) with no explanatory comment or ticket reference.
- TODO/FIXME comments that are weeks or months old without resolution.
- Dead code that is clearly unreachable or unused.
- Workarounds that have become permanent solutions without ever being addressed properly.
- Mixed coding styles within the same file or module.
- Compiler warnings, linter warnings, or deprecation notices being ignored.

**Praise (Good):**
- PRs that clean up small issues in code they touch even when not directly related to the ticket.
- Removal of TODO comments by actually implementing the missing piece.
- Replacing a workaround with a proper solution.

---

## 4. ETC — Easier to Change

**Core principle:** Good design is easier to change than bad design.

**Flag (Bad):**
- Tight coupling that makes changing one component require changing many others.
- Concrete dependencies instead of interfaces: hardcoding `PostgresDatabase` where a `Database` interface could be used.
- Business rules encoded deep in infrastructure layers (pricing logic in the SQL query, not the domain model).
- Large, monolithic methods that must be entirely rewritten to accommodate a minor variation.

**Praise (Good):**
- Code that isolates decisions that might change: databases, message brokers, external APIs hidden behind interfaces.
- Small, focused functions that can be composed differently for new requirements.
- Configuration over code for values that change between environments or over time.

---

## 5. Design by Contract / Assertive Programming

**Flag (Bad):**
- Functions that silently accept bad input and produce wrong output without signaling the error.
- Missing validation of external data (API responses, user input, config values) before use.
- Code that assumes things that should be verified: `items[0]` without checking if `items` is non-empty.
- Using exceptions for normal flow control (e.g., exceptions to signal empty results).

**Praise (Good):**
- Precondition checks at function entry: validate inputs and fail early.
- Type systems, value objects, and enums used to make invalid states unrepresentable.
- Assertions used to document and enforce invariants.
- Crash early: a function that detects a violated contract fails loudly and immediately.

---

## 6. Don't Program by Coincidence

**Flag (Bad):**
- Code that "works" but nobody on the team can explain why.
- Workarounds that fix the symptom without understanding the root cause: adding `sleep(100)` to avoid a race condition.
- Copy-pasted code that works by accident but doesn't fit the new context.
- Ignoring a compiler warning because "it still runs fine."
- Tests that pass for the wrong reason (testing implementation rather than behavior).

**Praise (Good):**
- Code accompanied by a comment or commit message explaining *why* a non-obvious approach was chosen.
- Bug fixes accompanied by a test that reproduces the bug first.
- Explicit documentation of assumptions: `// Assumes items are sorted by date descending`.

---

## 7. Reversibility — Avoiding Irreversible Decisions

**Flag (Bad):**
- Hardcoded vendor-specific APIs or formats deep in business logic.
- Codebase tightly coupled to a specific database, queue, or cloud provider without abstraction.
- Configuration values (URLs, credentials, feature flags) hardcoded in source rather than externalized.
- Architectural decisions that make it structurally impossible to swap components.

**Praise (Good):**
- Adapters and interfaces that isolate third-party dependencies.
- Use of environment variables or a config service for deployment-specific values.
- Repository pattern or similar to isolate persistence from domain logic.
- Feature flags that allow behavior to change without a code release.

---

## 8. Automated Testing

**Flag (Bad):**
- New features or bug fixes with no automated tests.
- Tests that only cover the happy path — no edge cases, boundary conditions, or error paths.
- Tests that require specific environment setup (hardcoded paths, live databases) to run.
- Tests that are interdependent — they must run in a specific order.
- Slow test suites (minutes for unit tests) that discourage frequent execution.
- 100% coverage with trivial assertions — coverage as the only quality metric is meaningless.

**Praise (Good):**
- Test suite that runs quickly for unit tests.
- Tests that are independent and can run in any order.
- Tests written from the perspective of the caller (design-by-contract mindset).
- Failing test added first when fixing a bug, proving the bug is reproducible.

**Suggest:** When test coverage is absent for critical paths, flag it explicitly and ask the author to justify.

---

## 9. Configuration and Metadata

**Flag (Bad):**
- Hardcoded values differing between environments: `"http://localhost:5432"` in production code.
- Business rules hardcoded as constants in compiled code when they could change without a redeploy.
- Feature toggles implemented as hardcoded `if (ENV == "production")` checks.
- **Secrets (API keys, passwords, tokens) committed to source control — critical security flag.**

**Praise (Good):**
- All environment-specific values read from environment variables or a config service.
- Secrets managed via dedicated secret management (Vault, AWS Secrets Manager, env injection).
- Business metadata externalized so it can be changed without a code release.

---

## 10. Concurrency and Shared State

**Flag (Bad):**
- Shared mutable state accessed from multiple threads without synchronization.
- Global variables modified by multiple components.
- Race conditions masked by sleep/retry loops rather than proper synchronization.
- Temporal coupling: "you must call `initialize()` before `process()` or it breaks" — with no enforcement.

**Praise (Good):**
- Immutable data structures where state does not need to change.
- Explicit synchronization mechanisms when shared mutable state is unavoidable.
- Decoupling time dependencies so components don't rely on ordering of operations across threads.

---

## 11. PR Quality

**Flag:**
- PRs too large to review meaningfully (500+ lines changed) — suggest splitting.
- PRs with no description or context — reviewer cannot assess intent.
- PRs mixing unrelated changes: refactoring + new feature + bug fix in one PR.

**Praise:**
- Small, focused PRs with clear descriptions.
- PRs that include before/after examples for non-obvious changes.
- CI/CD pipelines that run tests automatically on every PR.
- Linting and formatting enforced in CI — not just recommended.
