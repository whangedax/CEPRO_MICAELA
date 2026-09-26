Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('sources\templates\previews\01_NOMINA_DE_MATRICULA.png')
$bmp = New-Object System.Drawing.Bitmap($img)

$w = $img.Width
$h = $img.Height

# Find first black pixel from top
$top = -1
for ($y = 20; $y -lt $h; $y++) {
    for ($x = 40; $x -lt $w; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            $top = $y
            break
        }
    }
    if ($top -ne -1) { break }
}

# Find first black pixel from bottom
$bottom = -1
for ($y = $h - 1; $y -gt 0; $y--) {
    for ($x = 40; $x -lt $w; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            $bottom = $y
            break
        }
    }
    if ($bottom -ne -1) { break }
}

# Find first black pixel from left
$left = -1
for ($x = 40; $x -lt $w; $x++) {
    for ($y = 20; $y -lt $h; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            $left = $x
            break
        }
    }
    if ($left -ne -1) { break }
}

# Find first black pixel from right
$right = -1
for ($x = $w - 1; $x -gt 0; $x--) {
    for ($y = 20; $y -lt $h; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            $right = $x
            break
        }
    }
    if ($right -ne -1) { break }
}

Write-Host "Table bounding box: Left=$left, Right=$right, Top=$top, Bottom=$bottom"
Write-Host "Table width: $($right - $left + 1), Table height: $($bottom - $top + 1)"

# Now find the middle gap (row 53 to 54)
# Between row 53 and 54 there's a space or line. Let's find horizontal white lines.
$whiteLines = @()
for ($y = $top; $y -lt $bottom; $y++) {
    $isWhite = $true
    for ($x = $left; $x -le $right; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 250 -or $c.G -lt 250 -or $c.B -lt 250) {
            $isWhite = $false
            break
        }
    }
    if ($isWhite) {
        $whiteLines += $y
    }
}
Write-Host "White lines (pure white across table): " $($whiteLines -join ", ")

$img.Dispose()
$bmp.Dispose()
