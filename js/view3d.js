/* ===================================================================
   GW.View3D – widok przestrzenny (Three.js r128)
   Prymitywy: pt, seg, pl (łamana), poly, circle3, mesh
   Każdy obiekt niesie prim.id → podświetlanie synchroniczne z 2D.
   Współrzędne GW (x,y,z) → Three (x, z, y)  [y GW = do obserwatora]
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G;
  const T = (p) => new THREE.Vector3(p[0], p[2], p[1]);

  const ST = {
    given: { c: 0x111111, r: 0.42 },
    proj: { c: 0x2b2b2b, r: 0.3 },
    projl: { c: 0x3a3a3a, r: 0.2 },
    thin: { c: 0x8a8a8a, r: 0.13 },
    odn: { c: 0x8f8f8f, dash: true },
    ray: { c: 0x3b6fd6, dash: true },
    aux: { c: 0x2a6fdb, r: 0.22 },
    aux2: { c: 0x00897b, r: 0.22 },
    res: { c: 0xd01818, r: 0.5 },
    res2: { c: 0x8e24aa, r: 0.42 },
    vis: { c: 0x111111, r: 0.42 },
    hid: { c: 0x8a8a8a, dash: true },
    dist: { c: 0x0f9d58, r: 0.36 },
    axis: { c: 0x000000, r: 0.16 },
    cont: { c: 0x8a5a2b, r: 0.14 },
    contb: { c: 0x8a5a2b, r: 0.26 },
    sec: { c: 0xe07b00, r: 0.3 },
    light: { c: 0xd4a017, dash: true },
    lightl: { c: 0xd4a017, r: 0.16 },
    eye: { c: 0x2a6fdb, r: 0.3 },
    water: { c: 0x1e88e5, r: 0.3 },
  };
  const HL = new THREE.Color(0xff00aa);
  const SRC = new THREE.Color(0xff8c00);

  class View3D {
    constructor(el, tipFn) {
      this.el = el;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0xf7f7f4, 1);
      el.appendChild(this.renderer.domElement);
      this.labels = document.createElement('div');
      this.labels.className = 'lab3layer';
      el.appendChild(this.labels);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
      this.camera.position.set(150, 120, 200);
      this.makeControls();
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.62));
      const dl = new THREE.DirectionalLight(0xffffff, 0.55);
      dl.position.set(0.5, 1, 0.8);
      this.scene.add(dl);
      const dl2 = new THREE.DirectionalLight(0xffffff, 0.25);
      dl2.position.set(-0.6, 0.3, -0.5);
      this.scene.add(dl2);
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.groups = {};
      this.objs = [];
      this.ovObjs = [];
      this.hl = new Set();
      this.src = new Set();
      this.U = {};
      this.Utarget = null;
      this.sys = null;
      this.unit = 1;
      this.zs = 1;
      this.solidOp = 1;
      this.center = [0, 0, 0];
      this.radius = 80;
      this.sphereG = new THREE.SphereGeometry(1, 14, 10);
      this.cylG = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
      this.cylG.translate(0, 0.5, 0);
      this.ray = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.tween = null;
      this.onHover = null;
      this.onClick = null;
      this.frameHooks = [];
      this.lastHoverId = null;
      const dom = this.renderer.domElement;
      dom.addEventListener('mousemove', (e) => this.pick(e));
      dom.addEventListener('mouseleave', () => {
        this.lastHoverId = null;
        this.onHover && this.onHover(null, null);
      });
      dom.addEventListener('click', (e) => {
        const o = this.pickObj(e);
        this.onClick && this.onClick(o ? o.userData.prim : null);
      });
      new ResizeObserver(() => this.resize()).observe(el);
      this.resize();
      this.t0 = performance.now();
      const loop = () => {
        requestAnimationFrame(loop);
        this.frame();
      };
      loop();
    }
    makeControls() {
      const tgt = this.controls ? this.controls.target.clone() : new THREE.Vector3();
      if (this.controls) this.controls.dispose();
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(tgt);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.12;
      this.controls.rotateSpeed = 0.8;
    }
    resize() {
      const w = this.el.clientWidth || 300,
        h = this.el.clientHeight || 300;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    setSys(sys) {
      this.sys = sys;
    }
    group(id) {
      if (!this.groups[id]) {
        const g = new THREE.Group();
        g.matrixAutoUpdate = false;
        this.root.add(g);
        this.groups[id] = g;
      }
      return this.groups[id];
    }
    clearList(list) {
      list.forEach((o) => {
        o.parent && o.parent.remove(o);
        o.traverse((c) => {
          if (c.material) c.material.dispose();
          if (c.geometry && c.geometry !== this.sphereG && c.geometry !== this.cylG) c.geometry.dispose();
        });
        if (o.userData.labEl) o.userData.labEl.remove();
      });
      list.length = 0;
    }
    /* ---------- budowa obiektów ---------- */
    mat(st, opts = {}) {
      if (st.dash) return new THREE.LineDashedMaterial({ color: opts.col ?? st.c, dashSize: 1.6 * this.unit, gapSize: 1.1 * this.unit, transparent: true, opacity: opts.op ?? 0.9 });
      return new THREE.MeshLambertMaterial({ color: opts.col ?? st.c, transparent: (opts.op ?? 1) < 1, opacity: opts.op ?? 1 });
    }
    cyl(a, b, r, mat) {
      const A = T(a),
        B = T(b);
      const d = new THREE.Vector3().subVectors(B, A);
      const L = d.length();
      const m = new THREE.Mesh(this.cylG, mat);
      m.position.copy(A);
      if (L > 1e-9) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      m.scale.set(r, Math.max(L, 1e-6), r);
      m.userData.len = L;
      m.userData.r = r;
      return m;
    }
    build(p) {
      const st = ST[p.s] || ST.given;
      const u = this.unit;
      let o = null;
      if (p.t === 'pt') {
        const m = new THREE.MeshLambertMaterial({ color: p.col ?? st.c });
        o = new THREE.Mesh(this.sphereG, m);
        const r = (p.small ? 0.75 : 1.05) * u * (p.r || 1);
        o.userData.r = r;
        this.ptScale(o, 1);
        o.position.copy(T(p.p));
        o.userData.kind = 'pt';
        o.userData.prio = 3;
      } else if (p.t === 'seg' || p.t === 'pl') {
        const pts = p.t === 'seg' ? [p.a, p.b] : p.closed ? p.pts.concat([p.pts[0]]) : p.pts;
        const rr = (p.w || 1) * (st.r || 0.1) * u;
        if ((pts.length > 24 || this.zs > 1.5) && !st.dash && !p.dash) {
          if ((st.r || 0) <= 0.16 || this.zs > 1.5) {
            const g = new THREE.BufferGeometry().setFromPoints(pts.map(T));
            o = new THREE.Line(g, new THREE.LineBasicMaterial({ color: p.col ?? st.c, transparent: true, opacity: p.op ?? 0.9 }));
            o.userData.kind = 'line';
          } else {
            const curve = new THREE.CatmullRomCurve3(pts.map(T), !!p.closed, 'centripetal');
            const g = new THREE.TubeGeometry(curve, Math.min(800, pts.length * 2), rr, 6, !!p.closed);
            o = new THREE.Mesh(g, this.mat(st, { col: p.col, op: p.op }));
            o.userData.kind = 'tube';
          }
          o.userData.prio = 2;
        } else if (st.dash || p.dash) {
          const g = new THREE.BufferGeometry().setFromPoints(pts.map(T));
          const m = this.mat(st.dash ? st : { c: st.c, dash: true }, { col: p.col, op: p.op });
          o = new THREE.Line(g, m);
          o.computeLineDistances();
          o.userData.kind = 'line';
        } else {
          o = new THREE.Group();
          const m = this.mat(st, { col: p.col, op: p.op });
          const r = (p.w || 1) * st.r * u;
          for (let i = 0; i + 1 < pts.length; i++) {
            const c = this.cyl(pts[i], pts[i + 1], r, m);
            c.userData.prim = p;
            o.add(c);
          }
          o.userData.mat = m;
          o.userData.kind = 'cyl';
          o.userData.r = r;
        }
        o.userData.prio = 2;
      } else if (p.t === 'poly') {
        o = new THREE.Group();
        const n = G.newell(p.pts);
        const ax = Math.abs(n[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
        const e1 = V.norm(V.cross(n, ax)),
          e2 = V.cross(n, e1);
        const c0 = p.pts[0];
        const p2 = p.pts.map((q) => new THREE.Vector2(V.dot(V.sub(q, c0), e1), V.dot(V.sub(q, c0), e2)));
        let tris = [];
        try {
          tris = THREE.ShapeUtils.triangulateShape(p2, []);
        } catch (e) {
          for (let i = 1; i + 1 < p.pts.length; i++) tris.push([0, i, i + 1]);
        }
        const pos = [];
        tris.forEach((t) => t.forEach((i) => pos.push(p.pts[i][0], p.pts[i][2], p.pts[i][1])));
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        const m = new THREE.MeshLambertMaterial({ color: p.col || '#e8c060', transparent: true, opacity: p.op ?? 0.4, side: THREE.DoubleSide, depthWrite: (p.op ?? 0.4) > 0.95 });
        const mesh = new THREE.Mesh(g, m);
        mesh.userData.prim = p;
        mesh.renderOrder = p.isPlane ? -2 : -1;
        o.add(mesh);
        o.userData.mat = m;
        if (p.edge) {
          const lg = new THREE.BufferGeometry().setFromPoints(p.pts.concat([p.pts[0]]).map(T));
          const lm = new THREE.LineBasicMaterial({ color: p.edgeCol || (p.isPlane ? 0x5a6a7a : 0x2a6fdb), transparent: true, opacity: 0.7 });
          const l = new THREE.Line(lg, lm);
          l.userData.prim = p;
          o.add(l);
        }
        o.userData.kind = 'poly';
        o.userData.prio = p.isPlane ? 0 : 1;
      } else if (p.t === 'circle3') {
        const n = V.norm(p.n);
        const ax = Math.abs(n[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
        const e1 = V.norm(V.cross(n, ax)),
          e2 = V.cross(n, e1);
        const pts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push(V.add(p.c, V.add(V.mul(e1, p.r * Math.cos(a)), V.mul(e2, p.r * Math.sin(a)))));
        }
        return this.build(Object.assign({}, p, { t: 'pl', pts, closed: false }));
      } else if (p.t === 'mesh') {
        o = p.build(THREE, T, this.unit);
        o.frustumCulled = false;
        o.userData.kind = 'mesh';
        o.userData.prio = 1;
        o.traverse((c) => (c.userData.prim = p));
      }
      if (!o) return null;
      o.userData.prim = p;
      const sol = this.solidOp !== 1 && GW.catOf(p) === 'solids';
      o.traverse((c) => {
        c.userData.prim = p;
        if (c.material && !c.userData.base) {
          c.userData.baseCol = c.material.color ? c.material.color.clone() : null;
          if (sol && c.isMesh) {
            c.material.opacity = Math.min(1, c.material.opacity * this.solidOp);
            c.material.transparent = c.material.opacity < 0.999;
            c.material.depthWrite = c.material.opacity > 0.95;
          }
          c.userData.baseOp = c.material.opacity;
        }
      });
      if (p.label) {
        const d = document.createElement('div');
        d.className = 'lab3' + (p.isPlane ? ' plane' : '') + (p.s === 'axis' ? ' axis' : '');
        d.innerHTML = GW.labHTML(p.label);
        d.dataset.id = p.id;
        this.labels.appendChild(d);
        o.userData.labEl = d;
      }
      if (p.planeLabel) {
        const d = document.createElement('div');
        d.className = 'lab3 plane';
        d.innerHTML = GW.labHTML(p.planeLabel);
        this.labels.appendChild(d);
        o.userData.labEl = d;
      }
      return o;
    }
    labelPos(p) {
      if (p.t === 'pt') return p.p;
      if (p.t === 'seg') return V.lerp(p.a, p.b, p.labelAt ?? 0.55);
      if (p.t === 'pl') return p.pts[Math.floor(p.pts.length * (p.labelAt ?? 0.5))];
      if (p.t === 'poly') return p.labelP || (p.isPlane ? V.lerp(p.pts[2], p.pts[3], 0.08) : G.centroid(p.pts));
      if (p.labelP) return p.labelP;
      return [0, 0, 0];
    }
    /* ---------- scena kroku ---------- */
    setPrims(prims, o = {}) {
      this.clearList(this.objs);
      this.faded = true;
      const now = performance.now();
      prims.forEach((p) => {
        const obj = this.build(p);
        if (!obj) return;
        if (o.animate && p.from === o.step && !p.isPlane) obj.userData.born = now;
        this.group(p.pl || 'space').add(obj);
        this.objs.push(obj);
      });
      this.applyHL();
      this.applyUnfold();
    }
    setOverlay(prims) {
      this.clearList(this.ovObjs);
      this.faded = true;
      (prims || []).forEach((p) => {
        const obj = this.build(p);
        if (!obj) return;
        this.group(p.pl || 'space').add(obj);
        this.ovObjs.push(obj);
      });
      this.applyHL();
      this.applyUnfold();
    }
    setFrame(pts) {
      if (!pts.length) return;
      const mn = [1e9, 1e9, 1e9],
        mx = [-1e9, -1e9, -1e9];
      pts.forEach((p) => p.forEach((v, i) => ((mn[i] = Math.min(mn[i], v)), (mx[i] = Math.max(mx[i], v)))));
      this.center = V.mid(mn, mx);
      const smn = [mn[0], mn[1], mn[2] * this.zs],
        smx = [mx[0], mx[1], mx[2] * this.zs];
      this.radius = Math.max(10, V.dist(smn, smx) / 2);
      this.unit = this.radius / 75;
    }
    /* punkt GW -> świat Three (z uwzględnieniem przewyższenia) */
    W(p) {
      return new THREE.Vector3(p[0], p[2] * this.zs, p[1]);
    }
    ptScale(o, k) {
      const r = o.userData.r * k;
      o.scale.set(r, r / this.zs, r);
    }
    setZScale(s) {
      this.zs = s;
      this.root.scale.set(1, s, 1);
      this.root.updateMatrixWorld(true);
      this.objs.concat(this.ovObjs).forEach((o) => {
        if (o.userData.kind === 'pt') this.ptScale(o, this.hl.has(o.userData.prim.id) ? 1.7 : 1);
      });
    }
    /* ---------- podświetlanie ---------- */
    setHighlight(set) {
      this.hl = set || new Set();
      this.applyHL();
    }
    setSrc(set) {
      this.src = set || new Set();
      this.applyHL();
    }
    applyHL() {
      const all = this.objs.concat(this.ovObjs);
      all.forEach((o) => {
        const id = o.userData.prim.id;
        const on = this.hl.has(id);
        o.traverse((c) => {
          if (!c.material || !c.userData.baseCol) return;
          if (on) {
            c.material.color.copy(HL);
            c.material.opacity = Math.max(c.userData.baseOp, c.userData.prim.isPlane ? 0.3 : 0.85);
          } else if (!this.src.has(id)) {
            c.material.color.copy(c.userData.baseCol);
            c.material.opacity = c.userData.baseOp;
          }
        });
        const k = on ? 1.7 : 1;
        if (o.userData.kind === 'pt') this.ptScale(o, k);
        if (o.userData.kind === 'cyl')
          o.children.forEach((c) => {
            c.scale.x = c.scale.z = c.userData.r * k;
          });
        if (o.userData.labEl) o.userData.labEl.classList.toggle('hl', on);
      });
    }
    /* ---------- rozkładanie rzutni ---------- */
    setUnfold(U, animate) {
      if (animate) {
        this.Ufrom = Object.assign({}, this.U);
        this.Utarget = Object.assign({}, U);
        this.Ut0 = performance.now();
      } else {
        this.U = Object.assign({}, U);
        this.Utarget = null;
        this.applyUnfold();
      }
    }
    applyUnfold() {
      if (!this.sys) {
        Object.values(this.groups).forEach((g) => g.matrix.identity());
        return;
      }
      let maxU = 0;
      Object.keys(this.groups).forEach((id) => {
        const g = this.groups[id];
        if (id === 'space' || !this.sys.P[id]) {
          g.matrix.identity();
          return;
        }
        const A = this.sys.matrix(id, this.U);
        // konwersja do układu Three: S R S, S t
        const R = A.R,
          t = A.t;
        const S = [0, 2, 1];
        const m = new THREE.Matrix4();
        m.set(R[S[0]][S[0]], R[S[0]][S[1]], R[S[0]][S[2]], t[S[0]], R[S[1]][S[0]], R[S[1]][S[1]], R[S[1]][S[2]], t[S[1]], R[S[2]][S[0]], R[S[2]][S[1]], R[S[2]][S[2]], t[S[2]], 0, 0, 0, 1);
        g.matrix.copy(m);
        g.matrixWorldNeedsUpdate = true;
      });
      Object.values(this.U).forEach((v) => (maxU = Math.max(maxU, v)));
      const was = this.faded;
      this.faded = maxU > 0.001;
      if (!this.faded && !was) return;
      this.objs.concat(this.ovObjs).forEach((o) => {
        const p = o.userData.prim;
        if (p.s === 'ray') o.visible = maxU < 0.02;
        else if (!p.pl && p.hideOnUnfold !== false) {
          o.traverse((c) => {
            if (!c.material || c.userData.baseOp === undefined || this.hl.has(p.id)) return;
            if (this.faded) {
              c.material.transparent = true;
              c.material.opacity = c.userData.baseOp * (1 - 0.8 * Math.min(1, maxU * 1.5));
            } else c.material.opacity = c.userData.baseOp;
          });
        }
      });
    }
    /* ---------- kamera ---------- */
    camTo(spec, animate = true) {
      // spec: {dir:[gw], up:[gw]|null, target:[gw], dist}
      const target = spec.target || this.center;
      const dir = V.norm(spec.dir || [0.55, 1, 0.7]);
      const fov = spec.fov || 35;
      const vh = Math.tan(((fov / 2) * Math.PI) / 180);
      const hh = vh * Math.max(0.3, this.camera.aspect || 1);
      const dist = spec.dist || ((this.radius * (spec.zoom || 1)) / Math.min(vh, hh)) * 1.25;
      const tW = this.W(target);
      const pW = tW.clone().add(T(dir).normalize().multiplyScalar(dist));
      const up = spec.up ? T(spec.up).normalize() : new THREE.Vector3(0, 1, 0);
      const go = {
        p0: this.camera.position.clone(),
        t0: this.controls.target.clone(),
        u0: this.camera.up.clone(),
        p1: pW,
        t1: tW,
        u1: up,
        start: performance.now(),
        dur: animate ? 900 : 1,
      };
      if (spec.fov) {
        go.f0 = this.camera.fov;
        go.f1 = spec.fov;
      } else if (this.camera.fov !== 35) {
        go.f0 = this.camera.fov;
        go.f1 = 35;
      }
      this.tween = go;
    }
    camPreset(name) {
      const P = {
        iso: { dir: [0.62, 1, 0.72] },
        front: { dir: [0, 1, 0.0001] },
        top: { dir: [0, 0.0001, 1], up: [0, -1, 0] },
        side: { dir: [1, 0.0001, 0.0001] },
      };
      this.camTo(P[name] || P.iso);
    }
    /* ---------- picking ---------- */
    pickables() {
      const arr = [];
      this.objs.concat(this.ovObjs).forEach((o) => {
        if (!o.visible || !o.parent) return;
        o.traverse((c) => {
          if ((c.isMesh || c.isLine) && c.visible) arr.push(c);
        });
      });
      return arr;
    }
    pickObj(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.ray.setFromCamera(this.mouse, this.camera);
      this.ray.params.Line.threshold = this.unit * 0.9;
      const hits = this.ray.intersectObjects(this.pickables(), false);
      if (!hits.length) return null;
      let best = null,
        bp = -1;
      hits.forEach((h) => {
        let o = h.object;
        let top = o;
        while (top.parent && !top.parent.isScene && top.parent.matrixAutoUpdate !== false && top.parent !== this.root) top = top.parent;
        const p = o.userData.prim;
        if (!p || p.noPick) return;
        const pr = p.t === 'pt' ? 3 : p.t === 'seg' || p.t === 'pl' || p.t === 'circle3' ? 2 : p.isPlane ? 0 : 1;
        if (pr > bp) {
          bp = pr;
          best = o;
        }
      });
      return best;
    }
    pick(e) {
      if (this.dragging) return;
      const o = this.pickObj(e);
      const id = o ? o.userData.prim.id : null;
      if (id !== this.lastHoverId) {
        this.lastHoverId = id;
        this.onHover && this.onHover(id, e);
      } else if (id && this.onMove) this.onMove(e);
    }
    /* ---------- pętla ---------- */
    frame() {
      const now = performance.now();
      if (this.tween) {
        const tw = this.tween;
        let f = Math.min(1, (now - tw.start) / tw.dur);
        const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
        this.camera.position.lerpVectors(tw.p0, tw.p1, e);
        this.controls.target.lerpVectors(tw.t0, tw.t1, e);
        this.camera.up.lerpVectors(tw.u0, tw.u1, e).normalize();
        if (tw.f0 !== undefined) {
          this.camera.fov = tw.f0 + (tw.f1 - tw.f0) * e;
          this.camera.updateProjectionMatrix();
        }
        this.camera.lookAt(this.controls.target);
        if (f >= 1) {
          this.tween = null;
          this.makeControls();
        }
      } else this.controls.update();
      if (this.Utarget) {
        const f = Math.min(1, (now - this.Ut0) / 1400);
        const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        const keys = new Set(Object.keys(this.Utarget).concat(Object.keys(this.Ufrom)));
        keys.forEach((k) => (this.U[k] = (this.Ufrom[k] || 0) + ((this.Utarget[k] || 0) - (this.Ufrom[k] || 0)) * e));
        this.applyUnfold();
        if (f >= 1) this.Utarget = null;
        this.onUnfoldChange && this.onUnfoldChange(this.U);
      }
      // animacje "rysowania" nowych obiektów
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      this.objs.forEach((o) => {
        const b = o.userData.born;
        if (b) {
          const f = Math.min(1, (now - b) / 700);
          const ease = 1 - Math.pow(1 - f, 3);
          const k = o.userData.kind;
          if (k === 'pt') this.ptScale(o, (f < 1 ? 0.2 + 1.4 * Math.sin(ease * Math.PI * 0.75) : 1) * (this.hl.has(o.userData.prim.id) ? 1.7 : 1));
          else if (k === 'cyl') o.children.forEach((c) => (c.scale.y = Math.max(1e-6, c.userData.len * ease)));
          else
            o.traverse((c) => {
              if (c.material && c.userData.baseOp !== undefined) c.material.opacity = c.userData.baseOp * ease;
            });
          if (f >= 1) o.userData.born = 0;
        }
        if (this.src.has(o.userData.prim.id) && !this.hl.has(o.userData.prim.id)) {
          o.traverse((c) => {
            if (c.material && c.userData.baseCol) c.material.color.copy(c.userData.baseCol).lerp(SRC, 0.35 + 0.65 * pulse);
          });
        }
      });
      this.frameHooks.forEach((fn) => fn(now));
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    }
    updateLabels() {
      const w = this.el.clientWidth,
        h = this.el.clientHeight;
      const v = new THREE.Vector3();
      this.objs.concat(this.ovObjs).forEach((o) => {
        const d = o.userData.labEl;
        if (!d) return;
        if (!o.visible || (o.userData.born && performance.now() - o.userData.born < 300)) {
          d.style.display = 'none';
          return;
        }
        const P = this.labelPos(o.userData.prim);
        v.copy(T(P));
        const g = o.parent;
        if (g) v.applyMatrix4(g.matrixWorld);
        v.project(this.camera);
        if (v.z > 1 || v.z < -1) {
          d.style.display = 'none';
          return;
        }
        d.style.display = '';
        d.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w + 6).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * h - 18).toFixed(1) + 'px)';
      });
    }
    /* rzut punktu GW na ekran (px) – do overlayów */
    screenOf(P) {
      const v = T(P).applyMatrix4(this.root.matrixWorld).project(this.camera);
      return [(v.x * 0.5 + 0.5) * this.el.clientWidth, (-v.y * 0.5 + 0.5) * this.el.clientHeight];
    }
  }
  GW.View3D = View3D;
  GW.T3 = T;
})();
