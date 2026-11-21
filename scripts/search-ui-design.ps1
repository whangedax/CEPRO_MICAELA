[CmdletBinding(DefaultParameterSetName = 'Domain')]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$Query,

    [Parameter(ParameterSetName = 'Domain')]
    [ValidateSet('style', 'color', 'chart', 'landing', 'product', 'ux', 'typography', 'google-fonts', 'icons', 'gsap', 'react', 'web')]
    [string]$Domain = 'ux',

    [Parameter(Mandatory = $true, ParameterSetName = 'Stack')]
    [ValidateSet('react', 'html-tailwind', 'shadcn')]
    [string]$Stack,

    [ValidateRange(1, 5)]
    [int]$MaxResults = 1,
    [string]$PythonPath,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSearch = Join-Path $taskRoot '.agents\skills\ui-ux-pro-max\scripts\search.py'
if (-not (Test-Path -LiteralPath $taskSearch -PathType Leaf)) {
    throw 'Falta la skill ui-ux-pro-max en este proyecto.'
}

# Prefer an explicit interpreter; never install Python or change system PATH.
$taskCandidates = @()
if ($PythonPath) {
    $taskCandidates += [pscustomobject]@{Exe = $PythonPath; Prefix = @()}
} elseif ($env:CEPRO_PYTHON) {
    $taskCandidates += [pscustomobject]@{Exe = $env:CEPRO_PYTHON; Prefix = @()}
} else {
    foreach ($taskName in @('py', 'python', 'python3')) {
        $taskCommand = Get-Command $taskName -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($taskCommand -and $taskCommand.Source -notmatch '[\\/]Microsoft[\\/]WindowsApps[\\/]') {
            $taskPrefix = @()
            if ($taskName -eq 'py') { $taskPrefix = @('-3') }
            $taskCandidates += [pscustomobject]@{Exe = $taskCommand.Source; Prefix = $taskPrefix}
        }
    }
    # Optional local fallback when Codex's runtime is already installed on this PC.
    if ($env:USERPROFILE) {
        $taskBundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
        if (Test-Path -LiteralPath $taskBundled -PathType Leaf) {
            $taskCandidates += [pscustomobject]@{Exe = $taskBundled; Prefix = @()}
        }
    }
}

$taskInterpreter = $null
foreach ($taskCandidate in $taskCandidates) {
    try {
        $taskProbeArgs = @($taskCandidate.Prefix) + @('-B', '-c', 'import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)')
        & $taskCandidate.Exe @taskProbeArgs 2>$null
        if ($LASTEXITCODE -eq 0) { $taskInterpreter = $taskCandidate; break }
    } catch { continue }
}
if (-not $taskInterpreter) {
    throw 'No se encontró Python 3. Usa -PythonPath con un intérprete existente o define CEPRO_PYTHON; no se modificó el sistema.'
}

$taskArguments = @($taskInterpreter.Prefix) + @('-B', $taskSearch, $Query, '-n', [string]$MaxResults)
if ($PSCmdlet.ParameterSetName -eq 'Stack') { $taskArguments += @('--stack', $Stack) }
else { $taskArguments += @('--domain', $Domain) }
if ($Json) { $taskArguments += '--json' }
& $taskInterpreter.Exe @taskArguments
exit $LASTEXITCODE
