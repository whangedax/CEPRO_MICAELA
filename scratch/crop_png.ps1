Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('sources\templates\previews\01_NOMINA_DE_MATRICULA.png')
$left = 40
$top = 50
$width = 1046
$height = 2283

$halfHeight = 1141
$remHeight = 1142

$rect1 = New-Object System.Drawing.Rectangle($left, $top, $width, $halfHeight)
$rect2 = New-Object System.Drawing.Rectangle($left, ($top + $halfHeight), $width, $remHeight)

$bmp1 = New-Object System.Drawing.Bitmap($width, $halfHeight)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.DrawImage($img, 0, 0, $rect1, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()
$bmp1.Save('app\img\TMPL01_PAGE_1.png', [System.Drawing.Imaging.ImageFormat]::Png)

$bmp2 = New-Object System.Drawing.Bitmap($width, $remHeight)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.DrawImage($img, 0, 0, $rect2, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$bmp2.Save('app\img\TMPL01_PAGE_2.png', [System.Drawing.Imaging.ImageFormat]::Png)

$img.Dispose()
$bmp1.Dispose()
$bmp2.Dispose()
Write-Host "Cropped successfully."
