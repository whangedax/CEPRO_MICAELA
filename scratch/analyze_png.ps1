Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('sources\templates\previews\01_NOMINA_DE_MATRICULA.png')
$bmp = New-Object System.Drawing.Bitmap($img)

# Find column header height by scanning down column 0 (which is the row header, but let's scan a bit to the right)
# Wait, the row header is on the left. Let's find the background color of the top-left pixel.
$bg = $bmp.GetPixel(0,0)
Write-Host "Top-left pixel: $($bg.R), $($bg.G), $($bg.B)"

# Let's find the first row that doesn't have the background color (or is a border)
$headerHeight = 0
for ($y = 0; $y -lt 100; $y++) {
    $c = $bmp.GetPixel(50, $y)
    if ($c.R -ne $bg.R -or $c.G -ne $bg.G -or $c.B -ne $bg.B) {
        $headerHeight = $y
        # Wait, there might be lines. Let's just output the colors of the first 50 pixels down X=50
    }
}

$output = @()
for ($y = 0; $y -lt 60; $y++) {
    $c = $bmp.GetPixel(50, $y)
    $output += "Y=$y : $($c.R),$($c.G),$($c.B)"
}
Write-Host "Vertical scan at X=50:"
$output -join " | " | Write-Host

$outputX = @()
for ($x = 0; $x -lt 60; $x++) {
    $c = $bmp.GetPixel($x, 50)
    $outputX += "X=$x : $($c.R),$($c.G),$($c.B)"
}
Write-Host "Horizontal scan at Y=50:"
$outputX -join " | " | Write-Host

# We can also scan the whole image to find where Row 53 ends and Row 54 begins.
# The row headers have text "53", "54". They are separated by grid lines.
$img.Dispose()
$bmp.Dispose()
