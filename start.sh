#!/bin/bash


# 关闭可能正在运行的 Chrome 调试实例
pkill -f "remote-debugging-port=9222" 2>/dev/null || true
sleep 1

# 启动新的 Chrome 调试实例
echo "启动新的 Chrome 实例..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"

# 等待 Chrome 启动
echo "等待 Chrome 启动..."
sleep 5

# 运行爬虫脚本
echo "运行爬虫脚本..."
node pa-chong.js

# 清理：关闭 Chrome
echo "关闭 Chrome..."
pkill -f "remote-debugging-port=9222"

echo "完成！"
