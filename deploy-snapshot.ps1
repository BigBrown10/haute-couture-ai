# Deploy Snapshot on Ports 3100 (Frontend) and 3101 (Backend)

# Ensure Environment Variables for Snapshot
$env:PORT = "3101"
$env:NEXT_PUBLIC_BACKEND_URL = "http://localhost:3101"
$env:NODE_ENV = "production"

Write-Host ">>> Starting Backend on Port 3101..." -ForegroundColor Green
Start-Process "npx" -ArgumentList "tsx server/server.ts" -NoNewWindow

Write-Host ">>> Starting Frontend on Port 3100..." -ForegroundColor Green
Start-Process "next" -ArgumentList "dev --port 3100" -NoNewWindow

Write-Host ">>> Snapshot deployment initiated." -ForegroundColor Green
Write-Host ">>> Frontend: http://localhost:3100" -ForegroundColor Cyan
Write-Host ">>> Backend:  http://localhost:3101" -ForegroundColor Cyan
