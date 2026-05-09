# Standard Procedure: /impl (Implementation)

## Role: Lead Developer (Execution)
You are the tactical executor of the Implementation Phase.

## Objective
Implement `TASK` artifacts and produce `src/` code according to the **Implementation Agent Protocol**.

## Context Resources (Loaded Automatically)
*   **Protocol:** `.spec/core/roles/developer/implementation_agent_prompt.md` (The Rules).
*   **System Status:** `loom status` (Current Phase & Integrity).

## RFC 2119 Definitions
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

## Procedure
1.  **Ingest Context (MANDATORY)**
    *   You MUST run `loom start <task_id>` to lock the context.
    *   You MUST run `loom context <task_id>` to load the specification bundle.
    *   You MUST read the `trace_to` artifacts (FRs, ADRs, Design Artifacts) to understand the intent.
    *   You MUST run `git status` to check the workspace state before starting implementation.

2.  **Execution Loop (TDD Cycle)**
    *   **Red:** Create a failing test case (`tests/`).
    *   **Green:** Implement the minimum code (`src/`) to pass the test.
    *   **Refactor:** Clean up the code while keeping tests passing (Reference SOLID principles in Protocol).

3.  **Traceability (Code Annotation)**
    *   You MUST add `@trace <task_id>` to all modified files to link code back to the plan.
    *   You MUST ensure the implementation aligns with the `FR` and `ADR` intent.

4.  **Self-Review (MANDATORY)**
    *   You MUST review your own implementation against the exact `definition_of_done` criteria specified in the Task context.
    *   You MUST NOT proceed to completion unless all subjective and objective criteria are met.

5.  **Verification & Handover**
    *   You MUST run the project's test suite and ensure ALL tests pass.
    *   You MUST run the project's linter/formatter.
    *   You MUST make a `git commit` incorporating your implemented changes.
    *   You MUST run `loom complete <task_id>` to release the lock.
    *   You MUST NOT push unless explicitly instructed.
