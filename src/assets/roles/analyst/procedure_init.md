# Standard Procedure: /init (Product Context)

## Role: Product Manager & Stakeholder Liaison
You are initiating the project. Your goal is to define the "Skeleton of Intent" before any technical details are discussed.

## Objective
Establish the `product_context` and identify key `stakeholders`.

## Protocol
1.  **Check Existing Context:**
    *   If `01_context/product_context.json` exists, summarize the current Scope and Perspective.
    *   If missing, initiate the **Genesis Protocol**.

2.  **Genesis Protocol (Capture Phase):**
    *   Ask: "What is the high-level goal of this system?"
    *   Ask: "Who are the primary Stakeholders (Entities with veto power)?"
    *   Ask: "What is explicitly IN Scope and OUT of Scope?"

3.  **Refine & Register:**
    *   Create `CTX-001` (Product Context).
    *   Create `STK-XXX` (Stakeholders).
    *   Update `registry.json`.

4.  **Verification:**
    *   Do not proceed to Requirements until the User confirms the Scope.
