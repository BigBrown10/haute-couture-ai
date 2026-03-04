$bytes = [System.IO.File]::ReadAllBytes("c:\Users\edogu\Downloads\prograde-quasar\prograde-quasar\public\models\tony-model.glb")
$jsonLength = [System.BitConverter]::ToUInt32($bytes, 12)
$jsonBytes = $bytes[20..($jsonLength + 19)]
$jsonStr = [System.Text.Encoding]::UTF8.GetString($jsonBytes)
$jsonObj = $jsonStr | ConvertFrom-Json

Write-Host "=== NODES ==="
foreach ($node in $jsonObj.nodes) {
    if ($node.name) {
        Write-Host $node.name
    }
}

Write-Host "=== MESHES ==="
foreach ($mesh in $jsonObj.meshes) {
    Write-Host ("Mesh: " + $mesh.name)
    if ($mesh.extras -and $mesh.extras.targetNames) {
        Write-Host ("Targets: " + ($mesh.extras.targetNames -join ", "))
    }
}
