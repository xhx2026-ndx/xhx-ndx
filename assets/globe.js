/* ============================================================
   3D 地球模块 v2
   ------------------------------------------------------------
   · Three.js 渲染；海岸线与国境线分开绘制（数据由 build_geo.py 用
     TopoJSON 拓扑自动分离：仅一国引用的弧=海岸线，共享弧=国境线）
   · 五大洲中文标注（DOM 覆盖层，按球面投影实时定位，背面自动隐藏）
   · 拖拽旋转 / 滚轮与双指缩放 / 点击标记查看事件
   · 抗锯齿全开 + 高分段球体，放大后不糊
   · WebGL 或 three.js 不可用时降级为 2D canvas 地图
   ============================================================ */
(function () {
  'use strict';

  var TYPE_COLOR = {
    conflict: 0xE08A8A,
    talk: 0x8FB4D8,
    policy: 0xBBA9D4,
    macro: 0xDCA96B
  };
  var TYPE_HEX = {
    conflict: '#E08A8A', talk: '#8FB4D8', policy: '#BBA9D4', macro: '#DCA96B'
  };

  /* 五大洲标注点（经度, 纬度） */
  var CONTINENTS = [
    { zh: '亚洲', en: 'ASIA', lon: 90, lat: 42 },
    { zh: '欧洲', en: 'EUROPE', lon: 16, lat: 51 },
    { zh: '非洲', en: 'AFRICA', lon: 21, lat: 4 },
    { zh: '北美洲', en: 'N. AMERICA', lon: -100, lat: 45 },
    { zh: '南美洲', en: 'S. AMERICA', lon: -60, lat: -14 },
    { zh: '大洋洲', en: 'OCEANIA', lon: 134, lat: -25 }
  ];

  function latLonToVec3(lat, lon, r) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return {
      x: -r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta)
    };
  }

  function Globe(box, opts) {
    this.box = box;
    this.opts = opts || {};
    this.events = [];
    this.markers = [];
    this.ok = false;
  }

  Globe.prototype.init = function (events) {
    this.events = events || [];
    if (typeof THREE === 'undefined' || !this._webglOk()) return this.fallback();
    try { this._build(); } catch (e) {
      console.warn('globe build fail', e);
      return this.fallback();
    }
    return true;
  };

  Globe.prototype._webglOk = function () {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  };

  /* ---------------- 3D ---------------- */
  Globe.prototype._build = function () {
    var self = this;
    var box = this.box;
    var w = box.clientWidth || 660, h = box.clientHeight || 470;
    var mobile = w < 560;
    var G = window.WORLD_GEO || {};

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
    camera.position.set(0, 0, 3.3);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    box.appendChild(renderer.domElement);

    var group = new THREE.Group();
    scene.add(group);
    var R = 1;

    /* --- 海洋球体：高分段，放大后边缘平滑 --- */
    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(R, mobile ? 96 : 144, mobile ? 64 : 96),
      new THREE.MeshPhongMaterial({
        color: 0x243349, emissive: 0x111C2B,
        specular: 0x35506E, shininess: 18, transparent: true, opacity: 0.97
      })
    );
    group.add(sphere);

    /* --- 大气光晕（两层，边缘更柔） --- */
    [[1.14, 0.10], [1.32, 0.05]].forEach(function (p) {
      var halo = new THREE.Mesh(
        new THREE.SphereGeometry(R * p[0], 48, 32),
        new THREE.MeshBasicMaterial({
          color: 0x7FA8D8, transparent: true, opacity: p[1],
          side: THREE.BackSide, depthWrite: false
        })
      );
      group.add(halo);
    });

    /* --- 经纬网（细、淡） --- */
    var gridPts = [];
    var GR = R * 1.0015;
    for (var lat = -60; lat <= 60; lat += 30) {
      for (var lon = -180; lon < 180; lon += 3) {
        var a1 = latLonToVec3(lat, lon, GR), b1 = latLonToVec3(lat, lon + 3, GR);
        gridPts.push(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z);
      }
    }
    for (var ln = -180; ln < 180; ln += 30) {
      for (var la = -87; la < 87; la += 3) {
        var a2 = latLonToVec3(la, ln, GR), b2 = latLonToVec3(la + 3, ln, GR);
        gridPts.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z);
      }
    }
    var gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    group.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({
      color: 0x4E7196, transparent: true, opacity: 0.22
    })));

    /* --- 国境线（先画，压在下面，颜色更暗更细） --- */
    function segGeometry(list, radius) {
      var pts = [];
      for (var i = 0; i < list.length; i++) {
        var ring = list[i];
        for (var j = 0; j < ring.length - 1; j++) {
          var p1 = latLonToVec3(ring[j][1], ring[j][0], radius);
          var p2 = latLonToVec3(ring[j + 1][1], ring[j + 1][0], radius);
          pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      return g;
    }
    if (G.border && G.border.length) {
      group.add(new THREE.LineSegments(
        segGeometry(G.border, R * 1.0035),
        new THREE.LineBasicMaterial({ color: 0x63809F, transparent: true, opacity: 0.5 })
      ));
    }
    /* --- 海岸线（后画，更亮更实） --- */
    if (G.coast && G.coast.length) {
      group.add(new THREE.LineSegments(
        segGeometry(G.coast, R * 1.004),
        new THREE.LineBasicMaterial({ color: 0xA8D4F5, transparent: true, opacity: 0.92 })
      ));
    }

    /* --- 星空背景 --- */
    var starPts = [];
    for (var s = 0; s < 420; s++) {
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      var rr = 14 + Math.random() * 8, sq = Math.sqrt(1 - u * u);
      starPts.push(rr * sq * Math.cos(th), rr * u, rr * sq * Math.sin(th));
    }
    var sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xBFD4EC, size: 0.09, transparent: true, opacity: 0.5, sizeAttenuation: true
    })));

    /* --- 光照 --- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    var key = new THREE.DirectionalLight(0xDCE9FA, 0.95);
    key.position.set(2.4, 1.8, 2.6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x6F94C4, 0.4);
    rim.position.set(-2.2, -1.0, -1.8);
    scene.add(rim);

    /* --- 事件标记 --- */
    var markerGroup = new THREE.Group();
    group.add(markerGroup);
    this.markers = [];
    this.events.forEach(function (ev) {
      var pos = latLonToVec3(ev.lat, ev.lon, R * 1.014);
      var color = TYPE_COLOR[ev.type] || 0xffffff;
      var size = 0.016 + (ev.level || 3) * 0.0042;

      var dot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshBasicMaterial({ color: color })
      );
      dot.position.set(pos.x, pos.y, pos.z);

      var halo = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.9, 14, 10),
        new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.28, depthWrite: false })
      );
      halo.position.copy(dot.position);

      var ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.9, size * 2.6, 24),
        new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 0.5,
          side: THREE.DoubleSide, depthWrite: false
        })
      );
      ringMesh.position.copy(dot.position);
      ringMesh.lookAt(0, 0, 0);

      var hit = new THREE.Mesh(
        new THREE.SphereGeometry(size * 2.8, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.copy(dot.position);
      hit.userData.eventId = ev.id;

      markerGroup.add(dot); markerGroup.add(halo);
      markerGroup.add(ringMesh); markerGroup.add(hit);
      self.markers.push({ ev: ev, dot: dot, ring: ringMesh, hit: hit, phase: Math.random() * 6.28 });
    });

    /* --- 五大洲标注（DOM 覆盖层） --- */
    var layer = document.getElementById('continent-layer') || box;
    var labels = CONTINENTS.map(function (c) {
      var el = document.createElement('div');
      el.className = 'continent';
      el.innerHTML = '<span>' + c.zh + '</span><span class="en">' + c.en + '</span>';
      layer.appendChild(el);
      var v = latLonToVec3(c.lat, c.lon, R * 1.055);
      return { el: el, v: new THREE.Vector3(v.x, v.y, v.z) };
    });

    /* --- 交互 --- */
    var rotY = -1.9, rotX = 0.26, dist = 3.3;
    var dragging = false, lastX = 0, lastY = 0, moved = 0, autoSpin = true;

    function applyCamera() {
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      group.rotation.y = rotY;
      group.rotation.x = rotX;
      group.updateMatrixWorld(true);
    }
    applyCamera();

    var el = renderer.domElement;
    el.style.cursor = 'grab';

    function down(x, y) { dragging = true; moved = 0; lastX = x; lastY = y; el.style.cursor = 'grabbing'; }
    function move(x, y) {
      if (!dragging) return;
      var dx = x - lastX, dy = y - lastY;
      lastX = x; lastY = y; moved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.006;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.005));
      autoSpin = false;
      applyCamera();
    }
    function up() { dragging = false; el.style.cursor = 'grab'; }

    el.addEventListener('mousedown', function (e) { down(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', up);
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      dist = Math.max(1.5, Math.min(6.5, dist + (e.deltaY > 0 ? 0.14 : -0.14)));
      applyCamera();
    }, { passive: false });

    var pinch = 0;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        dragging = false;
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2 && pinch) {
        var d2 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY);
        dist = Math.max(1.5, Math.min(6.5, dist * (pinch / d2)));
        pinch = d2; applyCamera();
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', function () { up(); pinch = 0; });

    var ray = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    function pick(cx, cy) {
      var rect = el.getBoundingClientRect();
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      var hits = ray.intersectObjects(self.markers.map(function (m) { return m.hit; }), false);
      return hits.length ? hits[0].object.userData.eventId : null;
    }
    el.addEventListener('click', function (e) {
      if (moved > 6) return;
      var id = pick(e.clientX, e.clientY);
      if (id && self.opts.onPick) self.opts.onPick(id);
    });
    el.addEventListener('touchend', function (e) {
      if (moved > 8 || !e.changedTouches.length) return;
      var id = pick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (id && self.opts.onPick) self.opts.onPick(id);
    });

    /* --- 动画 ---
       不可见时必须 cancelAnimationFrame 停帧，而不是只 return 跳过绘制：
       原实现每帧都重新 requestAnimationFrame，用户滚走地球后 rAF 仍以 60fps
       空转，在手机上持续耗电。 */
    var visible = true, t = 0, rafId = null, obs = null;
    var tmp = new THREE.Vector3();
    function loop() {
      if (!visible) { rafId = null; return; }   // 停帧；被 IO 唤醒时再重启
      rafId = requestAnimationFrame(loop);
      t += 0.016;
      if (autoSpin) { rotY += 0.0011; group.rotation.y = rotY; group.updateMatrixWorld(true); }

      self.markers.forEach(function (m) {
        var s = 1 + Math.sin(t * 2.0 + m.phase) * 0.26;
        m.ring.scale.set(s, s, 1);
        m.ring.material.opacity = 0.16 + 0.32 * (0.5 + 0.5 * Math.sin(t * 2.0 + m.phase));
      });

      /* 洲际标注：投影到屏幕，背面淡出 */
      var cw = box.clientWidth || w, ch = box.clientHeight || h;
      labels.forEach(function (L) {
        tmp.copy(L.v).applyMatrix4(group.matrixWorld);
        var world = tmp.clone();
        var facing = world.clone().normalize()
          .dot(camera.position.clone().sub(world).normalize());
        var p = world.clone().project(camera);
        var sx = (p.x * 0.5 + 0.5) * cw, sy = (-p.y * 0.5 + 0.5) * ch;
        if (facing > 0.12) {
          L.el.style.display = 'block';
          L.el.style.left = sx.toFixed(1) + 'px';
          L.el.style.top = sy.toFixed(1) + 'px';
          L.el.style.opacity = Math.min(0.95, (facing - 0.12) * 3.2).toFixed(2);
        } else {
          L.el.style.display = 'none';
        }
      });

      renderer.render(scene, camera);
    }
    /* 可见性观察：进入视口才启动 rAF，离开则停帧并释放GPU */
    if (window.IntersectionObserver) {
      obs = new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && rafId == null) loop();      // 重新进入视口 → 恢复
        else if (!visible && rafId != null) {     // 离开视口 → 停帧
          cancelAnimationFrame(rafId); rafId = null;
        }
      }, { threshold: 0.01 });
      obs.observe(box);
    }
    loop();

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w2 = box.clientWidth, h2 = box.clientHeight;
        if (!w2 || !h2) return;
        camera.aspect = w2 / h2; camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      }, 160);
    });

    this.focus = function (lat, lon) {
      autoSpin = false;
      rotY = -(lon + 180) * Math.PI / 180 - Math.PI / 2;
      rotX = Math.max(-1.1, Math.min(1.1, lat * Math.PI / 180));
      applyCamera();
    };
    /* 释放资源：停帧 + 断开观察器 + 释放 GPU 显存。
       页面切走或长时间挂后台时调用，避免持续耗电/占显存。 */
    this.dispose = function () {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      if (obs) { try { obs.disconnect(); } catch (e) {} obs = null; }
      try {
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
            else o.material.dispose();
          }
        });
        renderer.dispose();
      } catch (e) {}
    };
    this.ok = true;
    return true;
  };

  /* ---------------- 2D 降级 ---------------- */
  Globe.prototype.fallback = function () {
    var box = this.box;
    var cv = document.createElement('canvas');
    cv.width = box.clientWidth || 660; cv.height = box.clientHeight || 360;
    cv.style.width = '100%'; cv.style.height = '100%';
    box.appendChild(cv);
    var ctx = cv.getContext && cv.getContext('2d');
    var G = window.WORLD_GEO || {};
    var W = cv.width, H = cv.height;
    /* 提前绑定 self：本分支在下方 `var self = this` 之前就return，
       若沿用后面的 hoisted 声明，此处 self 为 undefined，点击事件标记会抛 TypeError。 */
    var self = this;
    var onPick = (this.opts && this.opts.onPick) || function () {};
    if (!ctx) {
      // 完全没有 canvas 能力：至少把洲际标注和事件点用 DOM 画出来，保留地理参照
      var lay = document.getElementById('continent-layer');
      if (lay) {
        CONTINENTS.forEach(function (c) {
          var el = document.createElement('div');
          el.className = 'continent';
          el.innerHTML = '<span>' + c.zh + '</span>';
          el.style.left = ((c.lon + 180) / 360 * 100) + '%';
          el.style.top = ((90 - c.lat) / 180 * 100) + '%';
          lay.appendChild(el);
        });
        this.events.forEach(function (ev) {
          var mk = document.createElement('div');
          mk.className = 'continent';
          mk.style.cssText = 'font-size:16px;color:' + (TYPE_HEX[ev.type] || '#fff')
            + ';left:' + ((ev.lon + 180) / 360 * 100) + '%;top:' + ((90 - ev.lat) / 180 * 100) + '%';
          mk.textContent = '●';
          mk.style.pointerEvents = 'auto';
          mk.style.cursor = 'pointer';
          mk.addEventListener('click', function () { onPick(ev.id); });
          lay.appendChild(mk);
        });
      }
      this.ok = 'none';
      return 'none';
    }

    function draw(list, color, lw) {
      if (!list) return;
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      list.forEach(function (ring) {
        ctx.beginPath();
        ring.forEach(function (p, i) {
          var x = (p[0] + 180) / 360 * W, y = (90 - p[1]) / 180 * H;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }
    draw(G.border, 'rgba(120,160,200,.45)', 1);
    draw(G.coast, 'rgba(168,212,245,.9)', 1.2);

    /* 2D 下的洲际标注 */
    var layer = document.getElementById('continent-layer');
    if (layer) {
      CONTINENTS.forEach(function (c) {
        var el = document.createElement('div');
        el.className = 'continent';
        el.innerHTML = '<span>' + c.zh + '</span>';
        el.style.left = ((c.lon + 180) / 360 * 100) + '%';
        el.style.top = ((90 - c.lat) / 180 * 100) + '%';
        layer.appendChild(el);
      });
    }

    var self = this;
    this.events.forEach(function (ev) {
      var x = (ev.lon + 180) / 360 * W, y = (90 - ev.lat) / 180 * H;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.284);
      ctx.fillStyle = TYPE_HEX[ev.type] || '#ffffff';
      ctx.fill();
    });
    cv.style.cursor = 'pointer';
    cv.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      var best = null, bd = 1e9;
      self.events.forEach(function (ev) {
        var ex = (ev.lon + 180) / 360 * W, ey = (90 - ev.lat) / 180 * H;
        var d = Math.hypot(x - ex, y - ey);
        if (d < bd) { bd = d; best = ev; }
      });
      if (best && bd < 26 && self.opts.onPick) self.opts.onPick(best.id);
    });
    this.ok = '2d';
    return '2d';
  };

  window.Globe = Globe;
  window.GlobeContinents = CONTINENTS;
})();
