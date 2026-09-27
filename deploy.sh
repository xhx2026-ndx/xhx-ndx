#!/bin/bash
# ============================================================
# 一键推送到 GitHub（用于摆脱 *.app.workbuddy.host 域名）
# ------------------------------------------------------------
# 前置条件（需要你手动做一次，我没法替你完成授权）：
#   1. 有 GitHub 账号
#   2. 在 https://github.com/new 创建一个空仓库，Repository name 填：xhx-ndx
#      （不要勾选 README / .gitignore / license，保持完全空白）
#   3. 本机已登录 GitHub：
#        命令行登录： gh auth login        （推荐）
#        或用 SSH：    ssh -T git@github.com  能通即可
#
# 用法：
#   ./deploy.sh <你的GitHub用户名>
#   例： ./deploy.sh xhx-s
#
# 完成后：
#   仓库 Settings → Pages → Source 选 "Deploy from a branch"
#                         → Branch 选 main，目录选 / (root) → Save
#   大约 1 分钟后访问： https://<用户名>.github.io/xhx-ndx/
# ============================================================
set -e

USER="$1"
REPO="${2:-xhx-ndx}"

if [ -z "$USER" ]; then
  echo "用法： ./deploy.sh <GitHub用户名> [仓库名，默认 xhx-ndx]"
  exit 1
fi

cd "$(dirname "$0")"

# 本地 git 身份（仅本仓库生效，不改你的全局配置）
git config user.name  >/dev/null 2>&1 || git config user.name  "XHX"
git config user.email >/dev/null 2>&1 || git config user.email "xhx@example.com"

if [ ! -d .git ]; then
  git init -b main
fi

git add -A
git commit -m "feat: 美股投资跟踪台 v3（双主题 + 今日快照 + 3D 地球）" || echo "没有需要提交的改动"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://github.com/${USER}/${REPO}.git"
else
  git remote add origin "https://github.com/${USER}/${REPO}.git"
fi

echo ""
echo "即将推送到 https://github.com/${USER}/${REPO}.git"
echo "若提示输入密码，请用 GitHub Personal Access Token（不是登录密码）。"
echo ""
git push -u origin main

echo ""
echo "✓ 推送完成。下一步（只需做一次）："
echo "  打开 https://github.com/${USER}/${REPO}/settings/pages"
echo "  Source → Deploy from a branch → Branch: main → Folder: / (root) → Save"
echo ""
echo "  约 1 分钟后访问： https://${USER}.github.io/${REPO}/"
echo ""
