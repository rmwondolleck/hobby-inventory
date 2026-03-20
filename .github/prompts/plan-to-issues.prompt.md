---
mode: agent
description: Transcribe a markdown plan document into GitHub Epics, Feature Issues, and Sub-Issues using the three-tier template hierarchy.
---

# Plan → GitHub Issues

Transcribe the attached plan document into GitHub Issues on `rmwondolleck/hobby-inventory` using the project's three-tier issue hierarchy.

## Input

The user will attach (or paste) a plan document. It may represent:

| Plan scope | What to create |
|---|---|
| Full epic plan (has "Epic", "Feature Issues", sub-tasks) | Epic + Feature Issues + Sub-Issues |
| Feature-level plan (has Goal, ACs, Steps) | Feature Issue + Sub-Issues (one per Step group) |
| Sub-issue plan (`plan-epicN-*.prompt.md` format) | Single Sub-Issue attached to named parent |

Parse the structure of the document first to determine which tier(s) apply before creating anything.

---

## Creation sequence

Always create **top-down** so you have real issue numbers before writing checklists and dependency links.

### Step 1 — Identify repo & owner

```
owner: rmwondolleck
repo:  hobby-inventory
```

### Step 2 — Create the Epic (if present)

Call `mcp_io_github_git_issue_write` with `method: create`.

Map plan → Epic template fields:

| Epic template field | Source in plan |
|---|---|
| **Title** | `# Epic N — Title` heading |
| **Overview** | Paragraph under the heading (2–3 sentences) |
| **Sub-Issues** | Leave as `- [ ] ` placeholders — fill in Step 5 |
| **Dependency Graph** | ASCII diagram if present, else omit |
| **Acceptance Criteria** | `## Acceptance Criteria` section |
| **Epic Branch** | `epic/N-slug` derived from title slug |
| **Labels** | `["epic"]` |

Body format:
```markdown
## Overview
<overview text>

## Sub-Issues
- [ ] (to be filled after child issues are created)

## Acceptance Criteria
- [ ] <AC 1>
- [ ] <AC 2>

## Epic Branch
epic/<N>-<slug>
```

Note the returned issue number as `$EPIC_NUMBER`.

### Step 2b — Create the epic branch (if epic was created)

First call `mcp_io_github_git_list_branches` and check whether `epic/<N>-<slug>` already exists.

- **If it does NOT exist** — call `mcp_io_github_git_create_branch`:
  ```
  owner:       rmwondolleck
  repo:        hobby-inventory
  branch:      epic/<N>-<slug>   ← same value written into the Epic body
  from_branch: main
  ```
- **If it already exists** — skip creation and note "branch already exists" in the output summary. Do NOT delete/recreate it — it may already have feature PRs targeting it.

> **Why here?** No existing automation creates epic branches. The orchestrator, coding-agent,
> and integration-agent all receive `epic_branch` as an input and assume it exists:
> - Orchestrator (Task 4) passes it when dispatching the coding-agent
> - Coding-agent checks it out (`checkout: ref`) and targets PRs against it (`base-branch`)
> - Integration-agent creates the final epic→main PR from it
>
> Creating the branch at issue-creation time is safe and unblocks the pipeline from day one.
>
> **Do not create** feature or sub-issue branches — the coding-agent creates its own
> `feat/issue-N-*` branch off the epic branch automatically via `safe-outputs.create-pull-request`.

### Step 3 — Create Feature Issues (if present)

For each feature in the plan call `mcp_io_github_git_issue_write` with `method: create`.

Map plan → Feature Issue template fields:

| Feature Issue field | Source in plan |
|---|---|
| **Title** | Feature heading |
| **Parent Epic** | `#$EPIC_NUMBER` |
| **Goal** | 1–2 sentence description |
| **Context for Agent** | File paths / symbols listed in the plan |
| **Acceptance Criteria** | `### Acceptance Criteria` bullets |
| **Dependencies** | `Depends on #X` lines — use real numbers from Step 2/3 |
| **Not In Scope** | Explicit exclusions in the plan |
| **Design Decisions** | Constraints/rationale if present |
| **Implementation Scope** | Infer from content: `api`, `backend`, `db`, `frontend` |
| **Labels** | Inferred scope labels |

Body format:
```markdown
## Parent Epic
#<EPIC_NUMBER>

## Goal
<goal text>

## Context for Agent
<file paths and symbols>

## Acceptance Criteria
- [ ] <AC>

## Dependencies
Depends on #<N>

## Not In Scope
- <exclusion>

## Design Decisions
- **<decision>**: <rationale>

## Implementation Scope
api, backend
```

Note each returned issue number as `$FEATURE_N`.

### Step 4 — Create Sub-Issues

For each granular task (a Steps group, a plan-prompt.md, or explicit sub-task list) call `mcp_io_github_git_issue_write` with `method: create`.

Map plan → Sub-Issue template fields:

| Sub-Issue field | Source in plan |
|---|---|
| **Title** | Step group heading or task title |
| **Parent Issue** | `#$FEATURE_N` (the owning feature issue) |
| **Summary** | `## Summary` section or equivalent prose |
| **Steps** | `## Steps` section verbatim (preserve `### N. Verb — path/to/file` format) |
| **Further Considerations** | `## Further Considerations` section |
| **Acceptance Criteria** | `## Acceptance Criteria` bullets |
| **Implementation Scope** | Infer labels: `api`, `backend`, `db`, `frontend` |
| **Labels** | `["sub-issue"]` + inferred scope labels |

Body format:
```markdown
## Parent Issue
#<FEATURE_NUMBER>

## Summary
<summary prose>

## Steps
### 1. <Verb-phrase> — `path/to/file`
- <bullet>

### 2. <Verb-phrase> — `path/to/file`
- <bullet>

## Further Considerations
1. <consideration>

## Acceptance Criteria
- [ ] <AC>

## Implementation Scope
api, backend
```

Note each returned issue number as `$SUB_N`.

### Step 5 — Link Sub-Issues to parents

For every sub-issue created, call `mcp_io_github_git_sub_issue_write` with `method: add`:

```
parent issue:  $FEATURE_N   (or $EPIC_NUMBER if no intermediate feature)
sub_issue_id:  <node ID returned by the create call>
```

### Step 6 — Update the Epic checklist

Once all feature and sub-issues exist, call `mcp_io_github_git_issue_write` with `method: update` on `$EPIC_NUMBER`.

Replace the `## Sub-Issues` placeholder with real numbers:

```markdown
## Sub-Issues
- [ ] #<FEATURE_1> Feature title
- [ ] #<FEATURE_2> Feature title [depends on #<FEATURE_1>]
```

Use `[depends on #X]` and `[blocks #Y]` annotations — the orchestrator parses these patterns to build the dependency graph.

---

## Key conventions to preserve

- **Dependency pattern**: always write `Depends on #X` (exact phrase) in the Dependencies field — the orchestrator scans for this.
- **Steps format**: keep `### N. Verb-phrase — \`path/to/file\`` — the coding-agent follows steps linearly.
- **Labels**: `epic` on epics; `sub-issue` on sub-issues; scope labels (`api`, `backend`, `db`, `frontend`) on both feature issues and sub-issues.
- **`scrapped` is terminal** — never suggest a transition out of it in any issue text.
- **JSON fields**: when plan text mentions `tags`, `parameters`, or `source`, note they are stored as JSON strings in SQLite and must use `safeParseJson()` / `JSON.stringify()`.

---

## Output

After all issues are created, print a summary table:

```
| Tier         | #     | Title                        |
|--------------|-------|------------------------------|
| Epic         | #N    | <title>                      |
| Feature      | #N    | <title>                      |
| Sub-Issue    | #N    | <title>                      |
| Sub-Issue    | #N    | <title>                      |
```

Then confirm sub-issue links and the epic checklist update are complete.



