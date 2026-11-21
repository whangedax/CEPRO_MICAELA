'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const { PDFDocument, PDFArray, PDFName, PDFRawStream } = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const CLEAN_DIR = path.join(ROOT, 'sources/templates/PLANTILLAS_LIMPIAS_2026');
const OUT_PDF_DIR = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_OFICIALES_2026');
const MANIFEST_OUT = path.join(ROOT, 'app/data/pdf-manifests/official-2026-boxes.json');
const TMP_DIR = path.join(ROOT, '.tmp/doc-2026-bases');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildPowerShellDriver(psPath) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$cleanDir = $env:CEPRO_CLEAN_DIR
$outDir = $env:CEPRO_OUT_DIR
$tmpDir = $env:CEPRO_TMP_DIR

function Upscale-JpegIfSmall($bytes, $minW, $minH) {
  $msIn = New-Object IO.MemoryStream(,$bytes)
  $img = [System.Drawing.Image]::FromStream($msIn)
  try {
    if ($img.Width -ge $minW -and $img.Height -ge $minH) { return $null }
    $targetW = [Math]::Max($img.Width * 2, $minW)
    $targetH = [Math]::Max($img.Height * 2, $minH)
    $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $bmp.SetResolution(300, 300)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($img, 0, 0, $targetW, $targetH)
    } finally { $g.Dispose() }
    $msOut = New-Object IO.MemoryStream
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
    $bmp.Save($msOut, $enc, $ep)
    $bmp.Dispose()
    return $msOut.ToArray()
  } finally {
    $img.Dispose()
    $msIn.Dispose()
  }
}

# 1. Upscale low-res images (<300 DPI) in workspace copy of Plantilla_04 PPTX
$p4Src = Join-Path $cleanDir 'Plantilla_04_Certificado_de_Egresado.pptx'
$p4Upd = Join-Path $tmpDir 'Plantilla_04_upscaled.pptx'
Copy-Item $p4Src $p4Upd -Force
$zip = [IO.Compression.ZipFile]::Open($p4Upd, [IO.Compression.ZipArchiveMode]::Update)
$updatedMedia = $false
try {
  foreach ($spec in @(@{name='ppt/media/image5.jpeg'; w=800; h=868}, @{name='ppt/media/image6.jpg'; w=720; h=1120})) {
    $entry = $zip.GetEntry($spec.name)
    if ($entry) {
      $ms = New-Object IO.MemoryStream
      $s = $entry.Open(); $s.CopyTo($ms); $s.Dispose()
      $newBytes = Upscale-JpegIfSmall ($ms.ToArray()) $spec.w $spec.h
      $ms.Dispose()
      if ($newBytes) {
        $entry.Delete()
        $ne = $zip.CreateEntry($spec.name, [IO.Compression.CompressionLevel]::Optimal)
        $ns = $ne.Open(); $ns.Write($newBytes, 0, $newBytes.Length); $ns.Dispose()
        $updatedMedia = $true
      }
    }
  }
} finally { $zip.Dispose() }
if ($updatedMedia) { Copy-Item $p4Upd $p4Src -Force }

# 2. Prepare clean Plantilla_04 PPTX (preserve chrome/logos/headers/Director, clear dynamic fields)
$p4Work = Join-Path $tmpDir 'Plantilla_04_base.pptx'
Copy-Item $p4Src $p4Work -Force
$zip4 = [IO.Compression.ZipFile]::Open($p4Work, [IO.Compression.ZipArchiveMode]::Update)
$p4Meta = @{}
try {
  $slideEntry = $zip4.GetEntry('ppt/slides/slide1.xml')
  $sr = New-Object IO.StreamReader($slideEntry.Open())
  $xmlText = $sr.ReadToEnd(); $sr.Dispose()
  $x = [xml]$xmlText
  $ns = New-Object Xml.XmlNamespaceManager($x.NameTable)
  $ns.AddNamespace('p','http://schemas.openxmlformats.org/presentationml/2006/main')
  $ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
  $ns.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')

  $spList = $x.SelectNodes('//p:sp',$ns)
  foreach($sp in $spList){
    $txt = ($sp.SelectNodes('.//a:t',$ns) | ForEach-Object { $_.InnerText }) -join ''
    $off = $sp.SelectSingleNode('.//a:xfrm/a:off',$ns)
    $ext = $sp.SelectSingleNode('.//a:xfrm/a:ext',$ns)
    $box = if($off -and $ext){ @{
      x=[math]::Round([double]$off.x/12700,2); y=[math]::Round([double]$off.y/12700,2);
      w=[math]::Round([double]$ext.cx/12700,2); h=[math]::Round([double]$ext.cy/12700,2)
    } } else { $null }

    if ($txt.Contains('[Apellidos, Nombres]')) {
      $p4Meta.otorgadoBox = $box
      # Clear every run after "Otorgado a :" inside the paragraph containing [Apellidos, Nombres]
      foreach($para in $sp.SelectNodes('.//a:p',$ns)){
        $ptxt = ($para.SelectNodes('.//a:t',$ns) | ForEach-Object { $_.InnerText }) -join ''
        if($ptxt.Contains('[Apellidos, Nombres]')){
          $seenColon = $false
          foreach($run in @($para.SelectNodes('a:r',$ns))){
            $rt = ($run.SelectNodes('a:t',$ns) | ForEach-Object { $_.InnerText }) -join ''
            if(-not $seenColon){
              $colonIdx = $rt.IndexOf(':')
              if($colonIdx -ge 0){
                $prefix = $rt.Substring(0, $colonIdx + 1)
                $firstT = $true
                foreach($t in $run.SelectNodes('a:t',$ns)){
                  if($firstT){ $t.InnerText = $prefix; $firstT = $false } else { $t.InnerText = '' }
                }
                $seenColon = $true
              }
            } else {
              foreach($t in $run.SelectNodes('a:t',$ns)){ $t.InnerText = '' }
            }
          }
        }
      }
    } elseif ($txt.Contains('normas Tecnológicas') -or $txt.Contains('[PROGRAMA DE ESTUDIOS]')) {
      $p4Meta.bodyBox = $box
      foreach($t in $sp.SelectNodes('.//a:t',$ns)){ $t.InnerText = '' }
    } elseif ($txt.Contains('[DD] de [mes]')) {
      $p4Meta.dateBox = $box
      foreach($t in $sp.SelectNodes('.//a:t',$ns)){ $t.InnerText = '' }
    } elseif ($txt.Contains('Nombre del Docente')) {
      $p4Meta.teacherSignBox = $box
      foreach($t in $sp.SelectNodes('.//a:t',$ns)){ $t.InnerText = '' }
    }
  }
  $slideEntry.Delete()
  $newSlide = $zip4.CreateEntry('ppt/slides/slide1.xml', [IO.Compression.CompressionLevel]::Optimal)
  $sw = New-Object IO.StreamWriter($newSlide.Open(), [Text.UTF8Encoding]::new($false))
  $x.Save($sw); $sw.Dispose()
} finally { $zip4.Dispose() }

# Export Plantilla_04 base PDF + reference PDF via PowerPoint COM
$ppt = New-Object -ComObject PowerPoint.Application
try {
  $pres = $ppt.Presentations.Open($p4Work, $false, $false, $false)
  $pres.SaveAs((Join-Path $outDir 'BASE_04_CERTIFICADO_EGRESADO_2026.pdf'), 32)
  $pres.Close()
} finally {
  $ppt.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
}

# 3. Prepare clean Plantilla_01 DOCX (keep only emblem P[0], clear rest) & export via Word COM
$p1Src = Join-Path $cleanDir 'Plantilla_01_Resolucion_Directoral_Titulo.docx'
$p1Work = Join-Path $tmpDir 'Plantilla_01_base.docx'
Copy-Item $p1Src $p1Work -Force
$zip1 = [IO.Compression.ZipFile]::Open($p1Work, [IO.Compression.ZipArchiveMode]::Update)
$p1Meta = @{}
try {
  $docEntry = $zip1.GetEntry('word/document.xml')
  $sr1 = New-Object IO.StreamReader($docEntry.Open())
  $dx = [xml]$sr1.ReadToEnd(); $sr1.Dispose()
  $dns = New-Object Xml.XmlNamespaceManager($dx.NameTable)
  $dns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $pg = $dx.SelectSingleNode('//w:sectPr/w:pgSz',$dns)
  $pm = $dx.SelectSingleNode('//w:sectPr/w:pgMar',$dns)
  $p1Meta.pageW = [math]::Round([double]$pg.w / 20, 2)
  $p1Meta.pageH = [math]::Round([double]$pg.h / 20, 2)
  $p1Meta.marginL = [math]::Round([double]$pm.left / 20, 2)
  $p1Meta.marginR = [math]::Round([double]$pm.right / 20, 2)
  $p1Meta.marginT = [math]::Round([double]$pm.top / 20, 2)
  $p1Meta.marginB = [math]::Round([double]$pm.bottom / 20, 2)

  $body = $dx.SelectSingleNode('//w:body',$dns)
  $nodes = @($body.ChildNodes)
  $keptFirstImg = $false
  foreach ($node in $nodes) {
    if ($node.LocalName -eq 'sectPr') { continue }
    $hasImg = ($node.SelectNodes('.//*[local-name()="drawing" or local-name()="pict"]',$dns).Count -gt 0)
    if (-not $keptFirstImg -and $hasImg) {
      $keptFirstImg = $true
      # Strip trailing spaces while keeping drawing
      foreach ($t in @($node.SelectNodes('.//w:t',$dns))) { $t.InnerText = '' }
      continue
    }
    $body.RemoveChild($node) | Out-Null
  }
  $docEntry.Delete()
  $newDoc = $zip1.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
  $sw1 = New-Object IO.StreamWriter($newDoc.Open(), [Text.UTF8Encoding]::new($false))
  $dx.Save($sw1); $sw1.Dispose()
} finally { $zip1.Dispose() }

$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open([string]$p1Work, $false, $true)
  $p1OutPdf = [string](Join-Path $outDir 'BASE_01_RD_TITULO_2026.pdf')
  $doc.ExportAsFixedFormat($p1OutPdf, 17)
  $doc.Close(0)
} finally {
  try { $word.Quit(0) } catch { try { $word.Quit() } catch {} }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}

# 4. Excel templates: extract exact sheet/printArea/cell boxes, export REF & clean BASE PDFs
function Get-Rect($ws, $addr) {
  $r = $ws.Range($addr)
  return @{
    left = [double]$r.Left
    top = [double]$r.Top
    width = [double]$r.Width
    height = [double]$r.Height
  }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
$excelMeta = @{}
try {
  # P02 se construye directamente desde Plantilla_02_Titulo_Auxiliar_Tecnico_corregida.pdf en Node.js (A4 horizontal oficial)

  # --- P03B ---
  $p3Work = Join-Path $tmpDir 'Plantilla_03B_base.xlsx'
  Copy-Item (Join-Path $cleanDir 'Plantilla_03B_Certificado_Modular_Excel.xlsx') $p3Work -Force
  $wb3 = $excel.Workbooks.Open($p3Work)
  $ws3a = $wb3.Worksheets.Item('anterior')
  $ws3b = $wb3.Worksheets.Item('posterior')
  $excelMeta.P03B_Anterior = @{
    printArea = $ws3a.PageSetup.PrintArea
    orientation = [int]$ws3a.PageSetup.Orientation
    margins = @{ l=$ws3a.PageSetup.LeftMargin; r=$ws3a.PageSetup.RightMargin; t=$ws3a.PageSetup.TopMargin; b=$ws3a.PageSetup.BottomMargin }
    centerH = [bool]$ws3a.PageSetup.CenterHorizontally; centerV = [bool]$ws3a.PageSetup.CenterVertically
    paRect = (Get-Rect $ws3a $ws3a.PageSetup.PrintArea)
    cells = @{
      studentName = (Get-Rect $ws3a 'D14:O14')
      moduleName = (Get-Rect $ws3a 'A18:O18')
      programName = (Get-Rect $ws3a 'A22:O23')
      dateStart = (Get-Rect $ws3a 'D24')
      dateEnd = (Get-Rect $ws3a 'F24')
      creditsLine = (Get-Rect $ws3a 'G24:O24')
      hoursNum = (Get-Rect $ws3a 'C26')
      semesterText = (Get-Rect $ws3a 'D26:J26')
      emissionDate = (Get-Rect $ws3a 'H29:N29')
      anchorTop = (Get-Rect $ws3a 'A7:O7')
      anchorBot = (Get-Rect $ws3a 'A16:J16')
    }
  }
  $p3Rows = @()
  for ($r=7; $r -le 14; $r++) {
    $p3Rows += @{
      row = $r
      ud = (Get-Rect $ws3b ("B$r" + ":F$r"))
      credits = (Get-Rect $ws3b "G$r")
      hours = (Get-Rect $ws3b "H$r")
      capacity = (Get-Rect $ws3b ("I$r" + ":K$r"))
      grade = (Get-Rect $ws3b "L$r")
    }
  }
  $excelMeta.P03B_Posterior = @{
    printArea = $ws3b.PageSetup.PrintArea
    orientation = [int]$ws3b.PageSetup.Orientation
    margins = @{ l=$ws3b.PageSetup.LeftMargin; r=$ws3b.PageSetup.RightMargin; t=$ws3b.PageSetup.TopMargin; b=$ws3b.PageSetup.BottomMargin }
    centerH = [bool]$ws3b.PageSetup.CenterHorizontally; centerV = [bool]$ws3b.PageSetup.CenterVertically
    paRect = (Get-Rect $ws3b $ws3b.PageSetup.PrintArea)
    cells = @{
      registerCode = (Get-Rect $ws3b 'A1:E1')
      ciclo = (Get-Rect $ws3b 'F2:I2')
      modalidad = (Get-Rect $ws3b 'K2:L2')
      moduleName = (Get-Rect $ws3b 'C4:L4')
      uc = (Get-Rect $ws3b 'A7:A14')
      rows = $p3Rows
      anchorTop = (Get-Rect $ws3b 'A4:B4')
      anchorBot = (Get-Rect $ws3b 'A16:L16')
    }
  }
  $wb3.ExportAsFixedFormat(0, (Join-Path $tmpDir 'REF_03B.pdf'))
  foreach($addr in @('D14:M14','A18:O18','A22:O23','D24','F24','G24:K24','C26','D26:J26','H29:N29')){ $ws3a.Range($addr).Value2 = '' }
  foreach($addr in @('A1','F2:I2','K2:L2','C4:L4','A7:A14','B7:L14')){ $ws3b.Range($addr).Value2 = '' }
  $wb3.ExportAsFixedFormat(0, (Join-Path $outDir 'BASE_03B_CERTIFICADO_MODULAR_2026.pdf'))
  $wb3.Close($false)

  # --- P05 ---
  $p5Work = Join-Path $tmpDir 'Plantilla_05_base.xls'
  Copy-Item (Join-Path $cleanDir 'Plantilla_05_Acta_de_Evaluacion.xls') $p5Work -Force
  $wb5 = $excel.Workbooks.Open($p5Work)
  $ws5a = $wb5.Worksheets.Item('anverso')
  $ws5b = $wb5.Worksheets.Item('reverso')
  $anvCols = @('L','M','N','O','P','Q','R','S','T','U','V','W')
  $anvHeaders = @(); $anvCredits = @(); $anvHours = @()
  foreach($col in $anvCols){
    $anvHeaders += (Get-Rect $ws5a ($col + '4:' + $col + '23'))
    $anvCredits += (Get-Rect $ws5a ($col + '25'))
    $anvHours += (Get-Rect $ws5a ($col + '26'))
  }
  $anvRows = @()
  for($r=27; $r -le 46; $r++){
    $scores = @()
    foreach($col in $anvCols){ $scores += (Get-Rect $ws5a ($col + $r)) }
    $anvRows += @{
      row = $r
      num = (Get-Rect $ws5a "B$r")
      cond = (Get-Rect $ws5a "C$r")
      dni = (Get-Rect $ws5a "D$r:F$r")
      name = (Get-Rect $ws5a "G$r:K$r")
      scores = $scores
      udApr = (Get-Rect $ws5a "X$r")
      udDes = (Get-Rect $ws5a "Y$r")
      credApr = (Get-Rect $ws5a "Z$r")
      hrsApr = (Get-Rect $ws5a "AA$r")
      puntaje = (Get-Rect $ws5a "AB$r")
      promedio = (Get-Rect $ws5a "AC$r")
      sitA = (Get-Rect $ws5a "AD$r")
      sitD = (Get-Rect $ws5a "AE$r:AF$r")
      sitR = (Get-Rect $ws5a "AG$r:AI$r")
      obs = (Get-Rect $ws5a "AJ$r:AR$r")
    }
  }
  $excelMeta.P05_Anverso = @{
    printArea = $ws5a.PageSetup.PrintArea
    orientation = [int]$ws5a.PageSetup.Orientation
    margins = @{ l=$ws5a.PageSetup.LeftMargin; r=$ws5a.PageSetup.RightMargin; t=$ws5a.PageSetup.TopMargin; b=$ws5a.PageSetup.BottomMargin }
    centerH = [bool]$ws5a.PageSetup.CenterHorizontally; centerV = [bool]$ws5a.PageSetup.CenterVertically
    paRect = (Get-Rect $ws5a $ws5a.PageSetup.PrintArea)
    cells = @{
      programName = (Get-Rect $ws5a 'AD3:AR4')
      ciclo = (Get-Rect $ws5a 'AF5:AR6')
      moduleName = (Get-Rect $ws5a 'AH7:AR8')
      turno = (Get-Rect $ws5a 'AG13:AR14')
      seccion = (Get-Rect $ws5a 'AH15:AR16')
      creditos = (Get-Rect $ws5a 'AJ17:AL18')
      horas = (Get-Rect $ws5a 'AO17:AR18')
      fechaInicio = (Get-Rect $ws5a 'AF19:AL20')
      fechaFin = (Get-Rect $ws5a 'AO19:AR20')
      periodoInicio = (Get-Rect $ws5a 'AL22:AL23')
      periodoFin = (Get-Rect $ws5a 'AP22:AQ23')
      udHeaders = $anvHeaders
      udCredits = $anvCredits
      udHours = $anvHours
      rows = $anvRows
      anchorTop = (Get-Rect $ws5a 'B5:D5')
      anchorBot = (Get-Rect $ws5a 'L24:W24')
    }
  }

  $revCols = @('I','J','K','L','M','N','O','P','Q','R','S','T')
  $revHeaders = @(); $revCredits = @(); $revHours = @()
  $revTotApr = @(); $revTotDes = @(); $revTotRet = @()
  foreach($col in $revCols){
    $revHeaders += (Get-Rect $ws5b ($col + '2:' + $col + '21'))
    $revCredits += (Get-Rect $ws5b ($col + '23'))
    $revHours += (Get-Rect $ws5b ($col + '24'))
    $revTotApr += (Get-Rect $ws5b ($col + '36'))
    $revTotDes += (Get-Rect $ws5b ($col + '37'))
    $revTotRet += (Get-Rect $ws5b ($col + '38'))
  }
  $revRows = @()
  for($r=25; $r -le 34; $r++){
    $scores = @()
    foreach($col in $revCols){ $scores += (Get-Rect $ws5b ($col + $r)) }
    $revRows += @{
      row = $r
      num = (Get-Rect $ws5b "A$r:B$r")
      cond = (Get-Rect $ws5b "C$r")
      dni = (Get-Rect $ws5b "D$r")
      name = (Get-Rect $ws5b "E$r:H$r")
      scores = $scores
      udApr = (Get-Rect $ws5b "V$r")
      udDes = (Get-Rect $ws5b "W$r")
      credApr = (Get-Rect $ws5b "X$r")
      hrsApr = (Get-Rect $ws5b "Y$r")
      puntaje = (Get-Rect $ws5b "Z$r")
      promedio = (Get-Rect $ws5b "AA$r")
      sitA = (Get-Rect $ws5b "AB$r:AC$r")
      sitD = (Get-Rect $ws5b "AD$r")
      sitR = (Get-Rect $ws5b "AE$r")
      obs = (Get-Rect $ws5b "AF$r:AL$r")
    }
  }
  $excelMeta.P05_Reverso = @{
    printArea = $ws5b.PageSetup.PrintArea
    orientation = [int]$ws5b.PageSetup.Orientation
    margins = @{ l=$ws5b.PageSetup.LeftMargin; r=$ws5b.PageSetup.RightMargin; t=$ws5b.PageSetup.TopMargin; b=$ws5b.PageSetup.BottomMargin }
    centerH = [bool]$ws5b.PageSetup.CenterHorizontally; centerV = [bool]$ws5b.PageSetup.CenterVertically
    paRect = (Get-Rect $ws5b $ws5b.PageSetup.PrintArea)
    cells = @{
      uc = (Get-Rect $ws5b 'A2:H4')
      statMatriculados = (Get-Rect $ws5b 'AJ3:AK3')
      statAprobados = (Get-Rect $ws5b 'AJ4:AK4')
      statDesaprobados = (Get-Rect $ws5b 'AJ5:AK5')
      statRetirados = (Get-Rect $ws5b 'AJ6:AK6')
      capacidades = @((Get-Rect $ws5b 'AC8:AL8'), (Get-Rect $ws5b 'AC9:AL10'), (Get-Rect $ws5b 'AC11:AL11'), (Get-Rect $ws5b 'AC12:AL13'))
      udHeaders = $revHeaders
      udCredits = $revCredits
      udHours = $revHours
      rows = $revRows
      totAprobados = $revTotApr
      totDesaprobados = $revTotDes
      totRetirados = $revTotRet
      moduleName = (Get-Rect $ws5b 'A41:F41')
      teacherName = (Get-Rect $ws5b 'G41:L41')
      emissionDate = (Get-Rect $ws5b 'A49:M49')
      anchorTop = (Get-Rect $ws5b 'AC3:AI3')
      anchorBot = (Get-Rect $ws5b 'A40:F40')
    }
  }
  $wb5.ExportAsFixedFormat(0, (Join-Path $tmpDir 'REF_05.pdf'))
  foreach($addr in @('AD3:AR4','AF5:AR6','AH7:AR8','AG13:AR14','AH15:AR16','AJ17:AL18','AO17:AR18','AF19:AL20','AO19:AR20','AL22','AP22:AQ22','L4:W23','L25:W26','B27:AR46')){ $ws5a.Range($addr).Value2 = '' }
  foreach($addr in @('A2:H4','AJ3:AK6','AC8:AL13','I2:T21','I23:T24','A25:AL34','I36:T38','A41:L41','A49')){ $ws5b.Range($addr).Value2 = '' }
  $wb5.ExportAsFixedFormat(0, (Join-Path $outDir 'BASE_05_ACTA_EVALUACION_2026.pdf'))
  $wb5.Close($false)

  # --- P06 ---
  $p6Work = Join-Path $tmpDir 'Plantilla_06_base.xlsx'
  Copy-Item (Join-Path $cleanDir 'Plantilla_06_Nomina_de_Matricula_Modular.xlsx') $p6Work -Force
  $wb6 = $excel.Workbooks.Open($p6Work)
  $ws6 = $wb6.Worksheets.Item('Nomina_Matricula')
  $p6Rows = @()
  for($r=18; $r -le 47; $r++){
    $p6Rows += @{
      row = $r
      num = (Get-Rect $ws6 "B$r")
      code = (Get-Rect $ws6 "C$r")
      name = (Get-Rect $ws6 "D$r")
      sex = (Get-Rect $ws6 "E$r")
      birth = (Get-Rect $ws6 "F$r")
      cond = (Get-Rect $ws6 "G$r")
      uds = (Get-Rect $ws6 "H$r")
      credits = (Get-Rect $ws6 "I$r")
    }
  }
  $excelMeta.P06_Nomina = @{
    printArea = $ws6.PageSetup.PrintArea
    orientation = [int]$ws6.PageSetup.Orientation
    margins = @{ l=$ws6.PageSetup.LeftMargin; r=$ws6.PageSetup.RightMargin; t=$ws6.PageSetup.TopMargin; b=$ws6.PageSetup.BottomMargin }
    centerH = [bool]$ws6.PageSetup.CenterHorizontally; centerV = [bool]$ws6.PageSetup.CenterVertically
    paRect = (Get-Rect $ws6 $ws6.PageSetup.PrintArea)
    cells = @{
      year = (Get-Rect $ws6 'G11:I11')
      programName = (Get-Rect $ws6 'D12')
      academicPeriod = (Get-Rect $ws6 'G12:I12')
      moduleName = (Get-Rect $ws6 'D13')
      classPeriod = (Get-Rect $ws6 'G13:I13')
      nivelFormativo = (Get-Rect $ws6 'D14')
      formacion = (Get-Rect $ws6 'G14:I14')
      turno = (Get-Rect $ws6 'D16')
      seccion = (Get-Rect $ws6 'G16:I16')
      rows = $p6Rows
      sumMen = (Get-Rect $ws6 'C51')
      sumWomen = (Get-Rect $ws6 'D51')
      sumTotal = (Get-Rect $ws6 'E51')
      sumGrat = (Get-Rect $ws6 'G51')
      sumPag = (Get-Rect $ws6 'H51')
      sumBec = (Get-Rect $ws6 'I51')
      emissionDate = (Get-Rect $ws6 'B53:I53')
      anchorTop = (Get-Rect $ws6 'D3:I3')
      anchorBot = (Get-Rect $ws6 'C50')
    }
  }
  $wb6.ExportAsFixedFormat(0, (Join-Path $tmpDir 'REF_06.pdf'))
  foreach($addr in @('G11','D12','G12','D13','G13:I13','D14','G14','D16','G16','B18:I47','C51:I51','B53:I53')){ $ws6.Range($addr).Value2 = '' }
  $wb6.ExportAsFixedFormat(0, (Join-Path $outDir 'BASE_06_NOMINA_MATRICULA_2026.pdf'))
  $wb6.Close($false)
} finally {
  $excel.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}

$outJson = @{
  p1 = $p1Meta
  p4 = $p4Meta
  excel = $excelMeta
} | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $tmpDir 'raw-meta.json'), $outJson, [Text.UTF8Encoding]::new($false))
Write-Output 'COM_EXPORT_OK'
`;
  fs.writeFileSync(psPath, '\uFEFF' + script, 'utf8');
}

function mapExcelRectToPdf(cellRect, sheetMeta, pageSize) {
  const pa = sheetMeta.paRect;
  const m = sheetMeta.margins;
  const availW = pageSize.width - m.l - m.r;
  const availH = pageSize.height - m.t - m.b;
  const scale = Math.min(1, availW / pa.width, availH / pa.height);
  const contentW = pa.width * scale;
  const contentH = pa.height * scale;
  const offsetX = sheetMeta.centerH ? m.l + (availW - contentW) / 2 : m.l;
  const offsetYTop = sheetMeta.centerV ? m.t + (availH - contentH) / 2 : m.t;

  const pdfX = offsetX + (cellRect.left - pa.left) * scale;
  const pdfW = cellRect.width * scale;
  const pdfH = cellRect.height * scale;
  const topY = offsetYTop + (cellRect.top - pa.top) * scale;
  const pdfY = pageSize.height - (topY + pdfH);

  return {
    x: Number(pdfX.toFixed(2)),
    y: Number(pdfY.toFixed(2)),
    w: Number(pdfW.toFixed(2)),
    h: Number(pdfH.toFixed(2)),
    scale: Number(scale.toFixed(6)),
  };
}

function mapExcelTree(obj, sheetMeta, pageSize) {
  if (Array.isArray(obj)) return obj.map((v) => mapExcelTree(v, sheetMeta, pageSize));
  if (obj && typeof obj === 'object') {
    if (typeof obj.left === 'number' && typeof obj.top === 'number' && typeof obj.width === 'number' && typeof obj.height === 'number') {
      return mapExcelRectToPdf(obj, sheetMeta, pageSize);
    }
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = mapExcelTree(v, sheetMeta, pageSize);
    }
    return res;
  }
  return obj;
}

async function verifyExcelAnchorCalibration(refPdfPath, pageIdx, anchorText, expectedPdfBox) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = new Uint8Array(fs.readFileSync(refPdfPath));
  const loadingTask = pdfjs.getDocument({ data: bytes, verbosity: 0 });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageIdx + 1);
  const tc = await page.getTextContent();
  const items = tc.items.map((it) => ({
    str: it.str,
    x: it.transform[4],
    y: it.transform[5],
  }));
  const match = items.find((i) => i.str.includes(anchorText));
  if (!match) return { found: false, anchorText };
  return {
    found: true,
    anchorText,
    actualX: Number(match.x.toFixed(2)),
    actualY: Number(match.y.toFixed(2)),
    box: expectedPdfBox,
    dx: Number((match.x - expectedPdfBox.x).toFixed(2)),
    dy: Number((match.y - expectedPdfBox.y).toFixed(2)),
  };
}

const TMPL_21_OFFICIAL_BOXES = {
  file: 'BASE_02_TITULO_AUXILIAR_2026.pdf',
  pages: [
    { width: 841.8898, height: 595.2756 },
    { width: 841.8898, height: 595.2756 },
  ],
  anverso: {
    verticalCodeA: { x: 775.28, centerY: 493.23, boxY: 436.54, boxH: 113.39, size: 7 },
    photoBox: { x: 674.65, y: 436.54, w: 85.04, h: 113.39 },
    referenceResolutionC: { x: 70.19, y: 398, w: 701.50, h: 12, baselineY: 403.37, size: 8.5 },
    studentName: { x: 70.19, y: 314, w: 701.50, h: 26, baselineY: 321.17, size: 19 },
    titleProgram: { x: 70.19, y: 258, w: 701.50, h: 22, baselineY: 264.47, size: 16 },
    dateLine: { x: 360.00, y: 189, w: 399.70, h: 16, baselineY: 195.02, size: 12 },
  },
  reverso: {
    registerCodeBox: { x: 257.50, y: 339, w: 374.00, h: 22, baselineY: 344.27, size: 16.25 },
    ugelCodeBox: { x: 257.50, y: 261, w: 374.00, h: 22, baselineY: 266.40, size: 16.25 },
    footerCodeBox: { x: 36.00, y: 33, w: 220.00, h: 10, baselineY: 36.85, size: 5.5 },
  },
};

function stripSampleBtBlocks(streamText, markers) {
  let removed = 0;
  const out = streamText.replace(/BT\b[\s\S]*?\bET/g, (block) => {
    if (markers.some((m) => block.includes(m))) {
      removed += 1;
      return '';
    }
    return block;
  });
  return { text: out, removed };
}

function replacePageStream(pdfDoc, pageIndex, transformFn) {
  const page = pdfDoc.getPage(pageIndex);
  const rawContents = page.node.get(PDFName.of('Contents'));
  const resolved = page.node.Contents();
  const isArr = resolved instanceof PDFArray;
  const entries = isArr ? resolved.asArray() : [rawContents || resolved];
  let totalRemoved = 0;
  const nextRefs = [];

  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const streamObj = pdfDoc.context.lookup(item);
    if (!streamObj || !streamObj.contents) {
      nextRefs.push(item);
      continue;
    }
    let decoded;
    try {
      decoded = zlib.inflateSync(Buffer.from(streamObj.contents)).toString('latin1');
    } catch (_) {
      decoded = Buffer.from(streamObj.contents).toString('latin1');
    }
    const res = transformFn(decoded);
    totalRemoved += res.removed;
    if (res.removed > 0) {
      const compressed = zlib.deflateSync(Buffer.from(res.text, 'latin1'));
      const newStream = pdfDoc.context.stream(compressed, { Filter: PDFName.of('FlateDecode') });
      const newRef = pdfDoc.context.register(newStream);
      nextRefs.push(newRef);
    } else {
      nextRefs.push(item);
    }
  }

  if (totalRemoved > 0) {
    if (isArr) {
      const arr = PDFArray.withContext(pdfDoc.context);
      for (const r of nextRefs) arr.push(r);
      page.node.set(PDFName.of('Contents'), arr);
    } else {
      page.node.set(PDFName.of('Contents'), nextRefs[0]);
    }
  }
  return totalRemoved;
}

async function buildCleanBase02FromCorrectedPdf() {
  const srcPath = path.join(CLEAN_DIR, 'Plantilla_02_Titulo_Auxiliar_Tecnico_corregida.pdf');
  const outPath = path.join(OUT_PDF_DIR, 'BASE_02_TITULO_AUXILIAR_2026.pdf');
  if (!fs.existsSync(srcPath)) {
    throw new Error(`No se encontró la plantilla oficial corregida de Título: ${srcPath}`);
  }
  const bytes = fs.readFileSync(srcPath);
  const pdfDoc = await PDFDocument.load(bytes);
  if (pdfDoc.getPageCount() !== 2) {
    throw new Error(`La plantilla oficial corregida debe tener 2 páginas (tiene ${pdfDoc.getPageCount()}).`);
  }

  const p1Markers = [
    '<5b43014449474f20444520524547495354524f20494e535449545543494f4e414c5d>',
    '<522e442e204e0320323035332d323032352d445547454c2d5352>',
    '([Nombres y APELLIDOS DEL TITULADO])',
    '<415558494c494152205401434e49434f20454e205b50524f4752414d41204445204553545544494f535d>',
    '(Dado en San Miguel\\054 a los 18 d\\001as del mes de diciembre del 2026)',
  ];
  const p2Markers = [
    '000333\\055AT\\05530425346\\055CE25\\0552026',
    '000333\\055AT\\05500333\\055CE25\\0552026',
  ];

  const rem1 = replacePageStream(pdfDoc, 0, (txt) => stripSampleBtBlocks(txt, p1Markers));
  const rem2 = replacePageStream(pdfDoc, 1, (txt) => stripSampleBtBlocks(txt, p2Markers));
  if (rem1 !== 5 || rem2 !== 3) {
    throw new Error(`Limpieza inesperada en Plantilla_02_Titulo_Auxiliar_Tecnico_corregida.pdf (p1=${rem1}/5, p2=${rem2}/3).`);
  }

  const cleanBytes = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync(outPath, cleanBytes);
  return { outPath, pages: pdfDoc.getPages().map((p) => p.getSize()), removedP1: rem1, removedP2: rem2 };
}

async function main() {
  ensureDir(OUT_PDF_DIR);
  ensureDir(path.dirname(MANIFEST_OUT));

  if (process.argv.includes('--only-base02')) {
    const b02 = await buildCleanBase02FromCorrectedPdf();
    const manifest = fs.existsSync(MANIFEST_OUT) ? JSON.parse(fs.readFileSync(MANIFEST_OUT, 'utf8')) : { bases: {} };
    manifest.generatedAt = new Date().toISOString();
    manifest.bases.TMPL_21 = { ...TMPL_21_OFFICIAL_BOXES, pages: b02.pages };
    manifest.calibrations = (manifest.calibrations || []).filter((c) => !String(c.anchorText || '').includes('REPÚBLICA') && !String(c.anchorText || '').includes('CÓDIGO DE REGISTRO INSTITUCIONAL'));
    manifest.calibrations.unshift(
      await verifyExcelAnchorCalibration(b02.outPath, 0, 'REPÚBLICA DEL PERÚ', { x: 327.89, y: 454.96, w: 186.11, h: 17 }),
      await verifyExcelAnchorCalibration(b02.outPath, 1, 'CÓDIGO DE REGISTRO INSTITUCIONAL', { x: 207.71, y: 373.46, w: 257.42, h: 16.25 })
    );
    fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('[Doc2] BASE_02 oficial 2026 reconstruida:', b02.outPath, 'size:', b02.pages[0]);
    return;
  }

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  ensureDir(TMP_DIR);

  const psPath = path.join(TMP_DIR, 'export-bases.ps1');
  buildPowerShellDriver(psPath);

  console.log('[Doc2] Exportando plantillas limpias 2026 via Office COM + BASE_02 oficial PDF...');
  const out = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath], {
    env: {
      ...process.env,
      CEPRO_CLEAN_DIR: CLEAN_DIR,
      CEPRO_OUT_DIR: OUT_PDF_DIR,
      CEPRO_TMP_DIR: TMP_DIR,
    },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log(out.trim());

  const b02 = await buildCleanBase02FromCorrectedPdf();
  const raw = JSON.parse(fs.readFileSync(path.join(TMP_DIR, 'raw-meta.json'), 'utf8'));

  const readPages = async (filename) => {
    const buf = fs.readFileSync(path.join(OUT_PDF_DIR, filename));
    const pdf = await PDFDocument.load(buf);
    return pdf.getPages().map((p) => p.getSize());
  };

  const sizes01 = await readPages('BASE_01_RD_TITULO_2026.pdf');
  const sizes02 = b02.pages;
  const sizes03B = await readPages('BASE_03B_CERTIFICADO_MODULAR_2026.pdf');
  const sizes04 = await readPages('BASE_04_CERTIFICADO_EGRESADO_2026.pdf');
  const sizes05 = await readPages('BASE_05_ACTA_EVALUACION_2026.pdf');
  const sizes06 = await readPages('BASE_06_NOMINA_MATRICULA_2026.pdf');

  // Map PowerPoint P04 coordinates (PPTX top-left -> pdf-lib bottom-left)
  const p4Page = sizes04[0];
  const mapP4Box = (b) => b ? ({
    x: Number(b.x.toFixed(2)),
    y: Number((p4Page.height - (b.y + b.h)).toFixed(2)),
    w: Number(b.w.toFixed(2)),
    h: Number(b.h.toFixed(2)),
  }) : null;

  const boxes = {
    generatedAt: new Date().toISOString(),
    bases: {
      TMPL_22: { file: 'BASE_01_RD_TITULO_2026.pdf', pages: sizes01, meta: raw.p1 },
      TMPL_21: { ...TMPL_21_OFFICIAL_BOXES, pages: sizes02 },
      TMPL_20: {
        file: 'BASE_03B_CERTIFICADO_MODULAR_2026.pdf',
        pages: sizes03B,
        anverso: mapExcelTree(raw.excel.P03B_Anterior.cells, raw.excel.P03B_Anterior, sizes03B[0]),
        reverso: mapExcelTree(raw.excel.P03B_Posterior.cells, raw.excel.P03B_Posterior, sizes03B[1]),
      },
      TMPL_23: {
        file: 'BASE_04_CERTIFICADO_EGRESADO_2026.pdf',
        pages: sizes04,
        anverso: {
          otorgadoBox: mapP4Box(raw.p4.otorgadoBox),
          bodyBox: mapP4Box(raw.p4.bodyBox),
          dateBox: mapP4Box(raw.p4.dateBox),
          teacherSignBox: mapP4Box(raw.p4.teacherSignBox),
        },
      },
      TMPL_19: {
        file: 'BASE_05_ACTA_EVALUACION_2026.pdf',
        pages: sizes05,
        anverso: mapExcelTree(raw.excel.P05_Anverso.cells, raw.excel.P05_Anverso, sizes05[0]),
        reverso: mapExcelTree(raw.excel.P05_Reverso.cells, raw.excel.P05_Reverso, sizes05[1]),
      },
      TMPL_01: {
        file: 'BASE_06_NOMINA_MATRICULA_2026.pdf',
        pages: sizes06,
        anverso: mapExcelTree(raw.excel.P06_Nomina.cells, raw.excel.P06_Nomina, sizes06[0]),
      },
    },
  };

  // Empirically verify scaling against cleaned BASE_02 and REF_*.pdf text coordinates
  const calibrations = [
    await verifyExcelAnchorCalibration(b02.outPath, 0, 'REPÚBLICA DEL PERÚ', { x: 327.89, y: 454.96, w: 186.11, h: 17 }),
    await verifyExcelAnchorCalibration(b02.outPath, 1, 'CÓDIGO DE REGISTRO INSTITUCIONAL', { x: 207.71, y: 373.46, w: 257.42, h: 16.25 }),
    await verifyExcelAnchorCalibration(path.join(TMP_DIR, 'REF_03B.pdf'), 0, 'EL CENTRO DE EDUCACIÓN', boxes.bases.TMPL_20.anverso.anchorTop),
    await verifyExcelAnchorCalibration(path.join(TMP_DIR, 'REF_03B.pdf'), 1, 'CETPRO Micaela Bastidas', boxes.bases.TMPL_20.reverso.anchorBot),
    await verifyExcelAnchorCalibration(path.join(TMP_DIR, 'REF_05.pdf'), 0, 'DREP', boxes.bases.TMPL_19.anverso.anchorTop),
    await verifyExcelAnchorCalibration(path.join(TMP_DIR, 'REF_05.pdf'), 1, 'MATRICULADOS', boxes.bases.TMPL_19.reverso.anchorTop),
    await verifyExcelAnchorCalibration(path.join(TMP_DIR, 'REF_06.pdf'), 0, 'REGISTRO DE MATRÍCULA', boxes.bases.TMPL_01.anverso.anchorTop),
  ];
  boxes.calibrations = calibrations;

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(boxes, null, 2), 'utf8');
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log('[Doc2] Bases generadas:', Object.values(boxes.bases).map((b) => `${b.file} (${b.pages.length}p)`).join(', '));
  console.log('[Doc2] Calibraciones de anclas PDF:', JSON.stringify(calibrations));
}

main().catch((err) => {
  console.error('[Doc2 ERROR]', err);
  process.exit(1);
});
