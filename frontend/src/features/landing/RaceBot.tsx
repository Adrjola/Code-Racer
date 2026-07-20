import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type RaceBotProps = {
  /** How close (in px) the cursor needs to get to the Play button before RaceBot points at it. */
  pointTargetRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  /** Where the camera sits, as [x, y, z]. Move it closer or higher to frame just the upper body. */
  cameraPosition?: [number, number, number];
  /** The point the camera looks at, as [x, y, z]. Raise the y value to crop the legs out of frame. */
  cameraTarget?: [number, number, number];
};

const EXPRESSION_CYCLE = ['happy', 'funny', 'confused', 'angry'] as const;
const EXPRESSION_MS = 3500;
const POINT_RADIUS_PX = 200;

export default function RaceBot({
  pointTargetRef,
  className,
  cameraPosition = [0.6, 0.85, 1.7],
  cameraTarget = [0, 0.56, 0],
}: RaceBotProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cx, cy, cz] = cameraPosition;
  const [tx, ty, tz] = cameraTarget;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    // Some environments (like jsdom in tests) don't support WebGL at all,
    // so we just bail out here instead of crashing.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const setSize = () =>
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    setSize();
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.01,
      100,
    );
    camera.position.set(cx, cy, cz);
    camera.lookAt(tx, ty, tz);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    const M = {
      plastic: new THREE.MeshStandardMaterial({
        color: 0xd2ccdb,
        roughness: 0.55,
        metalness: 0.15,
      }),
      plasticD: new THREE.MeshStandardMaterial({
        color: 0xb7b1c4,
        roughness: 0.6,
        metalness: 0.15,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: 0x241f33,
        roughness: 0.5,
        metalness: 0.3,
      }),
      screen: new THREE.MeshStandardMaterial({
        color: 0x07040d,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x0a0512,
        emissiveIntensity: 1,
      }),
      rimPink: new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0xf472b6,
        emissiveIntensity: 1.25,
      }),
      rimPurple: new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0xa855f7,
        emissiveIntensity: 1.25,
      }),
      glow: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0,
        emissive: 0xffffff,
        emissiveIntensity: 1.4,
      }),
      glowPink: new THREE.MeshStandardMaterial({
        color: 0xf9a8d4,
        roughness: 0.3,
        metalness: 0,
        emissive: 0xf472b6,
        emissiveIntensity: 1.3,
      }),
      spark: new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        roughness: 0.4,
        metalness: 0,
        emissive: 0xfbbf24,
        emissiveIntensity: 1.6,
      }),
    };

    const roundedRectShape = (w: number, h: number, r: number) => {
      const s = new THREE.Shape();
      const x = -w / 2,
        y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const roundedBox = (
      w: number,
      h: number,
      d: number,
      r: number,
      mat: THREE.Material,
      name: string,
      bevel = 0.012,
    ) => {
      const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
        depth: d - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3,
        steps: 1,
      });
      geo.translate(0, 0, -(d - bevel * 2) / 2);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.name = name;
      return m;
    };
    const cyl = (
      rt: number,
      rb: number,
      h: number,
      mat: THREE.Material,
      name: string,
      seg = 32,
    ) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
      m.name = name;
      return m;
    };
    const disc = (r: number, mat: THREE.Material, name: string, seg = 40) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat);
      m.name = name;
      return m;
    };
    const bar = (w: number, h: number, mat: THREE.Material, name: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat);
      m.name = name;
      return m;
    };
    const arc = (
      radius: number,
      tube: number,
      mat: THREE.Material,
      name: string,
      arcLen = Math.PI,
    ) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 10, 26, arcLen),
        mat,
      );
      m.name = name;
      return m;
    };

    const root = new THREE.Group();
    root.name = 'RaceBot';
    const bot = new THREE.Group();
    bot.name = 'bot';
    root.add(bot);

    const legGroup = (sx: number) => {
      const g = new THREE.Group();
      g.name = 'legGroup';
      g.position.set(sx, 0.235, 0);
      const l = cyl(0.032, 0.036, 0.11, M.dark, 'leg', 24);
      l.position.set(0, -0.055, 0);
      const f = roundedBox(0.11, 0.07, 0.15, 0.03, M.plastic, 'foot');
      f.position.set(0, -0.115, 0.02);
      g.add(l, f);
      return g;
    };
    const legL = legGroup(-0.075),
      legR = legGroup(0.075);
    bot.add(legL, legR);

    const body = roundedBox(0.3, 0.27, 0.23, 0.07, M.plastic, 'body');
    body.position.y = 0.37;
    bot.add(body);
    const belly = roundedBox(0.17, 0.14, 0.02, 0.05, M.plasticD, 'belly_panel');
    belly.position.set(0, 0.35, 0.116);
    bot.add(belly);
    (
      [
        ['rimPink', -0.03],
        ['rimPurple', 0.0],
        ['spark', 0.03],
      ] as const
    ).forEach(([mk, x], i) => {
      const d = disc(0.012, M[mk], 'belly_led_' + i);
      d.position.set(x, 0.44, 0.118);
      bot.add(d);
    });

    const armGroup = (sx: number) => {
      const g = new THREE.Group();
      g.name = 'armGroup';
      g.position.set(sx, 0.47, 0.01);
      const sh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 24, 20),
        M.plasticD,
      );
      sh.name = 'shoulder';
      const up = cyl(0.028, 0.028, 0.15, M.dark, 'arm_link', 20);
      up.position.set(0, -0.085, 0);
      const hand = roundedBox(0.07, 0.085, 0.07, 0.03, M.plastic, 'hand');
      hand.position.set(0, -0.175, 0);
      g.add(sh, up, hand);
      return g;
    };
    const armL = armGroup(-0.208),
      armR = armGroup(0.208);
    bot.add(armL, armR);

    const head = new THREE.Group();
    head.name = 'head';
    head.position.y = 0.75;
    bot.add(head);

    const skull = roundedBox(0.42, 0.4, 0.34, 0.09, M.plastic, 'head_shell');
    head.add(skull);
    const ear = (sx: number) => {
      const e = cyl(0.05, 0.05, 0.05, M.plasticD, 'ear', 28);
      e.rotation.z = Math.PI / 2;
      e.position.set(sx, 0.0, 0.0);
      return e;
    };
    head.add(ear(-0.225), ear(0.225));

    const screen = roundedBox(0.31, 0.29, 0.03, 0.06, M.screen, 'screen');
    screen.position.set(0, 0.01, 0.158);
    head.add(screen);

    const rim = new THREE.Group();
    rim.name = 'face_rim';
    const RT = 0.017,
      RD = 0.05,
      RZ = 0.176;
    const sx2 = 0.155,
      sy2 = 0.145;
    const rimTop = roundedBox(0.31 + RT, RT, RD, 0.012, M.rimPink, 'rim_top');
    rimTop.position.set(0, sy2 + RT / 2, RZ);
    const rimLeft = roundedBox(RT, 0.29, RD, 0.012, M.rimPink, 'rim_left');
    rimLeft.position.set(-(sx2 + RT / 2), 0.01, RZ);
    const rimBottom = roundedBox(
      0.31 + RT,
      RT,
      RD,
      0.012,
      M.rimPurple,
      'rim_bottom',
    );
    rimBottom.position.set(0, 0.01 - sy2 - RT / 2, RZ);
    const rimRight = roundedBox(RT, 0.29, RD, 0.012, M.rimPurple, 'rim_right');
    rimRight.position.set(sx2 + RT / 2, 0.01, RZ);
    rim.add(rimTop, rimLeft, rimBottom, rimRight);
    head.add(rim);

    const face = new THREE.Group();
    face.name = 'face_features';
    face.position.set(0, 0.01, 0.181);
    head.add(face);

    const qmark = new THREE.Group();
    qmark.name = 'question';
    const qArc = arc(0.045, 0.012, M.glowPink, 'q_arc', Math.PI * 1.3);
    qArc.rotation.z = -Math.PI * 0.15;
    const qStem = bar(0.014, 0.03, M.glowPink, 'q_stem');
    qStem.position.set(0.005, -0.045, 0);
    const qDot = disc(0.011, M.glowPink, 'q_dot');
    qDot.position.set(0.005, -0.075, 0);
    qmark.add(qArc, qStem, qDot);
    qmark.position.set(0.16, 0.3, 0.15);
    qmark.visible = false;
    head.add(qmark);

    const EX = 0.078,
      EY = 0.03;
    const clearFace = () => {
      while (face.children.length) face.remove(face.children[0]);
    };
    const eye = (sx: number, sy = 1, r = 0.052) => {
      const e = disc(r, M.glow, 'eye');
      e.position.set(sx, EY, 0);
      e.scale.y = sy;
      return e;
    };
    const xEye = (sx: number) => {
      const g = new THREE.Group();
      g.name = 'eye_x';
      const a = bar(0.09, 0.016, M.glow, 'x1');
      a.rotation.z = Math.PI / 4;
      const b = bar(0.09, 0.016, M.glow, 'x2');
      b.rotation.z = -Math.PI / 4;
      g.add(a, b);
      g.position.set(sx, EY, 0);
      return g;
    };
    const dashEye = (sx: number) => {
      const d = bar(0.075, 0.016, M.glow, 'eye_dash');
      d.position.set(sx, EY, 0);
      return d;
    };

    const expressions: Record<string, () => void> = {
      happy() {
        clearFace();
        face.add(eye(-EX), eye(EX));
        const m = arc(0.06, 0.014, M.glow, 'mouth_smile');
        m.rotation.z = Math.PI;
        m.position.set(0, -0.05, 0);
        face.add(m);
      },
      angry() {
        clearFace();
        face.add(eye(-EX, 0.6), eye(EX, 0.6));
        const bl = bar(0.09, 0.02, M.glow, 'brow_l');
        bl.position.set(-EX, 0.075, 0);
        bl.rotation.z = -0.5;
        const br = bar(0.09, 0.02, M.glow, 'brow_r');
        br.position.set(EX, 0.075, 0);
        br.rotation.z = 0.5;
        const m = arc(0.05, 0.014, M.glow, 'mouth_frown');
        m.position.set(0, -0.075, 0);
        face.add(bl, br, m);
      },
      confused() {
        clearFace();
        face.add(eye(-EX, 1, 0.055), dashEye(EX));
        const bl = bar(0.07, 0.018, M.glow, 'brow_l');
        bl.position.set(EX, 0.08, 0);
        bl.rotation.z = 0.35;
        face.add(bl);
        const m = arc(0.03, 0.013, M.glow, 'mouth_o', Math.PI * 2);
        m.position.set(-0.02, -0.06, 0);
        face.add(m);
      },
      funny() {
        clearFace();
        face.add(dashEye(-EX), eye(EX, 1, 0.056));
        const m = arc(0.075, 0.016, M.glow, 'mouth_grin');
        m.rotation.z = Math.PI;
        m.position.set(0, -0.04, 0);
        face.add(m);
        const tongue = disc(0.02, M.glowPink, 'tongue');
        tongue.position.set(0, -0.108, 0.002);
        face.add(tongue);
      },
      broken() {
        clearFace();
        face.add(xEye(-EX), xEye(EX));
        const zz = new THREE.Group();
        zz.name = 'mouth_zigzag';
        for (let i = 0; i < 5; i++) {
          const s = bar(0.028, 0.014, M.glow, 'zz' + i);
          s.position.set(-0.05 + i * 0.025, i % 2 ? -0.06 : -0.045, 0);
          s.rotation.z = (i % 2 ? 1 : -1) * 0.6;
          zz.add(s);
        }
        face.add(zz);
        for (let i = 0; i < 3; i++) {
          const sp = disc(0.008, M.spark, 'spark' + i);
          sp.position.set(
            -0.11 + Math.random() * 0.22,
            0.08 + Math.random() * 0.05,
            0.004,
          );
          face.add(sp);
        }
      },
    };

    let current = 'happy';
    const setExpression = (name: string) => {
      current = name;
      (expressions[name] || expressions.happy)();
      qmark.visible = name === 'confused';
      head.rotation.z = name === 'confused' ? 0.12 : 0;
    };
    setExpression('happy');

    root.rotation.y = 0;
    scene.add(root);

    const pointer = { x: 0, y: 0, clientX: -1, clientY: -1, inside: false };

    // Only hovering over the face should trigger the "broken" look —
    // not the whole body.
    let hovering = false;
    let baseExpression: string = EXPRESSION_CYCLE[0];
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const faceTargets = [screen, rim, face];
    const updateHoverState = () => {
      const rect = renderer.domElement.getBoundingClientRect();
      const overCanvas =
        pointer.inside &&
        pointer.clientX >= rect.left &&
        pointer.clientX <= rect.right &&
        pointer.clientY >= rect.top &&
        pointer.clientY <= rect.bottom;
      let hit = false;
      if (overCanvas) {
        ndc.x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        hit = raycaster.intersectObjects(faceTargets, true).length > 0;
      }
      if (hit && !hovering) {
        hovering = true;
        setExpression('broken');
      } else if (!hit && hovering) {
        hovering = false;
        setExpression(baseExpression);
      }
    };

    // Reduced motion gets a static render, updated only on real pointer
    // events instead of a continuously-running animation loop.
    const renderStatic = () => {
      updateHoverState();

      let nearPlay = false;
      const target = pointTargetRef?.current;
      if (target && pointer.inside) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(pointer.clientX - cx, pointer.clientY - cy);
        nearPlay = dist < POINT_RADIUS_PX;
      }
      armR.rotation.z = nearPlay ? 1.5 : 0;
      armR.rotation.x = nearPlay ? -0.15 : 0;

      renderer.render(scene, camera);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.clientX = e.clientX;
      pointer.clientY = e.clientY;
      pointer.inside = true;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (reducedMotion) renderStatic();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      if (reducedMotion) renderStatic();
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);

    const G = 6.2;
    const jump = { active: false, vy: 0, y: 0 };
    let pointArm: 'L' | 'R' | null = null;
    let last = performance.now();
    let exprTimer = 0;
    let exprIndex = 0;
    let raf = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      if (!reducedMotion) {
        exprTimer += dt * 1000;
        if (exprTimer >= EXPRESSION_MS) {
          exprTimer = 0;
          exprIndex = (exprIndex + 1) % EXPRESSION_CYCLE.length;
          baseExpression = EXPRESSION_CYCLE[exprIndex];
          if (!hovering) setExpression(baseExpression);
        }
      }

      updateHoverState();

      let nearPlay = false;
      const target = pointTargetRef?.current;
      if (target && pointer.inside) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(pointer.clientX - cx, pointer.clientY - cy);
        nearPlay = dist < POINT_RADIUS_PX;
      }
      if (nearPlay) pointArm = 'R';
      else if (pointArm === 'R') pointArm = null;

      const bob = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.008;
      if (jump.active) {
        jump.y += jump.vy * dt;
        jump.vy -= G * dt;
        if (jump.y <= 0) {
          jump.y = 0;
          jump.active = false;
          jump.vy = 0;
        }
      }
      bot.position.y = jump.y + bob;
      const st = jump.active ? 1 + jump.vy * 0.03 : 1;
      bot.scale.x = bot.scale.z = 1 + (1 - st) * 0.5;
      bot.scale.y = st;

      // The head turns a bit more than the body does, so it feels like
      // the robot is actually watching you.
      const targetYaw = reducedMotion ? 0 : pointer.x * 0.16;
      root.rotation.y += (targetYaw - root.rotation.y) * 0.08;
      const headYaw = reducedMotion ? 0 : pointer.x * 0.3;
      const headPitch = reducedMotion ? 0 : -pointer.y * 0.2;
      head.rotation.y += (headYaw - head.rotation.y) * 0.1;
      head.rotation.x += (headPitch - head.rotation.x) * 0.1;

      legL.rotation.x += (0 - legL.rotation.x) * 0.15;
      legR.rotation.x += (0 - legR.rotation.x) * 0.15;
      bot.rotation.z += (0 - bot.rotation.z) * 0.1;

      if (pointArm === 'R') {
        armR.rotation.z += (1.5 - armR.rotation.z) * 0.2;
        armR.rotation.x += (-0.15 - armR.rotation.x) * 0.2;
      } else {
        armR.rotation.z += (0 - armR.rotation.z) * 0.15;
        armR.rotation.x += (0 - armR.rotation.x) * 0.3;
      }
      armL.rotation.z += (0 - armL.rotation.z) * 0.15;
      armL.rotation.x += (0 - armL.rotation.x) * 0.3;

      if (current === 'broken' && !reducedMotion) {
        head.rotation.z = Math.sin(t * 38) * 0.05;
        const f = 0.4 + Math.random() * 1.1;
        M.rimPink.emissiveIntensity = f;
        M.rimPurple.emissiveIntensity = f * 0.8;
        M.glow.emissiveIntensity = 0.6 + Math.random() * 1.2;
      } else if (current !== 'confused') {
        if (current !== 'broken')
          head.rotation.z += (0 - head.rotation.z) * 0.15;
        M.rimPink.emissiveIntensity = 1.25;
        M.rimPurple.emissiveIntensity = 1.25;
        M.glow.emissiveIntensity = 1.4;
      }
      if (current === 'confused' && !reducedMotion) {
        qmark.position.y = 0.3 + Math.sin(t * 3) * 0.012;
        qmark.rotation.z = Math.sin(t * 2) * 0.1;
      }

      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      renderStatic();
    } else {
      raf = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      if (reducedMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      setSize();
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.remove();
      renderer.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry?.dispose();
      });
      Object.values(M).forEach((m) => m.dispose());
    };
  }, [pointTargetRef, cx, cy, cz, tx, ty, tz]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
