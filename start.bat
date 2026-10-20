@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title 命途回廊 · COINFALL

where node >nul 2>nul
if %errorlevel%==0 (
  echo 使用 Node.js 启动本地服务器...
  node server.mjs
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo 未找到 Node.js，改用 Python 启动...
  echo 本机访问：http://127.0.0.1:8787/
  python -m http.server 8787 --bind 0.0.0.0
  goto :end
)

echo 没有找到 Node.js 或 Python。
echo 你仍然可以直接双击 index.html 进行单机游戏；
echo 局域网联机建议安装 Node.js 后重新运行本脚本。
pause

:end
endlocal