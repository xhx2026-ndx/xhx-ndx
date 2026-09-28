#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
push_contents.py — 用 GitHub Contents API 直推文件到 GitHub Pages 仓库。

为什么存在：
    原方案依赖 `git push`，而 git push 要走本机代理（127.0.0.1:62832），
    代理一挂就静默失败，页面停在旧数据。实测 api.github.com 直连始终可达（200），
    因此改用 Contents API：不依赖代理、不依赖本机 git push，即使电脑休眠/代理挂了也能推。

用法：
    # 推送指定文件（推荐，自动化里用这个）
    python3 push_contents.py -m "data: refresh 2026-09-29" data/market.js

    # 不传文件则自动检测 git 改动（排除大体积 geo/json 资源）
    python3 push_contents.py -m "content: 更新判断"

    # 自检：创建一个临时文件并立即删除，验证整套机制可用（不残留）
    python3 push_contents.py --selftest

机制：
    1. 从 `git remote get-url origin` 提取 token / owner / repo
       （token 已明文存在于 .git/config，这里复用，不新增密钥存储）
    2. 对每个文件：base64 -> GET 现有 sha -> PUT 更新（无 sha 则新建）
    3. 推送成功后本地 git add + commit，保持本地状态一致
"""
import os
import re
import sys
import json
import base64
import urllib.request
import urllib.error
import urllib.parse
import subprocess

API = "https://api.github.com"
EXCLUDE = ("data/countries-", "data/geo.js")  # 大体量静态资源，不走 API 推送
MAX_BYTES = 5 * 1024 * 1024  # 单文件上限 5MB（Contents API 推荐 <1MB）


def repo_info():
    try:
        url = subprocess.check_output(
            ["git", "remote", "get-url", "origin"], text=True
        ).strip()
    except Exception:
        url = ""
    m = re.search(r"github\.com[/:]([^/]+)/([^/.]+)(?:\.git)?", url)
    owner, repo = (m.group(1), m.group(2)) if m else ("", "")
    tok = os.environ.get("GITHUB_TOKEN")
    if not tok:
        mt = re.search(r"(ghp_[A-Za-z0-9]+)", url)
        tok = mt.group(1) if mt else ""
    return owner, repo, tok


def api(req, token):
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        try:
            j = json.loads(body)
            msg = j.get("message", body)
        except Exception:
            msg = body
        return e.code, {"message": msg}


def changed_files():
    out = subprocess.check_output(["git", "status", "--porcelain"], text=True)
    files = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        f = line[3:].strip()
        if any(f.startswith(e) or f == e for e in EXCLUDE):
            continue
        if os.path.isfile(f):
            files.append(f)
    return files


def push_file(path, token, owner, repo, message):
    if not os.path.isfile(path):
        print(f"  [skip] 文件不存在: {path}")
        return False
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        print(f"  [skip] 文件过大({size}字节>5MB): {path}")
        return False
    with open(path, "rb") as fh:
        content = base64.b64encode(fh.read()).decode("ascii").replace("\n", "")
    api_path = urllib.parse.quote(path)
    url = f"{API}/repos/{owner}/{repo}/contents/{api_path}"
    # 取现有 sha（不存在则为新建）
    sha = None
    st, data = api(urllib.request.Request(url), token)
    if st == 200:
        sha = data.get("sha")
    elif st == 404:
        sha = None
    else:
        print(f"  [error] 获取 {path} 失败: HTTP {st} {data.get('message')}")
        return False
    body = {"message": message, "content": content}
    if sha:
        body["sha"] = sha
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="PUT",
    )
    st, data = api(req, token)
    if st in (200, 201):
        print(f"  [ok] 已推送 {path} (sha={data.get('commit', {}).get('sha', '')[:8]})")
        return True
    # 409 = 并发/sha 过期，重试一次
    if st == 409:
        st2, d2 = api(urllib.request.Request(url), token)
        sha2 = d2.get("sha") if st2 == 200 else None
        body["sha"] = sha2
        req2 = urllib.request.Request(
            url, data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"}, method="PUT",
        )
        st3, data3 = api(req2, token)
        if st3 in (200, 201):
            print(f"  [ok] 已推送(重试) {path}")
            return True
        print(f"  [error] 推送 {path} 失败(409重试后仍失败): {data3.get('message')}")
        return False
    print(f"  [error] 推送 {path} 失败: HTTP {st} {data.get('message')}")
    return False


def local_commit(files, message):
    try:
        subprocess.run(["git", "add", *files], check=True)
        subprocess.run(["git", "commit", "-m", message], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass  # 本地提交失败不影响远端已推送结果


def selftest(owner, repo, token):
    import tempfile
    path = ".wb_push_test.txt"
    with open(path, "w", encoding="utf-8") as f:
        f.write("push_contents.py selftest\n")
    ok = push_file(path, token, owner, repo, "selftest: create")
    if ok:
        # 删除临时文件（DELETE 接口）
        url = f"{API}/repos/{owner}/{repo}/contents/{urllib.parse.quote(path)}"
        st, data = api(urllib.request.Request(url), token)
        sha = data.get("sha") if st == 200 else None
        if sha:
            del_body = json.dumps({"message": "selftest: delete", "sha": sha}).encode()
            req = urllib.request.Request(
                url, data=del_body,
                headers={"Content-Type": "application/json"}, method="DELETE")
            st2, _ = api(req, token)
            print(f"  [ok] 自检临时文件已删除 (HTTP {st2})" if st2 in (200, 204)
                  else f"  [warn] 删除临时文件返回 HTTP {st2}（可能需手动删 {path}）")
    try:
        os.remove(path)
    except Exception:
        pass
    print("自检完成。" if ok else "自检失败。")


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("files", nargs="*", help="要推送的文件（相对仓库根目录）")
    p.add_argument("-m", "--message", default="auto: update via contents api")
    p.add_argument("--selftest", action="store_true")
    args = p.parse_args()

    owner, repo, token = repo_info()
    if not (owner and repo and token):
        print("[fatal] 无法从 git remote 解析 owner/repo/token，请检查 .git/config")
        sys.exit(1)
    print(f"目标仓库: {owner}/{repo}")

    if args.selftest:
        selftest(owner, repo, token)
        return

    files = args.files or changed_files()
    if not files:
        print("没有检测到需要推送的文件。")
        return
    print(f"待推送 {len(files)} 个文件: {files}")
    ok = 0
    for f in files:
        if push_file(f, token, owner, repo, args.message):
            ok += 1
    local_commit(files, args.message)
    print(f"完成：成功 {ok}/{len(files)}")
    if ok < len(files):
        sys.exit(2)


if __name__ == "__main__":
    main()
