#!/bin/bash
# AURA V1 - iOS IPA 构建脚本 (需在 macOS 上运行)
# 前置条件: Xcode 14+, CocoaPods, Node.js 18+

set -e

echo "=== AURA V1 iOS 构建 ==="

# 1. 安装依赖
echo "[1/5] 安装 npm 依赖..."
npm install

# 2. 同步 iOS
echo "[2/5] 同步 iOS 工程..."
npx cap sync ios

# 3. 安装 CocoaPods
echo "[3/5] 安装 Pods..."
cd ios/App
pod install
cd ../..

# 4. 构建归档
echo "[4/5] 构建归档..."
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphoneos \
  -archivePath $PWD/build/App.xcarchive \
  clean archive \
  CODE_SIGNING_ALLOWED=NO

# 5. 导出 IPA
echo "[5/5] 导出 IPA..."
xcodebuild -exportArchive \
  -archivePath $PWD/build/App.xcarchive \
  -exportPath $PWD/build/ipa \
  -exportOptionsPlist ../../.github/export-options.plist

echo ""
echo "✅ 构建完成！"
echo "IPA 位置: ios/App/build/ipa/"
echo ""
echo "提示: 使用免费 Apple ID 签名的 IPA 有效期 7 天"
echo "如需正式发布，请使用 Apple Developer 账号签名"
