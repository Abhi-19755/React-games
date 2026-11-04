import * as THREE from 'three';

// Chibi fighter modeled on the reference art: big round head, short body,
// white gi with V-neck, belt, red headband with tails, bare feet.
// Forward is +Z, feet rest on y = 0.
export const HIP = 0.56;

const SKIN = '#f9d4a8';
const HAIR = '#1f1a1d';
const STEEL = '#dfe7ef';
const WOOD = '#9a6a3a';
const GOLD = '#c9a13b';

// Shared mesh helper used by both createRig and buildWeapon
const mesh = (geo, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};

export function createRig(char, weaponDef) {
  const mats = [];
  const mat = (color, rough = 0.7, metal = 0.0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    mats.push(m);
    return m;
  };
  const gi = mat(char.gi, 0.85);
  const giShade = mat('#e2e2e2', 0.9);
  const pants = mat(char.pants, 0.85);
  const belt = mat(char.belt, 0.5);
  const band = mat(char.accent, 0.6);
  const skin = mat(SKIN, 0.6);
  const hair = mat(HAIR, 0.8);
  const eye = mat('#120c0c', 0.3);
  const wood = mat(WOOD, 0.6);
  const steel = mat(STEEL, 0.3, 0.8);
  const gold = mat(GOLD, 0.4, 0.5);
  const blush = new THREE.MeshBasicMaterial({ color: '#ff7a84', transparent: true, opacity: 0.55 });
  const mouth = new THREE.MeshBasicMaterial({ color: '#7a2a2a' });
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  // Body scale multiplier for wider characters (e.g. Sumo)
  const bs = char.bodyScale || 1.0;

  const root = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42 * bs, 28),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  root.add(shadow);

  // Hips pivot: legs and torso hang from here
  const hips = new THREE.Group();
  hips.position.y = HIP;
  root.add(hips);
  const hipBox = mesh(new THREE.BoxGeometry(0.3 * bs, 0.12, 0.22 * bs), pants, 0, 0.02, 0);
  hips.add(hipBox);

  // Torso leans from the hips
  const torso = new THREE.Group();
  hips.add(torso);
  const body = mesh(new THREE.CylinderGeometry(0.2 * bs, 0.16 * bs, 0.34, 18), gi, 0, 0.2, 0);
  body.scale.z = 0.72;
  torso.add(body);

  // V-neck lapels
  const lapelGeo = new THREE.BoxGeometry(0.04, 0.22, 0.02);
  const lapelL = mesh(lapelGeo, giShade, -0.05, 0.25, 0.13);
  lapelL.rotation.z = 0.4;
  const lapelR = mesh(lapelGeo, giShade, 0.05, 0.25, 0.13);
  lapelR.rotation.z = -0.4;
  torso.add(lapelL, lapelR);

  // Black (or colored) belt with a knot at the front
  torso.add(mesh(new THREE.BoxGeometry(0.36 * bs, 0.07, 0.25 * bs), belt, 0, 0.05, 0));
  const knotA = mesh(new THREE.BoxGeometry(0.07, 0.22, 0.03), belt, -0.03, -0.06, 0.14);
  knotA.rotation.z = 0.5;
  const knotB = mesh(new THREE.BoxGeometry(0.07, 0.22, 0.03), belt, 0.04, -0.07, 0.14);
  knotB.rotation.z = -0.4;
  torso.add(knotA, knotB);

  // Head: big and round
  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.28, 28, 20), skin));
  head.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), skin, -0.27, -0.02, 0));
  head.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), skin, 0.27, -0.02, 0));

  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.035, 12, 10), eye, s * 0.1, 0.0, 0.25));
    head.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), white, s * 0.1 + 0.012, 0.012, 0.28));
    const brow = mesh(new THREE.BoxGeometry(0.07, 0.018, 0.02), hair, s * 0.1, 0.09, 0.25);
    brow.rotation.z = -s * 0.12;
    head.add(brow);
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), blush);
    cheek.position.set(s * 0.17, -0.07, 0.245);
    head.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), mouth);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.08, 0.26);
  head.add(smile);

  // Hair by style
  if (char.hair === 'ponytail') {
    head.add(mesh(new THREE.SphereGeometry(0.26, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.02, -0.01));
    const tail = mesh(new THREE.CylinderGeometry(0.085, 0.13, 0.58, 10), hair, -0.14, -0.32, -0.08);
    tail.rotation.z = 0.7;
    const tailHang = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.18, 8), hair, -0.17, -0.58, -0.1);
    tailHang.rotation.z = 0.8;
    head.add(tail, tailHang);
    const tailFeather = mesh(new THREE.BoxGeometry(0.1, 0.03, 0.22), hair, -0.15, -0.02, -0.22);
    tailFeather.rotation.z = 1.0;
    head.add(tailFeather);
  } else if (char.hair === 'mohawk') {
    head.add(mesh(new THREE.ConeGeometry(0.075, 0.46, 6), hair, 0, 0.4, 0));
    const bandClear = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 28, 1, true), band, 0, 0.1, 0);
    bandClear.material.side = THREE.DoubleSide;
    head.add(bandClear);
    const mhTail = mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.34, 6), hair, 0.1, -0.1, 0);
    mhTail.rotation.z = Math.PI / 2;
    mhTail.position.x = 0.12;
    head.add(mhTail);
  } else if (char.hair === 'spiky') {
    head.add(mesh(new THREE.SphereGeometry(0.295, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.03, -0.01));
    const spikes = [
      [-0.12, 0.27, 0.02, 0.45],
      [0.0, 0.3, -0.02, 0],
      [0.13, 0.27, 0.02, -0.45],
      [-0.05, 0.25, 0.13, 0.2],
      [0.08, 0.25, -0.12, -0.3],
    ];
    for (const [x, y, z, rz] of spikes) {
      const cone = mesh(new THREE.ConeGeometry(0.055, 0.2, 6), hair, x, y + 0.08, z);
      cone.rotation.z = rz;
      head.add(cone);
    }
  } else if (char.hair === 'bob') {
    head.add(mesh(new THREE.SphereGeometry(0.31, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.66), hair, 0, 0.02, -0.01));
  } else if (char.hair === 'topknot') {
    head.add(mesh(new THREE.SphereGeometry(0.295, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.03, -0.01));
    head.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), hair, 0, 0.36, -0.04));
  } else if (char.hair === 'buzzcut') {
    // Short stubble: a thin hemisphere hugging the scalp
    head.add(mesh(new THREE.SphereGeometry(0.29, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 0.02, -0.01));
  }

  // Red headband with two tails trailing off the back
  const bandMesh = mesh(new THREE.CylinderGeometry(0.296, 0.296, 0.09, 28, 1, true), band, 0, 0.1, 0);
  bandMesh.material.side = THREE.DoubleSide;
  head.add(bandMesh);
  const tailGeo = new THREE.BoxGeometry(0.06, 0.035, 0.26);
  const tailA = mesh(tailGeo, band, -0.22, 0.1, -0.3);
  tailA.rotation.y = 0.5;
  tailA.rotation.x = -0.2;
  const tailB = mesh(tailGeo, band, -0.27, 0.04, -0.32);
  tailB.rotation.y = 0.9;
  head.add(tailA, tailB);

  // Arms: sleeve to the wrist, bare hands
  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.24, 0.3, 0);
    torso.add(shoulder);
    shoulder.add(mesh(new THREE.CylinderGeometry(0.07, 0.062, 0.22, 12), gi, 0, -0.11, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.22;
    shoulder.add(elbow);
    elbow.add(mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.2, 12), gi, 0, -0.1, 0));
    const hand = new THREE.Group();
    hand.position.y = -0.2;
    elbow.add(hand);
    hand.add(mesh(new THREE.SphereGeometry(0.068, 12, 10), skin, 0, -0.07, 0));
    return { shoulder, elbow, hand };
  }

  // Legs: pants, bare feet
  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1 * bs, 0, 0);
    hips.add(hip);
    hip.add(mesh(new THREE.CylinderGeometry(0.085 * bs, 0.07 * bs, 0.22, 12), pants, 0, -0.11, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.22;
    hip.add(knee);
    knee.add(mesh(new THREE.CylinderGeometry(0.07 * bs, 0.06 * bs, 0.22, 12), pants, 0, -0.11, 0));
    const ankle = new THREE.Group();
    ankle.position.y = -0.22;
    knee.add(ankle);
    const foot = mesh(new THREE.SphereGeometry(0.085 * bs, 14, 10), skin, 0, -0.08, 0.05);
    foot.scale.set(0.9, 0.5, 1.5);
    ankle.add(foot);
    return { hip, knee, ankle };
  }

  const arms = { L: arm(-1), R: arm(1) };
  const legs = { L: leg(-1), R: leg(1) };

  // Weapon hangs from the lead (right) hand
  if (weaponDef && weaponDef.type) arms.R.hand.add(buildWeapon(weaponDef, { wood, steel, gold }));

  // ---- Accessories ----
  const acc = new Set(char.accessories || []);

  // Scarf: flowing cloth around neck
  if (acc.has('scarf')) {
    const scarfMat = mat(char.accent, 0.7);
    const scarfWrap = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 14, 1, true), scarfMat, 0, 0.38, 0);
    scarfWrap.material.side = THREE.DoubleSide;
    torso.add(scarfWrap);
    // Trailing tail of scarf
    const scarfTail = mesh(new THREE.BoxGeometry(0.08, 0.28, 0.03), scarfMat, 0.14, 0.22, -0.16);
    scarfTail.rotation.z = -0.4;
    scarfTail.rotation.x = -0.3;
    torso.add(scarfTail);
    const scarfTip = mesh(new THREE.BoxGeometry(0.06, 0.18, 0.03), scarfMat, 0.18, 0.08, -0.2);
    scarfTip.rotation.z = -0.6;
    scarfTip.rotation.x = -0.4;
    torso.add(scarfTip);
  }

  // Anklets: rings around ankles
  if (acc.has('anklets')) {
    const ankletMat = mat('#c0c0c0', 0.3, 0.8);
    for (const side of [-1, 1]) {
      const legJoint = legs[side === -1 ? 'L' : 'R'];
      if (legJoint.ankle) {
        const ring = mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 16), ankletMat, 0, 0.02, 0.02);
        ring.rotation.x = Math.PI / 2;
        legJoint.ankle.add(ring);
        const ring2 = mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), ankletMat, 0, 0.06, 0.02);
        ring2.rotation.x = Math.PI / 2;
        legJoint.ankle.add(ring2);
      }
    }
  }

  // Dog tags: two small plates hanging from neck
  if (acc.has('dogTags')) {
    const tagMat = mat('#aaaaaa', 0.3, 0.9);
    // Chain
    const chain = mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 20, Math.PI), tagMat, 0, 0.38, 0.14);
    torso.add(chain);
    // Two small tag plates
    const tag1 = mesh(new THREE.BoxGeometry(0.04, 0.06, 0.008), tagMat, -0.02, 0.28, 0.16);
    const tag2 = mesh(new THREE.BoxGeometry(0.04, 0.06, 0.008), tagMat, 0.03, 0.26, 0.16);
    tag2.rotation.z = 0.15;
    torso.add(tag1, tag2);
  }

  // Arm wraps: extra geometry on forearms
  if (acc.has('armWraps')) {
    const wrapMat = mat('#d2c4a0', 0.8);
    for (const side of ['L', 'R']) {
      const elbow = arms[side].elbow;
      for (let i = 0; i < 3; i++) {
        const wrap = mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.025, 10, 1, true), wrapMat, 0, -0.04 - i * 0.05, 0);
        wrap.material.side = THREE.DoubleSide;
        elbow.add(wrap);
      }
    }
  }

  // Belly: bigger rounded torso for heavy characters
  if (acc.has('belly')) {
    const bellyMesh = mesh(new THREE.SphereGeometry(0.22, 16, 12), gi, 0, 0.14, 0.06);
    bellyMesh.scale.set(1.1, 0.9, 0.85);
    torso.add(bellyMesh);
  }

  // Thick legs: slightly wider leg cylinders added on top
  if (acc.has('thickLegs')) {
    for (const side of ['L', 'R']) {
      const hipJoint = legs[side].hip;
      const thigh = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 12), pants, 0, -0.1, 0);
      hipJoint.add(thigh);
    }
  }

  // Mask: covers lower face
  if (acc.has('mask')) {
    const maskMat = mat(char.gi, 0.7);
    const maskMesh = mesh(new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35), maskMat, 0, 0, 0);
    head.add(maskMesh);
  }

  // Hood: covers top/back of head over hair
  if (acc.has('hood')) {
    const hoodMat = mat(char.gi, 0.75);
    const hoodMesh = mesh(new THREE.SphereGeometry(0.31, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hoodMat, 0, 0.02, -0.03);
    head.add(hoodMesh);
  }

  // Shoulder armor: small protective pads
  if (acc.has('shoulderArmor')) {
    const armorMat = mat('#3a3a3a', 0.4, 0.6);
    for (const side of [-1, 1]) {
      const pad = mesh(new THREE.BoxGeometry(0.14, 0.08, 0.16), armorMat, side * 0.28, 0.34, 0);
      pad.rotation.z = side * 0.3;
      torso.add(pad);
      const rim = mesh(new THREE.BoxGeometry(0.16, 0.03, 0.18), armorMat, side * 0.3, 0.30, 0);
      rim.rotation.z = side * 0.3;
      torso.add(rim);
    }
  }

  return { root, hips, torso, head, arms, legs, mats };
}

// Glow: brilliant gold on critical hit, red when hit, gold pulse when the special bar is full
export function setGlow(rig, flash, aura, t, critFlash = 0) {
  if (critFlash > 0) {
    const k = critFlash / 16;
    for (const m of rig.mats) m.emissive.setRGB(1.5 * k, 1.2 * k, 0.4 * k);
  } else if (flash > 0) {
    const k = flash / 10;
    for (const m of rig.mats) m.emissive.setRGB(0.9 * k, 0.15 * k, 0.1 * k);
  } else if (aura) {
    const k = 0.25 + 0.2 * Math.sin(t * 9);
    for (const m of rig.mats) m.emissive.setRGB(k, k * 0.7, k * 0.1);
  } else {
    for (const m of rig.mats) m.emissive.setRGB(0, 0, 0);
  }
}

function buildWeapon(def, { wood, steel, gold }) {
  const g = new THREE.Group();
  const L = def.len * 0.012;   // game units -> world units
  const add = (geo, m, y) => {
    const o = new THREE.Mesh(geo, m);
    o.position.y = y;
    o.castShadow = true;
    g.add(o);
    return o;
  };

  if (def.type === 'knife') {
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), wood, -0.05);
    add(new THREE.BoxGeometry(0.03, L, 0.008), steel, -0.1 - L / 2);
  } else if (def.type === 'staff') {
    add(new THREE.CylinderGeometry(0.028, 0.028, L + 0.1, 8), wood, -(L + 0.1) / 2);
    add(new THREE.SphereGeometry(0.045, 8, 6), gold, -(L + 0.1));
  } else if (def.type === 'nun') {
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), wood, -0.15);
    add(new THREE.SphereGeometry(0.03, 8, 6), gold, -0.3);
    const second = new THREE.Group();
    second.position.y = -0.3;
    second.rotation.z = 0.9;
    g.add(second);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), wood);
    s2.position.y = -0.15;
    s2.castShadow = true;
    second.add(s2);
  } else if (def.type === 'sword') {
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), wood, -0.08);
    add(new THREE.BoxGeometry(0.17, 0.03, 0.05), gold, -0.17);
    add(new THREE.BoxGeometry(0.035, L, 0.01), steel, -0.18 - L / 2);
  } else if (def.type === 'tonfa') {
    const body = mesh(new THREE.BoxGeometry(0.05, 0.24, 0.06), wood, 0, 0.02, 0);
    body.rotation.z = 0.5;
    g.add(body);
    for (const px of [0.11, -0.11]) {
      const prong = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 6), steel, px, 0, 0);
      prong.rotation.z = 0.65;
      g.add(prong);
      const cap = mesh(new THREE.SphereGeometry(0.035, 8, 6), steel, px, 0.07, 0);
      g.add(cap);
    }
    const core = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), wood, 0, -0.02, 0);
    core.rotation.z = 0.3;
    g.add(core);
  }
  return g;
}
