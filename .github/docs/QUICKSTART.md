# Orchestration System - Quick Start Guide

**Status**: ✅ OPERATIONAL  
**Date**: March 13, 2026

## 🎯 What You Have Now

Your hobby-inventory project now has a **fully automated development orchestration system** with 5 AI agents working together to build out your inventory management system.

### The Team

| Agent | Role | What It Does |
|-------|------|--------------|
| **Orchestrator** | Project Manager | Coordinates everything, tracks state, dispatches work |
| **Coding Agent** | Developer | Implements features from issues, creates PRs |
| **Test Agent** | QA Engineer | Reviews PRs, adds tests |
| **Build Agent** | CI/CD | Validates builds, runs tests |
| **Integration Agent** | Release Manager | Merges completed epic branches |

### The Plan

**26 Issues** organized into **4 Epics**:
1. **Epic 1: Foundation** (4 issues) - Data model, schema, migrations
2. **Epic 2: Inventory Core** (5 issues) - Parts, locations, lots, search
3. **Epic 3: Projects & Compatibility** (4 issues) - Allocations, compatibility queries
4. **Epic 4: Intake & Usability** (9 issues) - UI, forms, CSV import, labels

**Work branches ready**:
- `epic/1-foundation`
- `epic/2-inventory-core` 
- `epic/3-projects-compatibility`
- `epic/4-intake-usability`

---

## 🚀 How to Use It

### Watch the Work Happen

**Work Queue**: https://github.com/rmwondolleck/hobby-inventory/issues/28

This issue is your **dashboard**. It shows:
- 📋 Active work (what agents are doing right now)
- ✅ Completed work (PRs merged in last 7 days)
- 🚫 Blocked work (waiting on dependencies)
- 📊 Epic progress (percentage complete)

### Manual Control

```powershell
# Kick off the orchestrator now
gh workflow run orchestrator.lock.yml --repo rmwondolleck/hobby-inventory

# Check what's running
gh run list --repo rmwondolleck/hobby-inventory --limit 10

# Watch a specific run
gh run watch <run-id> --repo rmwondolleck/hobby-inventory

# View the Work Queue
gh issue view 28 --repo rmwondolleck/hobby-inventory --web
```

### Automatic Operation

The orchestrator runs **every 2 hours on weekdays** (Monday-Friday) automatically. It will:
1. Check Work Queue for current state
2. Identify ready issues (dependencies met)
3. Dispatch up to 3 coding-agents in parallel
4. Track their progress
5. Advance them through stages (coding → testing → building → review)

---

## 🔄 The Workflow

```
1. Orchestrator identifies ready issue (e.g., #5)
        ↓
2. Dispatches coding-agent
        ↓
3. Coding-agent reads issue, implements feature
        ↓
4. Creates PR to epic branch (e.g., epic/1-foundation)
        ↓
5. Reports back: AGENT_REPORT comment on Work Queue
        ↓
6. Orchestrator sees completion, dispatches test-agent
        ↓
7. Test-agent adds tests to PR
        ↓
8. Reports completion
        ↓
9. Orchestrator dispatches build-agent
        ↓
10. Build-agent validates, marks PR ready for review
        ↓
11. YOU merge PR (human step)
        ↓
12. Orchestrator detects merge, marks complete
        ↓
13. When all epic issues complete → integration-agent merges to main
```

---

## 📊 Current State (March 13, 2026 02:30 UTC)

**Orchestrator**: ✅ Operational - Work Queue maintained at Issue #28

**Completed**:
- ✅ Issue #5 (Domain model) - PR #30 merged
- ✅ Issue #7 (Skeleton) - completed manually

**Active Work**:
- ⏳ Issue #6 (Statuses) - coding-agent dispatched at 02:13 UTC

**Recent Fix (March 13, 2026)**:
- ✅ Fixed coding-agent PR creation bug
- ✅ Added `edit` and `bash` tools
- ✅ Updated safe-outputs instructions
- 🎉 Future agent runs will create PRs automatically

**Next Up**:
- Once #6 completes → #8 (Migrations) becomes ready (all dependencies met)
- Epic 1 Foundation: 2/4 complete (50%)

---

## 🛠️ Making Changes

### To Modify a Workflow

```powershell
# 1. Edit the .md file
code .github\workflows\orchestrator.md

# 2. Recompile
gh aw compile orchestrator --strict

# 3. Commit and push
git add .github/workflows/orchestrator.*
git commit -m "fix: update orchestrator logic"
git push
```

### To Modify Issues

Just edit the issues on GitHub. The orchestrator re-reads them every run.

### To Adjust Parallelism

Edit `orchestrator.md` line ~176:
```markdown
**Maximum 3 concurrent coding tasks** to avoid overwhelming reviewers.
```

Change to 2 or 5 as needed, recompile, push.

---

## 🐛 Troubleshooting

### Orchestrator Not Dispatching?

Check the Work Queue issue #28 - look for comments explaining why.

### Agent Stuck?

- Check GitHub Actions for failed runs
- Failed runs auto-create issues with debug instructions
- Can manually re-trigger: close the issue, let orchestrator re-assign

### Work Not Advancing?

The orchestrator only runs every 2 hours. To force immediate action:
```powershell
gh workflow run orchestrator.lock.yml --repo rmwondolleck/hobby-inventory
```

### Need to Stop Everything?

Disable the orchestrator workflow on GitHub:
https://github.com/rmwondolleck/hobby-inventory/actions/workflows/orchestrator.lock.yml

---

## 📈 Monitoring

### View Orchestrator Logs
```powershell
gh aw logs orchestrator
```

### Check Agent Activity
```powershell
# All recent runs
gh run list --repo rmwondolleck/hobby-inventory

# Specific workflow
gh run list --workflow=coding-agent.lock.yml --repo rmwondolleck/hobby-inventory
```

### See What's Ready
Check Work Queue #28 → "📝 Ready to Start" section

---

## 🎉 What's Next

1. ⏳ **Wait for run #2** to complete and dispatch coding-agent for #5
2. 👀 **Watch PR creation** - coding-agent will create a PR to `epic/1-foundation`
3. ✅ **Review and merge** - Once tests pass, you merge the PR
4. 🔁 **Rinse and repeat** - Orchestrator continues through all 26 issues
5. 🚢 **Epic completion** - When Epic 1 done → integration-agent merges to main

---

**Your job**: Keep an eye on the Work Queue and merge PRs when they're ready!

Everything else is automated. 🚂 Choo choo!

