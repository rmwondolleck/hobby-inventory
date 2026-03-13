# Run these commands to deploy the sequential pipeline fix

# 1. Compile workflows
gh aw compile orchestrator --strict

# 2. Commit changes
git add .github/workflows/orchestrator.md .github/workflows/orchestrator.lock.yml .github/docs/*.md
git commit -m "fix: Implement sequential agent pipeline (coding → test → build → review)"

# 3. Push to main
git push origin main

# 4. Verify deployment
gh run list --workflow=orchestrator.lock.yml --limit 3

Write-Host "✅ Sequential pipeline deployed!" -ForegroundColor Green
Write-Host "Orchestrator will now automatically progress through: coding → testing → building → review → merge" -ForegroundColor Cyan

