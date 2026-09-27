#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 world-atlas 的 TopoJSON 解码成精简 GeoJSON，输出 data/geo.js。

关键技巧：TopoJSON 的 arcs 是「共享边」——
  · 只被一个国家引用的弧 = 海岸线（coast）
  · 被两个及以上国家引用的弧 = 国境线（border）
因此无需任何几何运算就能把两者精确分开，且不产生重复线段，体积最小。

用法：
    python3 build_geo.py                                  # 50m 高精度（默认）
    python3 build_geo.py --src data/countries-110m.json --tol 0.3 --out data/geo-110m.js
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = HERE + "/data/countries-50m.json"
OUT = HERE + "/data/geo.js"


def decode_arcs(topo):
    tr = topo.get("transform") or {}
    sx, sy = (tr.get("scale") or [1.0, 1.0])
    tx, ty = (tr.get("translate") or [0.0, 0.0])
    out = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for d in arc:
            x += d[0]
            y += d[1]
            if tr:
                pts.append([x * sx + tx, y * sy + ty])
            else:
                pts.append([x, y])
        out.append(pts)
    return out


def ring_refs(geom):
    """取出一个 geometry 引用的所有 arc 索引（展开嵌套）"""
    refs = []
    t = geom.get("type")
    if t == "Polygon":
        for ring in geom["arcs"]:
            refs.extend(ring)
    elif t == "MultiPolygon":
        for poly in geom["arcs"]:
            for ring in poly:
                refs.extend(ring)
    return refs


def simplify(pts, tol):
    """道格拉斯-普克抽稀（迭代实现，避免深递归）"""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 <= i0 + 1:
            continue
        ax, ay = pts[i0]
        bx, by = pts[i1]
        ddx, ddy = bx - ax, by - ay
        norm = math.hypot(ddx, ddy) or 1e-9
        dmax, imax = -1.0, i0
        for i in range(i0 + 1, i1):
            x0, y0 = pts[i]
            d = abs(ddy * x0 - ddx * y0 + bx * ay - by * ax) / norm
            if d > dmax:
                dmax, imax = d, i
        if dmax > tol:
            keep[imax] = True
            stack.append((i0, imax))
            stack.append((imax, i1))
    return [p for p, k in zip(pts, keep) if k]


def main():
    args = sys.argv[1:]
    src, tol, out = SRC, 0.12, OUT
    for i, a in enumerate(args):
        if a == "--src" and i + 1 < len(args):
            src = args[i + 1]
        elif a == "--tol" and i + 1 < len(args):
            tol = float(args[i + 1])
        elif a == "--out" and i + 1 < len(args):
            out = args[i + 1]

    if not os.path.exists(src):
        print("缺源文件：", src)
        return

    topo = json.load(open(src, encoding="utf-8"))
    geoms = topo["objects"]["countries"]["geometries"]

    # 1) 统计每个 arc 被多少个国家引用
    count = {}
    for g in geoms:
        seen = set()
        for idx in ring_refs(g):
            a = idx if idx >= 0 else ~idx   # TopoJSON 负值表示反向引用
            if a not in seen:               # 同一国家内重复引用不重复计数
                seen.add(a)
                count[a] = count.get(a, 0) + 1

    arcs = decode_arcs(topo)

    # 2) 按引用次数分流：1 = 海岸线，>=2 = 国境线
    coast, border, npts = [], [], 0
    for a, pts in enumerate(arcs):
        if not pts:
            continue
        sp = simplify(pts, tol)
        if len(sp) < 2:
            continue
        r = [[round(p[0], 3), round(p[1], 3)] for p in sp]
        npts += len(r)
        (coast if count.get(a, 0) <= 1 else border).append(r)

    js = ("// 由 build_geo.py 生成，勿手改\n"
          "// coast=海岸线（仅一国引用）  border=国境线（两国及以上共享，由 TopoJSON 拓扑分离）\n"
          "window.WORLD_GEO = " + json.dumps({"coast": coast, "border": border},
                                             separators=(",", ":")) + ";\n")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(js)
    print("✓ %s -> %s" % (src.split('/')[-1], out))
    print("  海岸线 %d 段 / 国境线 %d 段 / 总点 %d / %.0f KB"
          % (len(coast), len(border), npts, len(js) / 1024))


if __name__ == "__main__":
    main()
