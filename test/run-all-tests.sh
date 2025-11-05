#!/bin/bash

echo "=========================================="
echo "运行所有测试"
echo "=========================================="
echo ""

PASSED=0
FAILED=0
TOTAL=0

# 遍历所有测试文件
for file in test/adidas/*.js; do
    TOTAL=$((TOTAL + 1))
    echo "[$TOTAL] 运行测试: $file"
    echo "----------------------------------------"

    # 运行测试并捕获退出码
    node "$file" 2>&1
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ 测试通过"
        PASSED=$((PASSED + 1))
    else
        echo "❌ 测试失败 (退出码: $EXIT_CODE)"
        FAILED=$((FAILED + 1))
    fi

    echo ""
done

echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $TOTAL"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 所有测试通过！"
    exit 0
else
    echo "⚠️  有 $FAILED 个测试失败"
    exit 1
fi
