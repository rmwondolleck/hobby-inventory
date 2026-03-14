# Orchestration System Handoff Document

**Date**: March 14, 2026 ~04:20 UTC  
**Status**: ✅ **RUNNING** — Epic 2 pipeline in progress, both lead PRs build-passed, awaiting Copilot review  
**Repository**: https://github.com/rmwondolleck/hobby-inventory  
**Work Queue**: [Issue #28](https://github.com/rmwondolleck/hobby-inventory/issues/28)

---

## 🚨 Immediate Next Action Required

**The orchestrator has NOT yet processed the two build-pass AGENT_REPORTs.** The Work Queue still shows `needs-work` but both PRs are actually build-green and ready for Copilot review assignment.

**Trigger the orchestrator immediately:**
```bash
gh workflow run orchestrator.lock.yml
```

The orchestrator will:
1. Read the two `build-agent result: passed` AGENT_REPORTs on issue #28  
2. Transition #9 and #10 from `needs-work` → `review`  
3. Use `assign-to-agent` to assign Copilot to PR #38 and PR #39  
4. Update and comment the Work Queue

---

## 📊 Current Pipeline State (04:20 UTC March 14)

### Epic 1 — ✅ COMPLETE
PR #36 merged to main.

### Epic 2 — 🟡 IN PROGRESS (2/5 issues near ready-to-merge)

| Issue | Title | PR | Branch | Build | Stage |
|-------|-------|----|--------|-------|-------|
| #9 | CRUD API for parts | #38 | `epic/2-inventory-core-93cec74a7d2abf0e` | ✅ passed 04:14 UTC | needs orchestrator → `review` |
| #10 | CRUD API for locations | #39 | `feat/10-locations-crud-api-e34698529f60c265` | ✅ passed 04:19 UTC | needs orchestrator → `review` |
| #11 | CRUD API for lots/stock | — | — | — | `blocked` (needs #9 + #10) |
| #12 | Event history log | — | — | — | `blocked` (needs #11) |
| #13 | Basic list/filter API | — | — | — | `blocked` (needs #9, #10, #11) |

### AGENT_REPORTs already in Work Queue (issue #28)
| Comment | Time | Summary |
|---------|------|---------|
| `build-agent result: passed` for #9 / PR #38 | 04:14 UTC | [comment](https://github.com/rmwondolleck/hobby-inventory/issues/28#issuecomment-4059440174) |
| `build-agent result: passed` for #10 / PR #39 | 04:19 UTC | [comment](https://github.com/rmwondolleck/hobby-inventory/issues/28#issuecomment-4059449144) |

---

## ⚠️ Critical Operational Notes

### 1. `issue_comment` trigger does NOT fire on bot comments
GitHub's GITHUB_TOKEN prevents Actions from triggering other Actions. Only **human** comments on issue #28 fire the orchestrator's `issue_comment` trigger. After any agent posts an AGENT_REPORT, the orchestrator must be manually triggered OR wait for the 2-hour schedule.

**Workaround**: Post a human comment on issue #28 to trigger the orchestrator immediately, OR run:
```bash
gh workflow run orchestrator.lock.yml
```

### 2. Orchestrator schedule
Runs `every 2 hours on weekdays`. Next automatic runs: ~06:00, 08:00, 10:00... UTC March 14.

### 3. `pull_request_review` trigger DOES fire automatically
When Copilot submits a review (approved or changes_requested) on any PR, the orchestrator WILL trigger immediately via the `pull_request_review` event. No manual intervention needed for that transition.

### 4. PR branches have been manually synced
Both PR branches had stale `package.json` (missing Jest, `@tailwindcss/postcss`, `@prisma/client`). They were fixed directly via MCP commits:
- PR #38 branch: commit `9fd36b46` (04:09 UTC)
- PR #39 branch: commit `253c7260` (04:09 UTC)
- Epic base `epic/2-inventory-core`: commit `2b006e90` (04:09 UTC)
- All future branches from this epic will have the correct config.

---

## 🐛 Bugs Fixed This Session (March 13–14)

All fixes are compiled and live on `main` (latest commit: `036ede1`).

### Workflow fixes
| File | Fix | Commit |
|------|-----|--------|
| `orchestrator.md` | Added `pull_request_review: types: [submitted]` trigger | `8d125e7` |
| `orchestrator.md` | Added Task 5a: explicit Copilot review detection via `get_reviews` | `8d125e7` |
| `orchestrator.md` | Added early-exit guard for non-Work-Queue `issue_comment` events | `8d125e7` |
| `orchestrator.md` | `dispatch-workflow: max: 5 → max: 10` | `8d125e7` |
| `coding-agent.md` | Added `push-to-pull-request-branch` with `protected-files: fallback-to-issue` for remediation | `036ede1` |
| `test-agent.md` | Added `protected-files: fallback-to-issue` + `allowed-files: ["*", "**/*", ...]` | `cff92a0` / `0f7c4c7` |
| `test-agent.md` | Added instruction: do NOT run `npm install` (deps pre-declared in package.json) | `c63caf0` |
| `build-agent.md` | Added `npm install` + `export DATABASE_URL=file:./dev.db` before checks | `b828432` |
| `build-agent.md` | Documented expected CI non-failures (Google Fonts, lint dir) | `b828432` |
| `integration-agent.md` | Added `target: "*"` to `add-comment` safe output | `8d125e7` |

### Project fixes
| File | Fix | Commit |
|------|-----|--------|
| `jest.config.ts` | `setupFilesAfterFramework` → `setupFilesAfterEnv` (typo) | `b828432` |
| `postcss.config.js` | `tailwindcss` → `@tailwindcss/postcss` (Tailwind v4 breaking change) | `b828432` |
| `package.json` | Added Jest 29 + ts-jest + @testing-library/* + @tailwindcss/postcss devDeps | `c63caf0` / `b828432` |
| `jest.config.ts` | Created with ts-jest preset, `@/` alias, `setupFilesAfterEnv` | `c63caf0` |
| `jest.setup.ts` | Created with `@testing-library/jest-dom` import | `c63caf0` |

### Key safe-outputs lessons learned
| Problem | Root Cause | Fix |
|---------|-----------|-----|
| `patch modifies files outside the allowed-files list (jest.config.ts)` | `"**/*"` glob doesn't match root-level files (no `/` in path) | Add bare `"*"` glob alongside `"**/*"` |
| `patch modifies protected files (package-lock.json, package.json)` | System-level `protected_files` list separate from `allowed-files`; `allowed-files` alone is not enough | Add `protected-files: fallback-to-issue` to the safe output config |
| `ERR_VALIDATION: unauthorized GitHub Actions expressions` | `github.event.review.user.login` and `github.event.review.state` are NOT in the safe expression list | Use natural language + `get_reviews` API call instead; only `github.event.review.id` and `github.event.pull_request.number` are safe |
| `ERR_CONFIG: Lock file is outdated` | `.md` frontmatter changed without recompiling `.lock.yml` | Always run `gh aw compile --strict` and commit BOTH files together |

---

## 🗺️ Expected Overnight Flow

Assuming orchestrator is triggered now and Copilot reviews reasonably quickly:

```
04:20 UTC  → Trigger orchestrator manually
04:25 UTC  → Orchestrator assigns Copilot to PR #38 and #39
~1-2 hrs   → Copilot submits reviews
             → pull_request_review trigger fires orchestrator immediately
             IF approved: transition to ready-to-merge
             IF changes_requested: dispatch coding-agent remediation

Both ready-to-merge → orchestrator dispatches coding-agent for #11 (lots CRUD)
#11: coding (~10 min) → test (~15 min) → build (~5 min) → review
#11 ready-to-merge → orchestrator dispatches #12 (events) AND #13 (search) concurrently
#12 + #13 pipeline → all 5 Epic 2 issues ready-to-merge
→ integration-agent synthesizes ONE epic PR for human review
```

**Estimated wall-clock**: 6–12 hours if Copilot reviews promptly and no new failures.

---

## 🏗️ Architecture (unchanged)

### Hub-and-Spoke Model
```
                    ┌─────────────┐
                    │ ORCHESTRATOR│ ← Single source of truth
                    └──────┬──────┘
                           │ dispatch_workflow safe-output
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  coding   │    │   test    │    │   build   │
   │   agent   │    │   agent   │    │   agent   │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         └────────────────┴────────────────┘
                          │
                          ▼ AGENT_REPORT comment on Work Queue issue
                 ┌─────────────────┐
                 │ Work Queue #28  │ ← State storage
                 └─────────────────┘
```

### Stage Flow
```
ready → coding → testing → building → review → ready-to-merge
           ↓                    ↓           ↓         ↓
           └──── needs-work ←───┴───────────┘    (accumulate all
                    ↓                              epic issues)
                 testing                               ↓
                                              integration-agent
                                                       ↓
                                              ONE epic PR → human merges
```

### Key Design Rules
1. **Only orchestrator dispatches** — agents never trigger other agents
2. **State in issue #28** — `[Orchestrator] Work Queue` is single source of truth
3. **AGENT_REPORT format**: `AGENT_REPORT: { "agent": "...", "issue": N, "status": "completed"|"failed"|"remediation_complete", "pr_number": N, "result": "passed"|"failed" }`
4. **Max 3 concurrent coding tasks**
5. **Human only merges the final epic PR** — individual feature PRs are NOT merged manually

---

## 📁 File Locations

```
.github/
├── docs/
│   └── ORCHESTRATION-HANDOFF.md     ← This file
└── workflows/
    ├── orchestrator.md / .lock.yml
    ├── coding-agent.md / .lock.yml
    ├── test-agent.md / .lock.yml
    ├── build-agent.md / .lock.yml
    └── integration-agent.md / .lock.yml

# Project root
jest.config.ts       ← Jest 29 + ts-jest + @/ alias (setupFilesAfterEnv)
jest.setup.ts        ← @testing-library/jest-dom
postcss.config.js    ← @tailwindcss/postcss (Tailwind v4)
package.json         ← includes jest, @tailwindcss/postcss, @prisma/client devDeps
```

---

## Commands Quick Reference

```bash
# Compile all workflows (ALWAYS do this after editing any .md)
gh aw compile --strict

# Manually trigger orchestrator
gh workflow run orchestrator.lock.yml

# Manually trigger specific agent
gh workflow run build-agent.lock.yml -f pr_number=38 -f issue_number=9 -f state_issue_number=28

# Check recent runs
gh run list --workflow=orchestrator.lock.yml --limit 5
gh run list --limit 10

# Watch a run live
gh run watch <run-id>

# Get failure logs
gh run view <run-id> --log-failed
```

---

*Last updated: March 14, 2026 ~04:20 UTC by GitHub Copilot session*
