#!/usr/bin/env sh
# 命途回廊 · COINFALL — macOS / Linux 启动脚本
set -e
cd "$(dirname "$0")"

if command -v node >/dev/null 2>&1; then
  exec node server.mjs
elif command -v python3 >/dev/null 2>&1; then
  echo "未找到 Node.js，改用 Python 启动…"
  exec python3 -m http.server 8787 --bind 0.0.0.0
else
  echo "请安装 Node.js 或 Python 3 后重试。"
  exit 1
fi