#!/usr/bin/env pwsh
# start.ps1 — StarCatcher Game Dev Server
# Starts a local static file server and opens the game in browser.
# Verifies all dependencies before starting.

$PORT = 8080
$PROJECT_ROOT = $PSScriptRoot
$INDEX = "index.html"
$HEALTH_URL = "http://localhost:$PORT/$INDEX"

Write-Host "=== 星捕少女 StarCatcher — Dev Server ===" -ForegroundColor Cyan

# ── Dependency check ──────────────────────────────────────────────────────────

# Check Python
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3") {
            $pythonCmd = $cmd
            Write-Host "✓ $cmd found: $ver" -ForegroundColor Green
            break
        }
    } catch {}
}

# Check Node as fallback
$nodeCmd = $null
if (-not $pythonCmd) {
    try {
        $ver = node --version 2>&1
        if ($ver -match "v\d+") {
            $nodeCmd = "node"
            Write-Host "✓ node found: $ver" -ForegroundColor Green
        }
    } catch {}
}

if (-not $pythonCmd -and -not $nodeCmd) {
    Write-Host "✗ ERROR: Neither Python 3 nor Node.js found." -ForegroundColor Red
    Write-Host "  Fix: Install Python 3 from https://python.org or Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check index.html exists
if (-not (Test-Path "$PROJECT_ROOT\$INDEX")) {
    Write-Host "✗ ERROR: $INDEX not found in $PROJECT_ROOT" -ForegroundColor Red
    Write-Host "  Fix: Make sure you are running start.ps1 from the project root." -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ index.html found" -ForegroundColor Green

# ── Kill any existing process on port ────────────────────────────────────────
$existing = netstat -ano | Select-String ":$PORT " | Select-String "LISTENING"
if ($existing) {
    $pid = ($existing -split "\s+")[-1]
    Write-Host "  Stopping existing process on port $PORT (PID $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# ── Start server ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting server on http://localhost:$PORT ..." -ForegroundColor Cyan

if ($pythonCmd) {
    $serverJob = Start-Job -ScriptBlock {
        param($cmd, $port, $root)
        Set-Location $root
        & $cmd -m http.server $port --bind 127.0.0.1 2>&1
    } -ArgumentList $pythonCmd, $PORT, $PROJECT_ROOT
} else {
    $serverJob = Start-Job -ScriptBlock {
        param($port, $root)
        Set-Location $root
        & node -e "
            const http = require('http');
            const fs = require('fs');
            const path = require('path');
            const mime = {'html':'text/html','js':'application/javascript','css':'text/css','json':'application/json','png':'image/png','jpg':'image/jpeg','webp':'image/webp'};
            http.createServer((req,res)=>{
                let f = path.join('$root', req.url==='/'?'/index.html':req.url);
                if(fs.existsSync(f)&&fs.statSync(f).isFile()){
                    const ext=path.extname(f).slice(1);
                    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});
                    fs.createReadStream(f).pipe(res);
                } else { res.writeHead(404); res.end('Not found'); }
            }).listen($port,'127.0.0.1');
        " 2>&1
    } -ArgumentList $PORT, $PROJECT_ROOT
}

Start-Sleep -Seconds 1

# ── Health check ──────────────────────────────────────────────────────────────
$maxRetries = 5
$ok = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $HEALTH_URL -TimeoutSec 3 -UseBasicParsing
        if ($resp.StatusCode -eq 200) {
            $ok = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 500
}

if (-not $ok) {
    Write-Host "✗ ERROR: Health check failed — server did not respond at $HEALTH_URL" -ForegroundColor Red
    Write-Host "  Fix: Check if port $PORT is blocked by firewall or another application." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Health check passed: $HEALTH_URL" -ForegroundColor Green
Write-Host ""
Write-Host "  Game URL: http://localhost:$PORT" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

# Open browser
Start-Process "http://localhost:$PORT"

# Keep running
try {
    Wait-Job $serverJob
} finally {
    Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
}
