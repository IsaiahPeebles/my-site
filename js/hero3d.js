// Hero art in 3D: the same edit loop as the SVG drawing (document, gears,
// robot arm), rebuilt as a WebGL scene. main.js loads this lazily; the SVG
// stays on screen until the first frame is drawn, and stays for good if
// WebGL isn't available.
import * as THREE from "./vendor/three.module.min.js";

const LOOP = 9; // seconds, matches the CSS animations

// SVG viewBox units (400 x 400, y down) -> world units (y up)
const S = 0.01;
const wx = (x) => (x - 200) * S;
const wy = (y) => -(y - 200) * S;

const WHITE = 0xffffff;
const MUTED = 0xa8a8a8;
const INK = 0x030303;
const WASH = 0x141414;

// ---------- Timeline helpers ----------
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;

// frames: [[percent, value], ...] like a CSS @keyframes block
function keyframes(p, frames, ease = easeInOut) {
  if (p <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [p1, v1] = frames[i];
    if (p <= p1) {
      const [p0, v0] = frames[i - 1];
      return v0 + (v1 - v0) * ease((p - p0) / (p1 - p0));
    }
  }
  return frames[frames.length - 1][1];
}

// Percent through the loop for an element with an animation-delay
function progress(t, delay = 0) {
  if (t < delay) return 0;
  return (((t - delay) % LOOP) / LOOP) * 100;
}

// ---------- Geometry helpers ----------
function roundedRect(w, h, r, path = new THREE.Shape()) {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function extrude(shape, depth, bevel = 0.008) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// A black slab with a white rim, the 3D version of fill: bg + stroke: text
function outlinedSlab(w, h, r, stroke, depth, mats) {
  const group = new THREE.Group();
  const rim = roundedRect(w, h, r);
  rim.holes.push(roundedRect(w - stroke * 2, h - stroke * 2, Math.max(r - stroke, 0.001), new THREE.Path()));
  group.add(new THREE.Mesh(extrude(rim, depth), mats.white));
  const face = new THREE.Mesh(
    extrude(roundedRect(w - stroke * 2, h - stroke * 2, Math.max(r - stroke, 0.001)), depth * 0.7, 0),
    mats.ink
  );
  face.position.z = -depth * 0.1;
  group.add(face);
  return group;
}

function disc(radius, depth, mat, segments = 40) {
  const geo = new THREE.CylinderGeometry(radius, radius, depth, segments);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

// A bar that grows from its left end, like transform-origin: left center
function bar(w, h, depth, mat) {
  const geo = new THREE.BoxGeometry(w, h, depth);
  geo.translate(w / 2, 0, 0);
  return new THREE.Mesh(geo, mat);
}

function gearShape(root, tip, teeth, hole) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [root, a - step * 0.3],
      [tip, a - step * 0.17],
      [tip, a + step * 0.17],
      [root, a + step * 0.3],
    ];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.absarc(0, 0, root, a + step * 0.3, a + step * 0.7, false);
  }
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  shape.holes.push(h);
  return shape;
}

function makeGear({ cx, cy, root, tip, teeth, ring, ringWidth, hole }, mats) {
  const gear = new THREE.Group();
  gear.position.set(wx(cx), wy(cy), 0.22);
  gear.add(new THREE.Mesh(extrude(gearShape(root * S, tip * S, teeth, hole * S), 0.12, 0.01), mats.white));
  // The dark ring is a groove cut into both faces
  const groove = new THREE.RingGeometry((ring - ringWidth / 2) * S, (ring + ringWidth / 2) * S, 48);
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(groove, mats.ink);
    m.position.z = side * 0.071;
    if (side < 0) m.rotation.y = Math.PI;
    gear.add(m);
  }
  const axle = disc(hole * S * 0.55, 0.3, mats.white, 20);
  axle.position.z = -0.1;
  gear.add(axle);
  return gear;
}

// Segment between two points with the dashed dark notches down its middle
function armSegment(from, to, width, mats) {
  const group = new THREE.Group();
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  group.position.set(from.x, from.y, 0);
  group.rotation.z = Math.atan2(dy, dx);

  const body = new THREE.Mesh(new THREE.BoxGeometry(len, width, 0.1), mats.white);
  body.position.x = len / 2;
  group.add(body);
  // Round ends, like stroke-linecap: round
  for (const x of [0, len]) {
    const cap = disc(width / 2, 0.1, mats.white, 24);
    cap.position.x = x;
    group.add(cap);
  }
  const notch = new THREE.BoxGeometry(0.041, 0.041, 0.104);
  for (let x = 0; x < len; x += 0.115) {
    const n = new THREE.Mesh(notch, mats.ink);
    n.position.x = x + 0.02;
    group.add(n);
  }
  return group;
}

function joint(radius, pinRadius, mats) {
  const group = new THREE.Group();
  group.add(disc(radius + 0.0125, 0.14, mats.white));
  const face = disc(radius - 0.0125, 0.142, mats.ink);
  group.add(face);
  const pin = disc(pinRadius, 0.16, mats.white, 20);
  group.add(pin);
  return group;
}

// ---------- Scene ----------
function buildScene() {
  const mats = {
    white: new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.35, metalness: 0.05 }),
    ink: new THREE.MeshStandardMaterial({ color: INK, roughness: 0.45, metalness: 0.2 }),
  };

  const scene = new THREE.Scene();
  const rig = new THREE.Group(); // tilts toward the pointer
  scene.add(rig);

  scene.add(new THREE.AmbientLight(WHITE, 1.3));
  const key = new THREE.DirectionalLight(WHITE, 2.2);
  key.position.set(-2, 3, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(WHITE, 1.2);
  rim.position.set(3, 1, -2);
  scene.add(rim);

  // Backdrop circle
  const backdrop = new THREE.Mesh(
    new THREE.CircleGeometry(170 * S, 96),
    new THREE.MeshBasicMaterial({ color: WASH })
  );
  backdrop.position.set(wx(200), wy(215), -0.5);
  rig.add(backdrop);

  // Document
  const doc = new THREE.Group();
  doc.position.set(wx(200), wy(185), 0);
  doc.add(outlinedSlab(190 * S, 260 * S, 10 * S, 2.5 * S, 0.1, mats));
  rig.add(doc);
  const faceZ = 0.03;
  const onDoc = (x, y, z) => new THREE.Vector3(wx(x) - doc.position.x, wy(y) - doc.position.y, faceZ + z);

  const heading = bar(96 * S, 10 * S, 0.02, mats.white);
  heading.position.copy(onDoc(128, 87, 0.01));
  doc.add(heading);

  const fade = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: true });

  const wordyWidths = [144, 136, 148, 120, 140, 96];
  const strikeWidths = [156, 148, 160, 132, 152, 108];
  const wordy = wordyWidths.map((w, i) => {
    const m = bar(w * S, 6 * S, 0.015, fade(MUTED));
    m.position.copy(onDoc(128, 115 + i * 20, 0.008));
    doc.add(m);
    return m;
  });
  const strikes = strikeWidths.map((w, i) => {
    const m = bar(w * S, 2 * S, 0.012, fade(WHITE));
    m.position.copy(onDoc(122, 115 + i * 20, 0.02));
    doc.add(m);
    return m;
  });
  const clean = [112, 84, 100].map((w, i) => {
    const m = bar(w * S, 6 * S, 0.02, fade(WHITE));
    m.position.copy(onDoc(128, 115 + i * 20, 0.01));
    doc.add(m);
    return m;
  });

  // Checkmark: a tube that draws itself along its path
  const checkPath = new THREE.CurvePath();
  const c0 = onDoc(140, 256, 0.02);
  const c1 = onDoc(152, 268, 0.02);
  const c2 = onDoc(176, 242, 0.02);
  checkPath.add(new THREE.LineCurve3(c0, c1));
  checkPath.add(new THREE.LineCurve3(c1, c2));
  const checkGeo = new THREE.TubeGeometry(checkPath, 96, 2.5 * S, 12, false);
  const checkMat = fade(WHITE);
  const check = new THREE.Mesh(checkGeo, checkMat);
  const checkCount = checkGeo.index.count;
  doc.add(check);
  const capGeo = new THREE.SphereGeometry(2.5 * S, 16, 12);
  const capStart = new THREE.Mesh(capGeo, checkMat);
  const capEnd = new THREE.Mesh(capGeo, checkMat);
  capStart.position.copy(c0);
  doc.add(capStart, capEnd);

  // Gears
  const bigGear = makeGear({ cx: 300, cy: 78, root: 26, tip: 34, teeth: 10, ring: 14, ringWidth: 4, hole: 5.5 }, mats);
  const smallGear = makeGear({ cx: 342, cy: 128, root: 14, tip: 20, teeth: 8, ring: 7.5, ringWidth: 2.5, hole: 3 }, mats);
  smallGear.position.z = 0.18;
  rig.add(bigGear, smallGear);

  // Robot arm (SVG group: translate(76 72) scale(0.82))
  const ap = (x, y) => new THREE.Vector2(wx(76 + x * 0.82), wy(72 + y * 0.82));
  const shoulder = ap(340, 350);
  const elbow = ap(356, 240);
  const wrist = ap(252, 222);
  const segW = 15 * 0.82 * S;

  const arm = new THREE.Group();
  arm.position.set(shoulder.x, shoulder.y, 0.38);
  rig.add(arm);

  const baseCenter = ap(340, 362);
  const base = outlinedSlab(88 * 0.82 * S, 24 * 0.82 * S, 5 * 0.82 * S, 2.5 * S, 0.16, mats);
  base.position.set(baseCenter.x - shoulder.x, baseCenter.y - shoulder.y, -0.02);
  arm.add(base);
  const detail = bar(16 * 0.82 * S, 4 * 0.82 * S, 0.02, mats.white);
  const d0 = ap(356, 362);
  detail.position.set(d0.x - shoulder.x, d0.y - shoulder.y, 0.07);
  arm.add(detail);

  const upper = new THREE.Group(); // pivots at the shoulder
  arm.add(upper);
  const local = (p, origin) => new THREE.Vector2(p.x - origin.x, p.y - origin.y);
  upper.add(armSegment(new THREE.Vector2(0, 0), local(elbow, shoulder), segW, mats));

  const fore = new THREE.Group(); // pivots at the elbow
  fore.position.set(elbow.x - shoulder.x, elbow.y - shoulder.y, 0.02);
  upper.add(fore);
  fore.add(armSegment(new THREE.Vector2(0, 0), local(wrist, elbow), segW, mats));

  // Gripper, in the tool's own SVG units (scaled 0.82, rotated 9.8deg)
  const tool = new THREE.Group();
  tool.position.set(wrist.x - elbow.x, wrist.y - elbow.y, 0.02);
  tool.rotation.z = THREE.MathUtils.degToRad(-9.8);
  tool.scale.setScalar(0.82 * S);
  fore.add(tool);
  const toolMat = mats.white;
  const stroke = (a, b, parent) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len + 4, 4, 6), toolMat);
    m.position.set((a[0] + b[0]) / 2, -(a[1] + b[1]) / 2, 0);
    m.rotation.z = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    parent.add(m);
  };
  stroke([-8, -15], [-8, 15], tool);
  // side -1 is the top finger (SVG y -15), side 1 the bottom one; points are
  // SVG units relative to the hinge at the end of the bar
  const fingers = [-1, 1].map((side) => {
    const finger = new THREE.Group();
    finger.position.set(-8, -side * 15, 0);
    stroke([0, 0], [-18, side * 7], finger);
    stroke([-18, side * 7], [-34, -side * 6], finger);
    tool.add(finger);
    return finger;
  });
  const toolJoint = outlinedSlab(16, 20, 2, 2.5, 10, mats);
  toolJoint.position.set(2, 0, 0);
  tool.add(toolJoint);

  const elbowJoint = joint(12 * 0.82 * S, 4 * 0.82 * S, mats);
  elbowJoint.position.set(0, 0, 0.03);
  fore.add(elbowJoint);
  const shoulderJoint = joint(13 * 0.82 * S, 4.5 * 0.82 * S, mats);
  shoulderJoint.position.z = 0.03;
  arm.add(shoulderJoint);

  // ---------- Per-frame update ----------
  const curveEnd = new THREE.Vector3();
  function update(t) {
    bigGear.rotation.z = -(t / 10) * Math.PI * 2;
    smallGear.rotation.z = (t / 6.5) * Math.PI * 2;

    wordy.forEach((m, i) => {
      m.material.opacity = keyframes(progress(t, i * 0.25), [[0, 1], [52, 1], [58, 0], [94, 0], [100, 1]]);
      m.visible = m.material.opacity > 0.01;
    });
    strikes.forEach((m, i) => {
      const p = progress(t, i * 0.25);
      m.scale.x = Math.max(0.001, keyframes(p, [[0, 0], [12, 0], [20, 1], [100, 1]]));
      m.material.opacity = keyframes(p, [[0, 1], [52, 1], [58, 0], [100, 0]]);
      m.visible = m.material.opacity > 0.01 && m.scale.x > 0.01;
    });
    clean.forEach((m, i) => {
      const p = progress(t, i * 0.2);
      m.scale.x = Math.max(0.001, keyframes(p, [[0, 0], [58, 0], [66, 1], [100, 1]], easeOut));
      m.material.opacity = keyframes(p, [[0, 1], [92, 1], [97, 0], [100, 0]], easeOut);
      m.visible = m.material.opacity > 0.01 && m.scale.x > 0.01;
    });

    const p = progress(t);
    const drawn = keyframes(p, [[0, 0], [70, 0], [76, 1], [100, 1]], easeOut);
    checkMat.opacity = keyframes(p, [[0, 1], [92, 1], [97, 0], [100, 0]], easeOut);
    check.visible = capStart.visible = capEnd.visible = drawn > 0.005 && checkMat.opacity > 0.01;
    // Draw whole rings of the tube so the end stays clean
    const ring = 12 * 6;
    checkGeo.setDrawRange(0, Math.floor((checkCount * drawn) / ring) * ring);
    checkPath.getPointAt(Math.min(drawn, 1), curveEnd);
    capEnd.position.copy(curveEnd);

    upper.rotation.z = THREE.MathUtils.degToRad(-keyframes(p, [[0, 0], [25, -3], [45, 2], [66, 0], [80, 0], [100, 0]]));
    fore.rotation.z = THREE.MathUtils.degToRad(-keyframes(p, [[0, 16], [60, 16], [68, 0], [80, 0], [90, 16], [100, 16]]));
    // In 3D the stamp can actually press in: the arm leans toward the page
    const press = keyframes(p, [[0, 0], [62, 0], [68, 1], [76, 1], [84, 0], [100, 0]]);
    arm.position.z = 0.38 - press * 0.22;
    // The gripper closes as it lands
    fingers.forEach((f, i) => (f.rotation.z = (i ? -1 : 1) * press * 0.12));
    // The page gives a little under the hit
    const thud = keyframes(p, [[0, 0], [67, 0], [68.5, 1], [71, 0], [100, 0]]);
    doc.position.z = -thud * 0.03;
  }

  return { scene, rig, update };
}

export function start(canvas) {
  const figure = canvas.closest(".hero-art");
  const svg = figure.querySelector("svg");
  const hero = canvas.closest(".hero");

  // Throws when WebGL is unavailable; main.js keeps the SVG in that case
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);

  const { scene, rig, update } = buildScene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // Extra room around the drawing so tilting doesn't clip it
  const PAD = 0.08;
  const fitHeight = 4 * (1 + PAD * 2);
  camera.position.set(0, 0, fitHeight / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
  camera.lookAt(0, 0, 0);

  function resize() {
    // Match the SVG's box, plus the padding
    const box = svg.getBoundingClientRect();
    const host = figure.getBoundingClientRect();
    const pad = box.width * PAD;
    Object.assign(canvas.style, {
      left: `${box.left - host.left - pad}px`,
      top: `${box.top - host.top - pad}px`,
      width: `${box.width + pad * 2}px`,
      height: `${box.height + pad * 2}px`,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(box.width + pad * 2, box.height + pad * 2, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer) {
    hero.addEventListener("pointermove", (event) => {
      const box = canvas.getBoundingClientRect();
      const nx = (event.clientX - (box.left + box.width / 2)) / window.innerWidth;
      const ny = (event.clientY - (box.top + box.height / 2)) / window.innerHeight;
      tilt.ty = Math.max(-1, Math.min(1, nx * 2)) * 0.35;
      tilt.tx = Math.max(-1, Math.min(1, ny * 2)) * 0.2;
    });
    hero.addEventListener("pointerleave", () => {
      tilt.tx = 0;
      tilt.ty = 0;
    });
  }

  const clockStart = performance.now();
  let frame = 0;
  let visible = true;
  let shown = false;

  function render(now) {
    const t = (now - clockStart) / 1000;
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    // A slow idle drift keeps the depth visible without the pointer
    rig.rotation.y = tilt.y + Math.sin(t * 0.55) * 0.16 - 0.14;
    rig.rotation.x = tilt.x + Math.sin(t * 0.42) * 0.06;
    update(t);
    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      figure.classList.add("is-3d");
    }
    frame = visible && !document.hidden ? requestAnimationFrame(render) : 0;
  }

  function wake() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  resize();
  new ResizeObserver(resize).observe(svg);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(figure);
  document.addEventListener("visibilitychange", wake);
  wake();
}
