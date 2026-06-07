#!/bin/bash
# npm run dev 起動時にアクセスURLを表示するスクリプト

WSL_IP=$(hostname -I | awk '{print $1}')
WIN_IP=$(powershell.exe /c "ipconfig" 2>/dev/null \
  | iconv -f cp932 -t utf-8 2>/dev/null \
  | grep -A8 "Wi-Fi:" \
  | grep "IPv4" \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
  | head -1)

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│         シマシェア 起動中                   │"
echo "├─────────────────────────────────────────────┤"
echo "│ このPC   : http://localhost:3000             │"
if [ -n "$WIN_IP" ]; then
  printf "│ 同じWiFi : http://%-26s│\n" "$WIN_IP:3000"
else
  printf "│ 同じWiFi : http://%-26s│\n" "$WSL_IP:3000 (WSL2 IP)"
fi
echo "└─────────────────────────────────────────────┘"
echo ""
echo "▶ スマホから接続する場合:"
echo "  1. 初回のみ: scripts/setup-network.ps1 を管理者PowerShellで実行"
if [ -n "$WIN_IP" ]; then
  echo "  2. スマホのブラウザで http://$WIN_IP:3000 にアクセス"
fi
echo ""
