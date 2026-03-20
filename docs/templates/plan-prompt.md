# Plan: [Epic N] — [Feature Slug]

<!--
  PLAN-PROMPT TEMPLATE
  ====================
  This is a copyable skeleton for `.prompt.md` files used outside GitHub Issues —
  e.g., Copilot Chat in plan mode, local agent runs, or ad-hoc planning sessions.

  Audience chain:
    1. A PLANNING agent (or human) PRODUCES this document
    2. An IMPLEMENTATION agent (coding-agent) CONSUMES it

  The structure mirrors the Sub-Issue GitHub template and the existing
  plan-partParameterTemplate.prompt.md — the three formats are intentionally
  interchangeable so agents parse them identically.

  Naming convention:
    plan-<epicN>-<feature-slug>.prompt.md
    Examples:
      plan-epic2-part-category-fk.prompt.md
      plan-epic3-allocation-return-flow.prompt.md
      plan-epic4-csv-import-wizard.prompt.md

  Usage:
    1. Copy this file to the repo root
    2. Rename per the convention above
    3. Fill in each section
    4. Open in Copilot Chat or attach to an agent run
-->

## Summary

<!--
  What / How / Why in 2–4 sentences.
  State the key constraint or design decision up front.
  The coding-agent reads this FIRST for orientation.

  Good example (from plan-partParameterTemplate.prompt.md):
    "`Category.parameterSchema` acts as a Parameter Template: it pre-populates
    `Part.parameters` in the UI. The template is a suggestion, not an enforcer.
    No validation is performed against the category schema."
-->



---

## Steps

<!--
  Numbered implementation steps.
  Each step MUST be anchored to a specific file path and — where useful — a
  symbol name (model, function, type, component).

  Format:
    ### N. Verb-phrase — `path/to/file`
    - Bullet describing the change
    - Another bullet with detail
    - Code snippet if helpful

  Keep steps ordered by dependency: if Step 3 requires the migration from
  Step 1, put them in that order so the coding-agent can execute linearly.
-->

### 1. [Verb-phrase] — `path/to/file`

- 

### 2. [Verb-phrase] — `path/to/file`

- 

### 3. [Verb-phrase] — `path/to/file`

- 

---

## Further Considerations

<!--
  Edge cases, sync concerns, alternatives considered, and future implications.
  Numbered list. The coding-agent treats these as ADVISORY — things to be aware
  of but not necessarily act on in this plan's scope.

  Good examples:
    1. **Keep X and Y in sync** — a helper in the write path handles this...
    2. **Template mutability** — editing a category's schema after parts exist...
    3. **Naming convention** — the existing name is correct as-is because...
-->

1. 

2. 

3. 

