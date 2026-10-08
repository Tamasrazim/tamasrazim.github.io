param(
  [Parameter(Mandatory=$true)]
  [string]$OutDir
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$palette = @(
  @(20,34,44), @(28,46,58), @(58,62,70), @(96,55,38),
  @(25,78,72), @(55,42,92), @(72,44,48), @(38,72,92),
  @(88,76,42), @(74,74,80)
)

for($i=1;$i -le 28;$i++){
  $bmp = New-Object System.Drawing.Bitmap 500,500,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $p = $palette[($i-1)%$palette.Count]
  $base = [System.Drawing.Color]::FromArgb(255,$p[0],$p[1],$p[2])
  $g.Clear($base)

  $accent = [System.Drawing.Color]::FromArgb(255,
      [Math]::Min(255,$p[0]+70),
      [Math]::Min(255,$p[1]+85),
      [Math]::Min(255,$p[2]+95))
  $hot = [System.Drawing.Color]::FromArgb(255,
      [Math]::Min(255,$p[0]+105),
      [Math]::Min(255,$p[1]+115),
      [Math]::Min(255,$p[2]+125))

  $pen = New-Object System.Drawing.Pen($accent,2)
  $thin = New-Object System.Drawing.Pen($accent,1)
  $hotPen = New-Object System.Drawing.Pen($hot,3)

  $mode = ($i-1) % 8
  switch($mode){
    0 {
      for($x=0;$x -le 500;$x+=50){$g.DrawLine($thin,$x,0,$x,500)}
      for($y=0;$y -le 500;$y+=50){$g.DrawLine($thin,0,$y,500,$y)}
      for($x=0;$x -le 500;$x+=100){$g.DrawLine($hotPen,$x,0,$x,500)}
    }
    1 {
      for($x=-500;$x -lt 1000;$x+=60){$g.DrawLine($pen,$x,0,$x+500,500)}
      for($x=-500;$x -lt 1000;$x+=180){$g.DrawLine($hotPen,$x,0,$x+500,500)}
    }
    2 {
      for($y=25;$y -lt 500;$y+=35){
        $g.DrawLine($thin,0,$y,500,$y)
        if(($y/35)%3 -eq 0){$g.DrawLine($hotPen,0,$y,500,$y)}
      }
    }
    3 {
      for($x=25;$x -lt 500;$x+=80){
        for($y=25;$y -lt 500;$y+=80){
          $g.DrawRectangle($pen,$x,$y,30,30)
          $g.DrawEllipse($thin,$x+6,$y+6,18,18)
        }
      }
    }
    4 {
      for($x=0;$x -lt 500;$x+=50){
        for($y=0;$y -lt 500;$y+=50){
          if((($x/50)+($y/50))%2 -eq 0){$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35,$accent))),$x,$y,50,50)}
        }
      }
      for($d=0;$d -lt 700;$d+=70){$g.DrawLine($hotPen,0,$d,500,$d-500)}
    }
    5 {
      for($x=-500;$x -lt 1000;$x+=50){$g.DrawLine($hotPen,$x,0,$x+500,500)}
      for($x=-450;$x -lt 950;$x+=100){$g.DrawLine($thin,$x,0,$x+500,500)}
    }
    6 {
      for($r=30;$r -lt 300;$r+=45){$g.DrawEllipse($pen,250-$r,250-$r,2*$r,2*$r)}
      for($a=0;$a -lt 360;$a+=30){$rad=$a*[Math]::PI/180;$g.DrawLine($thin,250,250,250+[Math]::Cos($rad)*250,250+[Math]::Sin($rad)*250)}
      $g.DrawEllipse($hotPen,175,175,150,150)
    }
    7 {
      for($x=20;$x -lt 500;$x+=100){$g.DrawLine($hotPen,$x,0,$x,500)}
      for($y=20;$y -lt 500;$y+=100){$g.DrawLine($thin,0,$y,500,$y)}
      for($x=50;$x -lt 500;$x+=100){for($y=50;$y -lt 500;$y+=100){$g.DrawEllipse($pen,$x-10,$y-10,20,20)}}
    }
  }

  $label = "NV-$($i.ToString('00'))"
  $font = New-Object System.Drawing.Font("Arial",12,[System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush($hot)
  $g.DrawString($label,$font,$brush,12,12)

  $path = Join-Path $OutDir ("vault_{0:D2}.bmp" -f $i)
  $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Bmp)

  $brush.Dispose();$font.Dispose();$hotPen.Dispose();$thin.Dispose();$pen.Dispose();$g.Dispose();$bmp.Dispose()
}

Write-Host "NEON VAULT: generated 28 procedural 500x500 BMP materials in $OutDir"
