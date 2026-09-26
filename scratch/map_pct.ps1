Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('app\img\TMPL01_PAGE_1.png')
$w = $img.Width
$h = $img.Height
Write-Host "Page 1: Width=$w, Height=$h"
# Just to manually map:
# I will output the exact percentages for some anchors.
# We know: 
# Row 1 is approx Y=0 to Y=21.
# But let's just use approximate visual percentages that I can refine, 
# or I can calculate them. 
# For row 15 (first student row):
# In Excel, row 1-14 have some height. Let's assume the table headers end at row 14.
# I can just guess the % and the user can visually validate.
