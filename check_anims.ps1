$bytes = [System.IO.File]::ReadAllBytes('public\models\despina-model.glb')
$jsonLength = [System.BitConverter]::ToUInt32($bytes, 12)
$jsonBytes = $bytes[20..($jsonLength + 19)]
$jsonStr = [System.Text.Encoding]::UTF8.GetString($jsonBytes)
$jsonObj = $jsonStr | ConvertFrom-Json

Write-Host "--- DESPINA ---"
if ($jsonObj.animations) {
    foreach ($anim in $jsonObj.animations) { Write-Host ("Animation: " + $anim.name) }
} else { Write-Host "No Animations" }
if ($jsonObj.meshes) {
    foreach ($mesh in $jsonObj.meshes) {
        if ($mesh.extras -and $mesh.extras.targetNames) {
            Write-Host ("Mesh: " + $mesh.name + " Targets: " + ($mesh.extras.targetNames -join ", "))
        }
    }
}

$bytes2 = [System.IO.File]::ReadAllBytes('public\models\tony-model.glb')
$jsonLength2 = [System.BitConverter]::ToUInt32($bytes2, 12)
$jsonBytes2 = $bytes2[20..($jsonLength2 + 19)]
$jsonStr2 = [System.Text.Encoding]::UTF8.GetString($jsonBytes2)
$jsonObj2 = $jsonStr2 | ConvertFrom-Json

Write-Host "--- TONY ---"
if ($jsonObj2.animations) {
    foreach ($anim in $jsonObj2.animations) { Write-Host ("Animation: " + $anim.name) }
} else { Write-Host "No Animations" }
if ($jsonObj2.meshes) {
    foreach ($mesh in $jsonObj2.meshes) {
        if ($mesh.extras -and $mesh.extras.targetNames) {
            Write-Host ("Mesh: " + $mesh.name + " Targets: " + ($mesh.extras.targetNames -join ", "))
        }
    }
}
