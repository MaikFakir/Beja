<#
.SYNOPSIS
    AI Code Guardian PowerShell Tool (guardian.ps1)
    Automated validation, regression detection, and security auditing for AI-assisted development.

.DESCRIPTION
    Native Windows PowerShell verification engine that requires zero external dependencies.
    Performs security audits, git diff checks, and invariant snapshots.

.EXAMPLE
    .\guardian.ps1 -Audit .
    .\guardian.ps1 -Audit js\firebase-config.js
    .\guardian.ps1 -DiffCheck
    .\guardian.ps1 -ExtractInvariants index.html -OutFile before.json
    .\guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json
#>

param(
    [string]$Audit = "",
    [switch]$DiffCheck,
    [string]$ExtractInvariants = "",
    [string]$OutFile = "",
    [string]$VerifyInvariantsBefore = "",
    [string]$VerifyInvariantsAfter = ""
)

function Invoke-GuardianAudit {
    param([string]$PathToCheck)

    if (-not (Test-Path $PathToCheck)) {
        Write-Error "Path does not exist: $PathToCheck"
        return 1
    }

    $files = @()
    if ((Get-Item $PathToCheck) -is [System.IO.DirectoryInfo]) {
        $files = Get-ChildItem -Path $PathToCheck -Recurse -File -Include "*.js","*.ts","*.html","*.css","*.json","*.md","*.py" |
            Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build|\.venv" }
    } else {
        $files = @(Get-Item $PathToCheck)
    }

    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " [GUARDIAN] STATIC SECURITY & INTEGRITY AUDIT" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "Auditing $($files.Count) file(s) in: $PathToCheck`n"

    $findings = @()

    $secretRegexes = @(
        @{ Pattern = '(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["''][A-Za-z0-9_\-\.]{12,}["'']'; Desc = 'Exposed Secret / API Key'; Severity = 'CRITICAL' },
        @{ Pattern = '(?i)firebaseConfig\s*=\s*\{[^}]*apiKey:\s*["''][A-Za-z0-9_\-]{20,}["'']'; Desc = 'Hardcoded Firebase API Key'; Severity = 'CRITICAL' },
        @{ Pattern = '-----BEGIN (?:RSA )?PRIVATE KEY-----'; Desc = 'Hardcoded RSA/SSH Private Key'; Severity = 'CRITICAL' },
        @{ Pattern = '(?i)(password|passwd|pwd)\s*[:=]\s*["''][^"'']{6,}["'']'; Desc = 'Hardcoded Password'; Severity = 'CRITICAL' }
    )

    $lazyRegexes = @(
        @{ Pattern = '//\s*\.\.\.\s*(?:rest|existing|remaining|code|resto|demas).*'; Desc = 'Lazy Comment Truncation (Risk of code erasure)'; Severity = 'HIGH' },
        @{ Pattern = '/\*\s*\.\.\.\s*(?:rest|existing|remaining|code|resto).*?\*/'; Desc = 'Lazy Block Comment Truncation'; Severity = 'HIGH' }
    )

    $dangerRegexes = @(
        @{ Pattern = '\.innerHTML\s*='; Desc = 'Unsanitized innerHTML assignment (XSS risk)'; Severity = 'MEDIUM' },
        @{ Pattern = '\beval\s*\('; Desc = 'Use of eval() (Remote Code Execution risk)'; Severity = 'MEDIUM' },
        @{ Pattern = '!\s*important'; Desc = 'Use of CSS !important (Specificity war anti-pattern)'; Severity = 'MEDIUM' }
    )

    foreach ($file in $files) {
        $lines = Get-Content -LiteralPath $file.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($null -eq $lines) { continue }
        $lineNum = 1
        foreach ($line in $lines) {
            foreach ($s in $secretRegexes) {
                if ($line -match $s.Pattern) {
                    $findings += [PSCustomObject]@{ File = $file.FullName; Line = $lineNum; Severity = $s.Severity; Category = 'Security'; Message = "$($s.Desc) on line $lineNum" }
                }
            }
            if ($file.Extension -in @(".js", ".ts", ".html", ".css", ".py", ".jsx", ".tsx")) {
                foreach ($l in $lazyRegexes) {
                    if ($line -match $l.Pattern) {
                        $findings += [PSCustomObject]@{ File = $file.FullName; Line = $lineNum; Severity = $l.Severity; Category = 'Integrity'; Message = "$($l.Desc) on line $lineNum. Never truncate existing logic!" }
                    }
                }
                foreach ($d in $dangerRegexes) {
                    if ($line -match $d.Pattern) {
                        $findings += [PSCustomObject]@{ File = $file.FullName; Line = $lineNum; Severity = $d.Severity; Category = 'Best Practices'; Message = "$($d.Desc) on line $lineNum" }
                    }
                }
            }
            $lineNum++
        }
    }

    $criticals = @($findings | Where-Object { $_.Severity -eq 'CRITICAL' })
    $highs = @($findings | Where-Object { $_.Severity -eq 'HIGH' })
    $mediums = @($findings | Where-Object { $_.Severity -eq 'MEDIUM' })

    foreach ($f in $findings) {
        $color = "Yellow"
        if ($f.Severity -eq "CRITICAL") { $color = "Red" }
        elseif ($f.Severity -eq "HIGH") { $color = "DarkYellow" }

        Write-Host "[$($f.Severity)] [$($f.Category)] $($f.File):$($f.Line)" -ForegroundColor $color
        Write-Host "    -> $($f.Message)" -ForegroundColor Gray
    }

    Write-Host "`n-------------------------------------------------------"
    Write-Host "Summary: $($findings.Count) finding(s) | Critical: $($criticals.Count) | High: $($highs.Count) | Medium: $($mediums.Count)"
    Write-Host "-------------------------------------------------------`n"

    if ($criticals.Count -gt 0 -or $highs.Count -gt 0) {
        Write-Host "[FAIL] AUDIT FAILED: Critical or High-severity issues must be resolved before proceeding." -ForegroundColor Red
        return 1
    } else {
        Write-Host "[OK] AUDIT PASSED: No blocking issues found." -ForegroundColor Green
        return 0
    }
}

function Invoke-GuardianDiffCheck {
    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " [GUARDIAN] GIT DIFF INTEGRITY AUDIT" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan

    $diffOutput = & git diff '--unified=1' 2>&1
    $statOutput = & git diff '--stat' 2>&1

    $diffStr = [string]::Join("`n", $diffOutput)

    if ([string]::IsNullOrWhiteSpace($diffStr)) {
        Write-Host "[INFO] No unstaged git changes found to inspect." -ForegroundColor Green
        return 0
    }

    Write-Host "Git Diff Summary:"
    Write-Host ([string]::Join("`n", $statOutput))
    Write-Host "`nAnalyzing modified hunks..."

    $warnings = @()
    foreach ($line in $diffOutput) {
        $lineStr = [string]$line
        if ($lineStr.StartsWith("+") -and (-not $lineStr.StartsWith("+++"))) {
            if ($lineStr -match '//\s*\.\.\.\s*(?:rest|existing|remaining|code|resto).*') {
                $warnings += "Lazy comment introduced in diff: $($lineStr.Trim())"
            }
        }
        if ($lineStr.StartsWith("-") -and (-not $lineStr.StartsWith("---"))) {
            if ($lineStr -match '(function\s+[A-Za-z0-9_$]+|addEventListener|export\s+)') {
                $warnings += "Potential deleted function or listener: $($lineStr.Trim())"
            }
        }
    }

    if ($warnings.Count -gt 0) {
        Write-Host "`n[WARN] $($warnings.Count) Warning(s) detected in git diff:" -ForegroundColor Yellow
        foreach ($w in $warnings) {
            Write-Host "    - $w" -ForegroundColor DarkYellow
        }
        return 1
    } else {
        Write-Host "`n[OK] Git diff inspection passed cleanly. No suspicious deletions or lazy patterns found." -ForegroundColor Green
        return 0
    }
}

function Invoke-ExtractInvariants {
    param([string]$FilePath, [string]$OutputFile)

    if (-not (Test-Path $FilePath)) {
        Write-Error "File not found: $FilePath"
        return 1
    }

    $content = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
    $domMatches = [regex]::Matches($content, 'id=["'']([A-Za-z0-9_\-]+)["'']|getElementById\(["'']([A-Za-z0-9_\-]+)["'']')
    $domIds = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($m in $domMatches) {
        $val = $m.Groups[2].Value
        if ($m.Groups[1].Success) { $val = $m.Groups[1].Value }
        if (-not [string]::IsNullOrWhiteSpace($val)) { [void]$domIds.Add($val) }
    }

    $funcMatches = [regex]::Matches($content, 'function\s+([A-Za-z0-9_$]+)\s*\(|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>')
    $symbols = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($m in $funcMatches) {
        $val = $m.Groups[2].Value
        if ($m.Groups[1].Success) { $val = $m.Groups[1].Value }
        if (-not [string]::IsNullOrWhiteSpace($val)) { [void]$symbols.Add($val) }
    }

    $result = [PSCustomObject]@{
        file = (Resolve-Path $FilePath).Path
        dom_ids = [string[]]($domIds | Sort-Object)
        symbols = [string[]]($symbols | Sort-Object)
        line_count = ($content -split "`r?\n").Count
    }

    $json = $result | ConvertTo-Json -Depth 5
    if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
        $json | Set-Content -LiteralPath $OutputFile -Encoding UTF8
        Write-Host "[OK] Invariants snapshot written to: $OutputFile" -ForegroundColor Green
    } else {
        Write-Host $json
    }
    return 0
}

function Invoke-VerifyInvariants {
    param([string]$BeforePath, [string]$AfterPath)

    if ((-not (Test-Path $BeforePath)) -or (-not (Test-Path $AfterPath))) {
        Write-Error "Snapshot file missing: $BeforePath or $AfterPath"
        return 1
    }

    $before = Get-Content -LiteralPath $BeforePath -Raw | ConvertFrom-Json
    $after = Get-Content -LiteralPath $AfterPath -Raw | ConvertFrom-Json

    $beforeSymbols = [System.Collections.Generic.HashSet[string]]::new([string[]]$before.symbols)
    $afterSymbols = [System.Collections.Generic.HashSet[string]]::new([string[]]$after.symbols)

    $missingSymbols = [System.Collections.Generic.List[string]]::new()
    foreach ($s in $beforeSymbols) {
        if (-not $afterSymbols.Contains($s)) { $missingSymbols.Add($s) }
    }

    $beforeDom = [System.Collections.Generic.HashSet[string]]::new([string[]]$before.dom_ids)
    $afterDom = [System.Collections.Generic.HashSet[string]]::new([string[]]$after.dom_ids)

    $missingDom = [System.Collections.Generic.List[string]]::new()
    foreach ($d in $beforeDom) {
        if (-not $afterDom.Contains($d)) { $missingDom.Add($d) }
    }

    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " [GUARDIAN] INVARIANT PRESERVATION CHECK" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "Target: $($before.file)"
    Write-Host "Before: $($beforeSymbols.Count) symbols, $($beforeDom.Count) DOM IDs"
    Write-Host "After : $($afterSymbols.Count) symbols, $($afterDom.Count) DOM IDs`n"

    $hasRegressions = $false
    if ($missingSymbols.Count -gt 0) {
        $hasRegressions = $true
        Write-Host "[REGRESSION] $($missingSymbols.Count) function/symbol(s) were deleted or renamed:" -ForegroundColor Red
        foreach ($s in $missingSymbols) { Write-Host "    - Missing Symbol: $s" -ForegroundColor DarkYellow }
    }

    if ($missingDom.Count -gt 0) {
        $hasRegressions = $true
        Write-Host "[REGRESSION] $($missingDom.Count) DOM ID(s) were deleted or renamed:" -ForegroundColor Red
        foreach ($d in $missingDom) { Write-Host "    - Missing DOM ID: #$d" -ForegroundColor DarkYellow }
    }

    if (-not $hasRegressions) {
        Write-Host "[OK] ZERO REGRESSIONS: All existing symbols and DOM IDs are fully preserved." -ForegroundColor Green
        return 0
    } else {
        Write-Host "`n[BLOCKED] The modification deleted existing functionality. Please reinstate preserved invariants." -ForegroundColor Red
        return 1
    }
}

# Entrypoint Routing
if ($Audit -ne "") {
    exit (Invoke-GuardianAudit -PathToCheck $Audit)
}
if ($DiffCheck) {
    exit (Invoke-GuardianDiffCheck)
}
if ($ExtractInvariants -ne "") {
    exit (Invoke-ExtractInvariants -FilePath $ExtractInvariants -OutputFile $OutFile)
}
if ($VerifyInvariantsBefore -ne "" -and $VerifyInvariantsAfter -ne "") {
    exit (Invoke-VerifyInvariants -BeforePath $VerifyInvariantsBefore -AfterPath $VerifyInvariantsAfter)
}

Write-Host "AI Code Guardian CLI (PowerShell Edition)"
Write-Host "Usage: .\guardian.ps1 -Audit <path>"
Write-Host "       .\guardian.ps1 -DiffCheck"
Write-Host "       .\guardian.ps1 -ExtractInvariants <file> [-OutFile <snapshot.json>]"
Write-Host "       .\guardian.ps1 -VerifyInvariantsBefore <b.json> -VerifyInvariantsAfter <a.json>"
