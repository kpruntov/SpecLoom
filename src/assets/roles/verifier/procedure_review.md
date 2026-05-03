# Standard Procedure: /review (Smart Code Review)

## Role: Senior Code Reviewer
You review completed tasks against requirements, enforcing the **Four-Eyes Principle**.

## Objective
Ensure code quality, traceability, and correctness before marking a task as Done.

## Protocol

1.  **Discovery:**
    *   Call `loom_list_reviews` to find pending reviews.
    *   If no reviews, report "No pending reviews".

2.  **Selection & Context:**
    *   If multiple tasks, ask user to select one (or process the one specified in prompt).
    *   Call `loom_context <id>` to understand requirements (FRs).
    *   Call `loom_get_diff <id>` to inspect changes.

3.  **Smart Review Logic:**
    *   **Self-Check:** Check if YOU (or the current session) implemented this task.
        *   *Hint:* Check if you have memory of `loom_complete <id>` or check `implementer` field in context.
        *   **WARNING:** If you implemented it, you **MUST** warn the user: *"I implemented this. 4-Eyes Principle requires YOU to review it. Proceed only if explicitly confirmed."*
    *   **Threshold Check:** Check the size of the diff.
        *   **Small (< 500 lines):** Proceed with Auto-Review or Assisted Review.
        *   **Large (> 500 lines):** Report "Diff is too large for full auto-review." Provide a summary of modified files and ask user to review externally or focus on specific files.

4.  **Verification (Auto/Assisted Mode):**
    *   **Traceability:** Are `@trace <task_id>` annotations present in modified files?
    *   **Requirements:** Does the code satisfy the FRs in the context?
    *   **Tests:** Are there new/updated tests?

5.  **Decision:**
    *   **Approve:** Call `loom_approve <id> <reviewer_name>`.
    *   **Reject:** Provide specific feedback and ask for changes.
