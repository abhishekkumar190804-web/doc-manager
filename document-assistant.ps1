param(
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Build,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $PSCommandPath
$BackendDir = Join-Path $ScriptPath "backend"
$FrontendDir = Join-Path $ScriptPath "frontend"
$BackendPidFile = Join-Path $ScriptPath ".backend.pid"
$FrontendPidFile = Join-Path $ScriptPath ".frontend.pid"

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Text)
    Write-Host "[!] $Text" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Text)
    Write-Host "[ERR] $Text" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Show-Help {
    Write-Header "DOCUMENT ASSISTANT - LAUNCHER"
    Write-Host "Usage: .\document-assistant.ps1 [options]`n" -ForegroundColor White
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Install     Install all dependencies (backend + frontend)" -ForegroundColor White
    Write-Host "  -Start       Start backend and frontend servers" -ForegroundColor White
    Write-Host "  -Stop        Stop all running servers" -ForegroundColor White
    Write-Host "  -Status      Check if servers are running" -ForegroundColor White
    Write-Host "  -Build       Build frontend for production" -ForegroundColor White
    Write-Host "  -Help        Show this help message`n" -ForegroundColor White
    Write-Host "No args:      Interactive menu`n" -ForegroundColor Gray
    Write-Host "Quick start:" -ForegroundColor Green
    Write-Host "  .\document-assistant.ps1 -Install" -ForegroundColor Gray
    Write-Host "  .\document-assistant.ps1 -Start" -ForegroundColor Gray
    Write-Host "  Open http://localhost:5173 in your browser`n" -ForegroundColor Gray
}

function Check-Prerequisites {
    Write-Header "CHECKING PREREQUISITES"
    $allGood = $true

    if (Test-Command "python") {
        $v = python --version
        Write-Success "Python: $v"
    } else {
        Write-Error "Python not found. Install Python 3.10+ from https://python.org"
        $allGood = $false
    }

    if (Test-Command "node") {
        $v = node --version
        Write-Success "Node.js: $v"
    } else {
        Write-Error "Node.js not found. Install from https://nodejs.org"
        $allGood = $false
    }

    if (Test-Command "npm") {
        $v = npm --version
        Write-Success "npm: $v"
    } else {
        Write-Error "npm not found."
        $allGood = $false
    }

    if (-not (Test-Path (Join-Path $BackendDir ".env"))) {
        Write-Warning "No backend\.env found. Copying from .env.example..."
        Copy-Item (Join-Path $BackendDir ".env.example") (Join-Path $BackendDir ".env")
        Write-Warning "Edit backend\.env with your actual API keys before starting."
    } else {
        Write-Success "backend\.env exists"
    }

    if (-not (Test-Path (Join-Path $FrontendDir ".env"))) {
        Write-Warning "No frontend\.env found. Copying from .env.example..."
        Copy-Item (Join-Path $FrontendDir ".env.example") (Join-Path $FrontendDir ".env")
    } else {
        Write-Success "frontend\.env exists"
    }

    return $allGood
}

function Install-Dependencies {
    if (-not (Check-Prerequisites)) {
        return
    }

    Write-Header "INSTALLING BACKEND DEPENDENCIES"
    Push-Location $BackendDir
    try {
        if (Test-Path ".venv") {
            Write-Warning "Virtual env already exists. Remove .venv to reinstall."
        } else {
            python -m venv .venv
            Write-Success "Virtual env created"
        }
        $pip = if ($IsWindows -or $env:OS) { ".\.venv\Scripts\pip" } else { ".venv/bin/pip" }
        & $pip install -r requirements.txt
        if ($?) { Write-Success "Backend dependencies installed" }
    } catch {
        Write-Error "Backend install failed: $_"
    } finally {
        Pop-Location
    }

    Write-Header "INSTALLING FRONTEND DEPENDENCIES"
    Push-Location $FrontendDir
    try {
        npm install
        if ($?) { Write-Success "Frontend dependencies installed" }
    } catch {
        Write-Error "Frontend install failed: $_"
    } finally {
        Pop-Location
    }

    Write-Success "All dependencies installed!"
}

function Start-Servers {
    if (-not (Check-Prerequisites)) {
        return
    }

    if (Test-Path $BackendPidFile) {
        $pid = Get-Content $BackendPidFile
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Write-Warning "Backend already running (PID: $pid). Stop it first with -Stop."
            return
        }
        Remove-Item $BackendPidFile -Force
    }
    if (Test-Path $FrontendPidFile) {
        $pid = Get-Content $FrontendPidFile
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Write-Warning "Frontend already running (PID: $pid). Stop it first with -Stop."
            return
        }
        Remove-Item $FrontendPidFile -Force
    }

    Write-Header "STARTING BACKEND (port 8000)"
    Push-Location $BackendDir
    try {
        $venvPython = if ($IsWindows -or $env:OS) { ".\.venv\Scripts\python" } else { ".venv/bin/python" }
        if (-not (Test-Path $venvPython)) {
            Write-Error "Virtual env not found. Run -Install first."
            return
        }
        $logFile = Join-Path $BackendDir "server.log"
        $job = Start-Job -ScriptBlock {
            param($Dir, $Python, $Log)
            Set-Location $Dir
            & $Python -m uvicorn app.main:app --port 8000 *>$Log
        } -ArgumentList $BackendDir, (Resolve-Path $venvPython).Path, $logFile
        $job.Id | Out-File $BackendPidFile
        Start-Sleep -Seconds 2
        Write-Success "Backend starting... (Job ID: $($job.Id))"
        Write-Host "       Logs: backend\server.log" -ForegroundColor Gray
    } catch {
        Write-Error "Backend start failed: $_"
    } finally {
        Pop-Location
    }

    Write-Header "STARTING FRONTEND (port 5173)"
    Push-Location $FrontendDir
    try {
        $logFile = Join-Path $FrontendDir "server.log"
        $job = Start-Job -ScriptBlock {
            param($Dir, $Log)
            Set-Location $Dir
            npm run dev *>$Log
        } -ArgumentList $FrontendDir, $logFile
        $job.Id | Out-File $FrontendPidFile
        Start-Sleep -Seconds 2
        Write-Success "Frontend starting... (Job ID: $($job.Id))"
        Write-Host "       Logs: frontend\server.log" -ForegroundColor Gray
    } catch {
        Write-Error "Frontend start failed: $_"
    } finally {
        Pop-Location
    }

    Write-Header "SERVICES LAUNCHED"
    Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host "`n  Use .\document-assistant.ps1 -Stop to shut down" -ForegroundColor Gray
    Write-Host "  Use .\document-assistant.ps1 -Status to check`n" -ForegroundColor Gray
}

function Stop-Servers {
    Write-Header "STOPPING SERVERS"

    foreach ($pair in @(
        @{File = $BackendPidFile; Name = "Backend"},
        @{File = $FrontendPidFile; Name = "Frontend"}
    )) {
        if (Test-Path $pair.File) {
            $jobId = Get-Content $pair.File
            $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
            if ($job) {
                Stop-Job $job
                Remove-Job $job
                Write-Success "$($pair.Name) stopped (Job ID: $jobId)"
            } else {
                Write-Warning "$($pair.Name) job not found (ID: $jobId)"
            }
            Remove-Item $pair.File -Force
        } else {
            Write-Warning "$($pair.Name) PID file not found"
        }
    }
    Write-Success "All servers stopped"
}

function Show-Status {
    Write-Header "SERVER STATUS"

    $anyRunning = $false
    foreach ($pair in @(
        @{File = $BackendPidFile; Name = "Backend"},
        @{File = $FrontendPidFile; Name = "Frontend"}
    )) {
        if (Test-Path $pair.File) {
            $jobId = Get-Content $pair.File
            $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
            if ($job -and $job.State -eq "Running") {
                Write-Success "$($pair.Name) is RUNNING (Job ID: $jobId)"
                $anyRunning = $true
            } elseif ($job) {
                Write-Warning "$($pair.Name) is $($job.State) (Job ID: $jobId)"
                $anyRunning = $true
            } else {
                Write-Error "$($pair.Name) PID file exists but job not found"
            }
        } else {
            Write-Warning "$($pair.Name) is NOT running"
        }
    }

    if (-not $anyRunning) {
        Write-Host "`nNo servers running. Start with: .\document-assistant.ps1 -Start" -ForegroundColor Yellow
    }
}

function Build-Frontend {
    if (-not (Test-Command "npm")) {
        Write-Error "npm not found"
        return
    }
    Write-Header "BUILDING FRONTEND FOR PRODUCTION"
    Push-Location $FrontendDir
    try {
        npm run build
        if ($?) {
            Write-Success "Frontend built to frontend\dist\"
        }
    } catch {
        Write-Error "Build failed: $_"
    } finally {
        Pop-Location
    }
}

function Show-Menu {
    Clear-Host
    Write-Host @"

  ╔══════════════════════════════════════════╗
  ║     DOCUMENT ASSISTANT - LAUNCHER        ║
  ╚══════════════════════════════════════════╝

"@ -ForegroundColor Cyan
    Write-Host "  1) Install dependencies" -ForegroundColor White
    Write-Host "  2) Start servers" -ForegroundColor White
    Write-Host "  3) Stop servers" -ForegroundColor White
    Write-Host "  4) Check status" -ForegroundColor White
    Write-Host "  5) Build frontend" -ForegroundColor White
    Write-Host "  6) Open backend logs" -ForegroundColor White
    Write-Host "  7) Open frontend logs" -ForegroundColor White
    Write-Host "  Q) Quit`n" -ForegroundColor White

    $choice = Read-Host "Select an option (1-7, Q)"
    switch ($choice) {
        "1" { Install-Dependencies }
        "2" { Start-Servers }
        "3" { Stop-Servers }
        "4" { Show-Status }
        "5" { Build-Frontend }
        "6" {
            $log = Join-Path $BackendDir "server.log"
            if (Test-Path $log) { Get-Content $log -Tail 50 }
            else { Write-Warning "No backend log found" }
        }
        "7" {
            $log = Join-Path $FrontendDir "server.log"
            if (Test-Path $log) { Get-Content $log -Tail 50 }
            else { Write-Warning "No frontend log found" }
        }
        "Q" { return }
        "q" { return }
        default { Write-Warning "Invalid option" }
    }

    Write-Host "`n"
    $continue = Read-Host "Press Enter to return to menu, or Q to quit"
    if ($continue -ne "Q" -and $continue -ne "q") {
        Show-Menu
    }
}

# --- MAIN ---

if ($Help -or (-not $Install -and -not $Start -and -not $Stop -and -not $Status -and -not $Build)) {
    Show-Help
    if (-not $Install -and -not $Start -and -not $Stop -and -not $Status -and -not $Build) {
        $runMenu = Read-Host "Press Enter for interactive menu, or any key to quit"
        if ($runMenu -eq "") { Show-Menu }
    }
    exit
}

if ($Install) { Install-Dependencies }
if ($Start) { Start-Servers }
if ($Stop) { Stop-Servers }
if ($Status) { Show-Status }
if ($Build) { Build-Frontend }
