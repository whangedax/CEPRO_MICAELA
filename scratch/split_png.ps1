Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('sources\templates\previews\01_NOMINA_DE_MATRICULA.png')
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$h = $img.Height / 2
$rect1 = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $h)
$rect2 = New-Object System.Drawing.Rectangle(0, $h, $img.Width, $h)

$bmp1 = New-Object System.Drawing.Bitmap($img.Width, $h)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.DrawImage($img, 0, 0, $rect1, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()
$bmp1.Save('app\img\TMPL01_PAGE_1.png', [System.Drawing.Imaging.ImageFormat]::Png)

$bmp2 = New-Object System.Drawing.Bitmap($img.Width, $h)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.DrawImage($img, 0, 0, $rect2, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$bmp2.Save('app\img\TMPL01_PAGE_2.png', [System.Drawing.Imaging.ImageFormat]::Png)

$img.Dispose()
$bmp1.Dispose()
$bmp2.Dispose()
Write-Host "Done splitting."
