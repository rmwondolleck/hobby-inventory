# Watch Orchestrator Script
# Quick status check for the orchestration system

param(
    [switch]$Follow
)

$repo = "rmwondolleck/hobby-inventory"

Write-Host "`n🚂 ORCHESTRATOR STATUS" -ForegroundColor Cyan
Write-Host "=" * 60

# Check Work Queue
Write-Host "`n📋 Work Queue: " -NoNewline
$workQueue = gh api "repos/$repo/issues/28" 2>$null | ConvertFrom-Json
if ($workQueue) {
    Write-Host "https://github.com/$repo/issues/28" -ForegroundColor Green

    # Parse active work from body
    if ($workQueue.body -match "Active Work") {
        if ($workQueue.body -match "\|\s*-\s*\|\s*-\s*\|") {
            Write-Host "  No active work yet" -ForegroundColor Yellow
        } else {
            Write-Host "  Active work in progress!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Not created yet" -ForegroundColor Yellow
}

# Recent runs
Write-Host "`n🏃 Recent Runs:" -ForegroundColor Cyan
$runs = gh api "repos/$repo/actions/runs?per_page=5" | ConvertFrom-Json | Select-Object -ExpandProperty workflow_runs |
    Where-Object { $_.name -match "Orchestrator|Coding|Test|Build|Integration" } |
    Select-Object -First 5

$runs | ForEach-Object {
    $icon = if ($_.status -eq "completed") {
        if ($_.conclusion -eq "success") { "✅" }
        elseif ($_.conclusion -eq "failure") { "❌" }
        else { "⚠️" }
    } else { "⏳" }

    $time = ([DateTime]$_.created_at).ToString("HH:mm:ss")
    Write-Host "  $icon $($_.name) - $($_.status) - $time"
}

# Check for active coding agents
Write-Host "`n🤖 Active Agents:" -ForegroundColor Cyan
$activeAgents = gh api "repos/$repo/actions/runs?status=in_progress&per_page=10" | ConvertFrom-Json |
    Select-Object -ExpandProperty workflow_runs |
    Where-Object { $_.name -match "Coding|Test|Build" }

if ($activeAgents) {
    $activeAgents | ForEach-Object {
        Write-Host "  🏃 $($_.name) running... ($($_.html_url))" -ForegroundColor Green
    }
} else {
    Write-Host "  No agents currently running" -ForegroundColor Yellow
}

# Check for recent PRs
Write-Host "`n📄 Recent PRs:" -ForegroundColor Cyan
$prs = gh api "repos/$repo/pulls?state=open&per_page=5" | ConvertFrom-Json
if ($prs.Count -gt 0) {
    $prs | ForEach-Object {
        Write-Host "  #$($_.number): $($_.title) [$($_.head.ref)]" -ForegroundColor Green
    }
} else {
    Write-Host "  No open PRs yet" -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 60)
Write-Host "View full dashboard: https://github.com/$repo/actions" -ForegroundColor Cyan
Write-Host ""

if ($Follow) {
    Write-Host "Refreshing every 60 seconds... (Ctrl+C to stop)" -ForegroundColor Yellow
    while ($true) {
        Start-Sleep -Seconds 60
        Clear-Host
        & $MyInvocation.MyCommand.Path
    }
}

