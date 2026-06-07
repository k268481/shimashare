# setup-network.ps1
# 同じWi-Fiの他の端末からシマシェアにアクセスできるようにするスクリプト
# 使い方: PowerShellを管理者として実行し、このファイルをダブルクリックまたは実行する

$Port = 3000
$RuleName = "ShimaShare Dev"

# WSL2のIPアドレスを自動取得
$WslIp = (wsl hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) {
    Write-Host "ERROR: WSL2のIPアドレスを取得できませんでした。WSLが起動しているか確認してください。" -ForegroundColor Red
    pause
    exit 1
}

# WindowsのWi-Fi IPアドレスを取得
$WinIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -and $_.IPAddress -notlike "169.*" } |
    Select-Object -First 1).IPAddress

if (-not $WinIp) {
    # Wi-Fiが見つからない場合はEthernetを試す
    $WinIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.InterfaceAlias -like "*Ethernet*" -and $_.IPAddress -notlike "169.*" -and $_.IPAddress -notlike "172.*" } |
        Select-Object -First 1).IPAddress
}

Write-Host ""
Write-Host "=== シマシェア ネットワーク設定 ===" -ForegroundColor Cyan
Write-Host "WSL2 IP  : $WslIp"
Write-Host "Windows IP: $WinIp"
Write-Host ""

# 既存のポートフォワード設定を削除してから再設定
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>$null | Out-Null
netsh interface portproxy add v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$WslIp

# ファイアウォール設定（既存ルールがあれば削除して再作成）
netsh advfirewall firewall delete rule name=$RuleName 2>$null | Out-Null
netsh advfirewall firewall add rule name=$RuleName dir=in action=allow protocol=TCP localport=$Port | Out-Null

Write-Host "✅ ポートフォワード設定完了" -ForegroundColor Green
Write-Host ""
Write-Host "=== スマホ・他のPCからのアクセスURL ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "  http://$WinIp`:$Port" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "※ PCとスマホが同じWi-Fiに接続されていることを確認してください。"
Write-Host "※ WSL2を再起動した場合はこのスクリプトを再実行してください（IPが変わるため）。"
Write-Host ""
pause

# 同じWIFIにつながっているすべての端末とシマシェアをつなげるためのスクリプトです。
# 開始時(npm run devを起動した後に実行してください)：
# netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.29.22.43
# netsh advfirewall firewall add rule name="ShimaShare Dev" dir=in action=allow protocol=TCP localport=3000

# 終了時
# netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
# netsh advfirewall firewall delete rule name="ShimaShare Dev"

