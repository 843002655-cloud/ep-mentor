# Save clipboard image to a known folder
# Usage: Right-click this file -> Run with PowerShell, or set up a hotkey

$saveDir = "$env:USERPROFILE\Desktop\clipboard-images"
if (-not (Test-Path $saveDir)) {
    New-Item -ItemType Directory -Force $saveDir | Out-Null
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$clip = [System.Windows.Forms.Clipboard]::GetDataObject()

if ($clip.GetDataPresent([System.Windows.Forms.DataFormats]::Bitmap)) {
    $img = $clip.GetData([System.Windows.Forms.DataFormats]::Bitmap)
    $filename = "clipboard-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png"
    $filepath = Join-Path $saveDir $filename
    $img.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved: $filepath"
    Set-Clipboard -Value $filepath
    Write-Host "Path copied to clipboard - paste it to Claude"
} elseif ($clip.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
    $files = $clip.GetData([System.Windows.Forms.DataFormats]::FileDrop)
    foreach ($f in $files) {
        if ($f -match '\.(png|jpg|jpeg|gif|bmp|webp)$') {
            $filename = "clipboard-" + (Get-Date -Format "yyyyMMdd-HHmmss") + [System.IO.Path]::GetExtension($f)
            $filepath = Join-Path $saveDir $filename
            Copy-Item $f $filepath
            Write-Host "Saved: $filepath"
            Set-Clipboard -Value $filepath
            Write-Host "Path copied to clipboard - paste it to Claude"
        }
    }
} else {
    Write-Host "No image found in clipboard"
}
