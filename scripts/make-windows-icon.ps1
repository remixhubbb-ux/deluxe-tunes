param(
  [string]$Source = "public/logo.png",
  [string]$Destination = "public/logo.ico"
)

Add-Type -AssemblyName System.Drawing

$resolvedSource = (Resolve-Path $Source).Path
$sourceImage = [System.Drawing.Image]::FromFile($resolvedSource)
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = @()

try {
  foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)

      $stream = New-Object System.IO.MemoryStream
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      $images += ,@{ Size = $size; Bytes = $stream.ToArray() }
      $stream.Dispose()
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}

$output = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($output)
try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]$images.Count)

  $offset = 6 + (16 * $images.Count)
  foreach ($image in $images) {
    $dimension = if ($image.Size -eq 256) { [Byte]0 } else { [Byte]$image.Size }
    $writer.Write($dimension)
    $writer.Write($dimension)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$image.Bytes.Length)
    $writer.Write([UInt32]$offset)
    $offset += $image.Bytes.Length
  }

  foreach ($image in $images) {
    $writer.Write($image.Bytes)
  }
} finally {
  $writer.Dispose()
}

[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) $Destination), $output.ToArray())
$output.Dispose()
Write-Output "Wrote multi-size Windows icon ($($images.Count) resolutions) to $Destination"
