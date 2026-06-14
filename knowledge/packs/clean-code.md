# Clean Code — AI Code Review Guidelines

Based on *Clean Code* by Robert C. Martin.

---

## 1. Naming

**Flag (Bad):**
- Single-letter variable names outside loop counters: `d`, `x`, `tmp` as field names.
- Abbreviated or cryptic names: `usrMgr`, `dtPrc`, `calc2`, `data`, `info`, `manager`.
- Hungarian notation: `strName`, `intCount`, `bIsValid`.
- Boolean variables without question phrasing: `flag`, `check`, `status` — prefer `isReady`, `hasPermission`, `canRetry`.
- Names that require a comment to understand their purpose.
- Meaningless distinctions: `ProductInfo` vs `ProductData` holding the same thing; `a1`, `a2` as parameters.
- Non-pronounceable names: `genymdhms`, `DtaRcrd102`.
- Magic numbers or string literals inline without a named constant: `if (days > 7)`, `if (type == 3)`.

**Praise (Good):**
- Names that read like sentences: `if (user.isEligibleForRefund())`.
- Consistent vocabulary per concept: always `fetch` or always `retrieve`, never mixing.
- Domain-meaningful names: `AccountLedger`, `PermitApplication`, `InvoiceLineItem`.
- Named constants for non-trivial literals: `MAX_RETRY_ATTEMPTS = 3`, `DEFAULT_TIMEOUT_MS = 5000`.
- Boolean names that form questions: `isEmpty`, `hasExpired`, `isAuthenticated`.

---

## 2. Functions

**Flag (Bad):**
- Functions longer than ~20 lines — the longer, the stronger the flag.
- Functions doing more than one thing: mixing data retrieval, business logic, and formatting.
- Flag arguments (`boolean` parameters that switch behavior): split into two named functions.
- Output arguments: modifying a passed object instead of returning a value.
- Functions with more than 3 parameters — suggest a parameter object.
- Side effects hidden inside functions named as queries: `checkPassword()` that also initializes a session.
- Functions mixing levels of abstraction: high-level orchestration interleaved with low-level details.
- `switch` statements not hidden behind polymorphism appearing in multiple places.
- Deep nesting (3+ levels of `if`/`for`/`while`) — suggest early returns or extraction.

**Praise (Good):**
- Functions that do exactly one thing and do it well.
- Functions with zero or one argument.
- Functions whose name precisely describes what they do: `calculateMonthlyInterest()`.
- Use of early return / guard clauses to avoid nesting.
- No side effects — a function that returns a value does not also mutate global state.
- Separation of command (mutates state) and query (returns state) — never both.

---

## 3. Comments

**Flag (Bad):**
- Redundant comments repeating what the code says: `// Increment i by 1` above `i++`.
- Commented-out dead code — remove it, version control has the history.
- Closing brace comments: `} // end of for loop` — sign the block is too long.
- Misleading comments describing behavior different from what the code actually does.
- Long-standing TODO/FIXME comments without resolution.
- Journal-style comments tracking edits (that's what git log is for).

**Praise (Good):**
- Comments explaining *why* a non-obvious decision was made, not *what* the code does.
- Warning comments: `// This test takes several minutes — don't run on every build`.
- Clarification comments for inherently obscure algorithms with a reference to the source.
- Well-placed JSDoc/docstring on public APIs documenting contracts, parameters, and edge cases.

**Suggest:**
- When a comment explains *what* the code does, rename the function/variable so the comment is unnecessary.

---

## 4. Code Structure and Formatting

**Flag (Bad):**
- Lines longer than ~120 characters.
- Related concepts separated by large vertical distances.
- Instance variables declared in the middle of the class rather than at the top.
- Inconsistent formatting style within the same file.

**Praise (Good):**
- Files following the newspaper metaphor: high-level things at the top, details below.
- Consistent vertical spacing — blank lines between logically distinct sections.
- Variables declared as close as possible to their first use.
- Caller functions defined above callee functions in the file.

---

## 5. Classes and Objects

**Flag (Bad):**
- Classes with more than one responsibility: a `UserManager` that handles auth, sends emails, and formats profiles.
- Large classes with many instance variables (10+).
- Classes exposing internal data structures directly (getters returning raw mutable collections).
- Deep inheritance hierarchies (more than 2-3 levels) without clear IS-A justification.
- Law of Demeter violations / train wrecks: `a.b().c().d()`.

**Praise (Good):**
- Classes with a single, focused responsibility expressed by their name.
- Small classes with few instance variables.
- Data hiding: internal state accessed only through well-defined methods.
- Dependency injection instead of hardcoded dependencies.

---

## 6. Error Handling

**Flag (Bad):**
- Returning `null` from methods — forces callers to check and leads to null errors.
- Passing `null` as arguments.
- Using error codes or return codes instead of exceptions.
- Catching exceptions and swallowing them silently: `catch (e) {}`.
- Generic `catch (Exception e)` blocks hiding the actual exception type.
- Error handling mixed into business logic.

**Praise (Good):**
- Specific exception types describing the error condition clearly.
- Exceptions thrown early with meaningful messages.
- Use of Null Object / Special Case pattern instead of returning `null`.
- Try/catch blocks that are small and focused.

---

## 7. Tests

**Flag (Bad):**
- Test methods with no assertions.
- Tests that depend on execution order.
- Tests that hit databases, file systems, or external APIs without isolation.
- Test names that are not descriptive: `test1()`, `testMethod()`.
- Disabled tests (`@Ignore`, `skip`) without a dated explanation.
- New code without any tests.

**Praise (Good):**
- Tests following FIRST: Fast, Independent, Repeatable, Self-Validating, Timely.
- Test method names describing the scenario: `whenUserIsInactive_shouldThrowAuthException()`.
- One logical concept per test.
- Readable tests with clear Arrange/Act/Assert sections.

---

## 8. General Heuristics

**Flag (Bad):**
- Rigidity: a small change requires cascading changes across many files.
- Needless complexity: abstractions, patterns, or configuration without a clear present need (YAGNI).
- Needless repetition: copy-paste code, duplicate logic.
- Dead code: unreachable code, unused imports, unused variables, methods never called.

**Praise (Good):**
- Boy Scout Rule applied: the PR leaves the codebase slightly cleaner than it found it.
- Root-cause fixes: problems solved at their source, not patched at the symptom site.
- Consistent style across the entire PR matching the surrounding codebase.
