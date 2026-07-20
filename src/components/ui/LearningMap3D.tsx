import React, { useEffect, useRef } from 'react'
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { BUS_GLB_BASE64 } from '../../data/busGlbData'
import { useThemeStore } from '../../stores/useThemeStore'

interface LearningMap3DProps {
  unlockedModuleIds: string[]
  onSubsystemSelect: (flowchartId: string) => void
}

export const LearningMap3D: React.FC<LearningMap3DProps> = ({
  unlockedModuleIds,
  onSubsystemSelect,
}) => {
  const webViewRef = useRef<WebView>(null)
  const theme = useThemeStore(state => state.theme)

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'setTheme', theme }))
    }
  }, [theme])

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'selectSubsystem') {
        onSubsystemSelect(data.flowchartId)
      }
    } catch (e) {
      console.warn('WebView message error:', e)
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Learning Map</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body, html {
      width: 100%; height: 100%; overflow: hidden; background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none; -webkit-user-select: none;
    }

    /* ── Root: vertical flex column ── */
    #root {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
    }

    /* ── Top & Bottom card strips ── */
    .strip {
      flex-shrink: 0;
      display: flex; flex-direction: row;
      gap: 5px;
      padding: 10px 8px 6px;
      z-index: 3;
      pointer-events: none;
    }
    #strip-bottom { padding: 6px 8px 10px; }

    /* ── Centre: canvas + SVG connector overlay ── */
    #mid {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
    #canvas-container { position: absolute; inset: 0; z-index: 1; }
    #svg-overlay {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none; overflow: visible; z-index: 2;
    }

    /* ── Holographic card (translucent glassmorphism) ── */
    .card {
      flex: 1;
      min-width: 0;
      pointer-events: auto;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      border-radius: 8px;
      border: 1px solid rgba(var(--cr), 0.58);
      background:
        linear-gradient(135deg, rgba(var(--cr), 0.18) 0%, rgba(3,28,35,0.90) 55%),
        rgba(3,28,35,0.88);
      box-shadow:
        0 4px 14px rgba(0,0,0,0.28),
        0 0 10px rgba(var(--cr), 0.12),
        inset 0 0 0 1px rgba(var(--cr), 0.07);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      padding: 7px 7px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      transition: box-shadow 0.2s;
    }
    .card.locked {
      cursor: default;
      border-color: rgba(120,120,120,0.30) !important;
      background: rgba(22,22,26,0.85) !important;
      box-shadow: none !important;
    }

    /* Badge + name row */
    .card-row { display: flex; align-items: center; gap: 5px; }
    .badge {
      width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0;
      border: 1.5px solid rgba(var(--cr), 0.65);
      background: rgba(var(--cr), 0.20);
      color: var(--c);
      font-size: 8.5px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .card.locked .badge {
      border-color: rgba(140,140,140,0.40);
      color: #777; background: rgba(140,140,140,0.10);
    }
    .card-name {
      font-size: 9.5px; font-weight: 700; line-height: 1.25;
      color: var(--c);
      white-space: normal; word-break: keep-all; flex: 1;
    }
    .card.locked .card-name {
      text-decoration: line-through;
      color: #666 !important;
    }
    .lock-icon { font-size: 8px; opacity: 0.65; flex-shrink: 0; }

    /* Light theme overrides */
    body.light .card {
      background:
        linear-gradient(135deg, rgba(var(--cr), 0.12) 0%, rgba(255,255,255,0.94) 55%),
        rgba(255,255,255,0.93);
      border-color: rgba(var(--cr), 0.50);
      box-shadow:
        0 2px 10px rgba(0,0,0,0.10),
        0 0 8px rgba(var(--cr), 0.10),
        inset 0 0 0 1px rgba(var(--cr), 0.05);
    }
    body.light .card.locked {
      background: rgba(240,242,245,0.94) !important;
      border-color: rgba(160,160,160,0.25) !important;
    }
    body.light .card-name { color: var(--c) !important; }
    body.light .card.locked .card-name { color: #aaa !important; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body class="${theme === 'dark' ? 'dark' : 'light'}">

<div id="root">
  <!-- TOP STRIP: systems 1-4 -->
  <div class="strip" id="strip-top"></div>

  <!-- MIDDLE: 3D canvas + SVG connectors -->
  <div id="mid">
    <div id="canvas-container"></div>
    <svg id="svg-overlay" xmlns="http://www.w3.org/2000/svg"></svg>
  </div>

  <!-- BOTTOM STRIP: systems 5-8 -->
  <div class="strip" id="strip-bottom"></div>
</div>

<script>
// ─── Subsystem data ─────────────────────────────────────────────────────────
const SYSTEMS = [
  { id:'hv_power',          name:'HV Power System',      order:1, strip:'top',    color:'#FF3B30', rgb:'255,59,48',   fid:'hv-power',         pos:{ x: 0.86, y:-0.62, z:-2.66 } },
  { id:'lv_power',          name:'LV Power System',       order:2, strip:'top',    color:'#32D583', rgb:'50,213,131',  fid:'lv-power',          pos:{ x: 0.86, y: 0.06, z: 2.64 } },
  { id:'can_bus',           name:'CAN Bus Network',        order:3, strip:'top',    color:'#38BDF8', rgb:'56,189,248',  fid:'can-bus',           pos:{ x: 0,    y:-0.50, z: 3.20 } },
  { id:'hv_aux',            name:'HV Auxiliary Network',   order:4, strip:'top',    color:'#FF5C8A', rgb:'255,92,138',  fid:'hv-aux',            pos:{ x:-0.98, y:-0.18, z:-2.20 } },
  { id:'regen_braking',     name:'Regenerative Braking',   order:5, strip:'bottom', color:'#FB923C', rgb:'251,146,60',  fid:'regen-braking',     pos:{ x: 0.92, y:-0.68, z:-1.72 } },
  { id:'propulsion_system', name:'Propulsion System',      order:6, strip:'bottom', color:'#FACC15', rgb:'250,204,21',  fid:'propulsion',        pos:{ x:-0.82, y:-0.72, z:-1.18 } },
  { id:'overall_power',     name:'Overall Power System',   order:7, strip:'bottom', color:'#A78BFA', rgb:'167,139,250', fid:'overall-power',     pos:{ x:-0.18, y: 0.18, z: 0.02 } },
  { id:'pneumatics',        name:'Pneumatic Systems',      order:8, strip:'bottom', color:'#64748B', rgb:'100,116,139', fid:'pneumatic',         pos:{ x:-0.80, y:-0.66, z: 2.20 } },
];

const UNLOCKED = ${JSON.stringify(unlockedModuleIds)};

// ─── Build cards & SVG elements ─────────────────────────────────────────────
const stripTop    = document.getElementById('strip-top');
const stripBottom = document.getElementById('strip-bottom');
const svg         = document.getElementById('svg-overlay');

// SVG defs: glow filters
const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
SYSTEMS.forEach(sys => {
  const f = document.createElementNS('http://www.w3.org/2000/svg','filter');
  f.setAttribute('id','gf-'+sys.id);
  f.setAttribute('x','-100%'); f.setAttribute('y','-100%');
  f.setAttribute('width','300%'); f.setAttribute('height','300%');
  const blur = document.createElementNS('http://www.w3.org/2000/svg','feGaussianBlur');
  blur.setAttribute('stdDeviation','3.5'); blur.setAttribute('result','b');
  const merge = document.createElementNS('http://www.w3.org/2000/svg','feMerge');
  ['b','SourceGraphic'].forEach(r => {
    const n = document.createElementNS('http://www.w3.org/2000/svg','feMergeNode');
    n.setAttribute('in',r); merge.appendChild(n);
  });
  f.appendChild(blur); f.appendChild(merge);
  defs.appendChild(f);
});
svg.appendChild(defs);

const paths = {}, glows = {};

SYSTEMS.forEach(sys => {
  const unlocked = UNLOCKED.includes(sys.fid);
  const strip = sys.strip === 'top' ? stripTop : stripBottom;

  // Card element
  const card = document.createElement('div');
  card.className = 'card' + (unlocked ? '' : ' locked');
  card.id = 'card-' + sys.id;
  card.style.setProperty('--c', sys.color);
  card.style.setProperty('--cr', sys.rgb);
  card.innerHTML =
    '<div class="card-row">' +
      '<span class="badge">' + sys.order + '</span>' +
      '<span class="card-name">' + sys.name + '</span>' +
      (unlocked ? '' : '<span class="lock-icon">🔒</span>') +
    '</div>';
  if (unlocked) {
    card.addEventListener('click', () => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type:'selectSubsystem', id:sys.id, flowchartId:sys.fid })
      );
    });
  }
  strip.appendChild(card);

  // SVG bezier connector path
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('stroke', sys.color);
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('fill', 'none');
  path.setAttribute('opacity', '0');
  if (!unlocked) path.setAttribute('stroke-dasharray', '5 3');
  svg.appendChild(path);
  paths[sys.id] = path;

  // SVG glow dot at 3D anchor
  const glow = document.createElementNS('http://www.w3.org/2000/svg','circle');
  glow.setAttribute('r', '5');
  glow.setAttribute('fill', sys.color);
  glow.setAttribute('opacity', '0');
  glow.setAttribute('filter', 'url(#gf-' + sys.id + ')');
  svg.appendChild(glow);
  glows[sys.id] = glow;
});

// ─── Three.js scene ─────────────────────────────────────────────────────────
const DARK = {
  bg:new THREE.Color('#0f1215'), fog:new THREE.Color('#0f1215'), fogD:0.034,
  edge:new THREE.Color('#00E5FF'), edgeO:0.80,
  body:new THREE.Color('#0e4a5c'), bodyO:0.38,
};
const LIGHT = {
  bg:new THREE.Color('#F4F7FA'), fog:new THREE.Color('#EDF2FA'), fogD:0.029,
  edge:new THREE.Color('#1E293B'), edgeO:0.88,
  body:new THREE.Color('#EFF4FB'), bodyO:0.36,
};
const pal = () => document.body.classList.contains('dark') ? DARK : LIGHT;

const container = document.getElementById('canvas-container');
const P = pal();

const scene    = new THREE.Scene();
scene.fog      = new THREE.FogExp2(P.fog.getHex(), P.fogD);

const camera   = new THREE.PerspectiveCamera(40, container.clientWidth/container.clientHeight, 0.1, 100);
camera.position.set(4.6, 2.5, 6.2);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(P.bg, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.sortObjects = true;
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 3.2;   controls.maxDistance = 8.5;
controls.minPolarAngle = 0.4; controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, -0.04, 0);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const kl = new THREE.DirectionalLight(0xffffff, 0.7);
kl.position.set(2.2, 4, 3.5); scene.add(kl);

const modelRoot = new THREE.Group(); scene.add(modelRoot);

// Invisible anchor trackers (3D positions only — dots drawn via SVG)
const anchorMat = new THREE.MeshBasicMaterial({ transparent:true, opacity:0 });
const anchorGeo = new THREE.SphereGeometry(0.001, 4, 4);
const dotMeshes = {};
SYSTEMS.forEach(sys => {
  const m = new THREE.Mesh(anchorGeo, anchorMat);
  m.position.set(sys.pos.x, sys.pos.y, sys.pos.z);
  modelRoot.add(m); dotMeshes[sys.id] = m;
});

// Material factories
const mkPre  = () => { const m = new THREE.MeshBasicMaterial({ colorWrite:false, depthWrite:false, side:THREE.DoubleSide }); m.polygonOffset=true; m.polygonOffsetFactor=1; m.polygonOffsetUnits=1; return m; };
const mkEdge = p => new THREE.LineBasicMaterial({ color:p.edge, transparent:true, opacity:p.edgeO, depthWrite:false });
const mkBody = p => new THREE.MeshStandardMaterial({ color:p.body, roughness:0.8, metalness:0.1, transparent:true, opacity:p.bodyO, depthWrite:false, side:THREE.DoubleSide });

let edgeMats=[], bodyMats=[], modelReady=false;

new THREE.GLTFLoader().load(
  'data:application/octet-stream;base64,${BUS_GLB_BASE64}',
  gltf => {
    const bs  = gltf.scene;
    const box = new THREE.Box3().setFromObject(bs);
    const sz  = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const sc  = 5.8 / Math.max(sz.x, sz.y, sz.z);
    bs.position.set(-ctr.x*sc, -ctr.y*sc, -ctr.z*sc);
    bs.scale.setScalar(sc);
    if (sz.x > sz.z) bs.rotation.y = Math.PI/2;

    const p = pal();
    bs.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.material) [].concat(node.material).forEach(m=>m.dispose());
      node.material = mkPre(); node.renderOrder = 0;
      node.castShadow = false; node.receiveShadow = false;
      if (node.geometry) {
        const em = mkEdge(p); edgeMats.push(em);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,15), em);
        e.renderOrder = 2; node.add(e);
      }
    });
    const clone = bs.clone();
    clone.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.children.filter(c=>c instanceof THREE.LineSegments).forEach(c=>node.remove(c));
      const bm = mkBody(p); bodyMats.push(bm);
      node.material = bm; node.renderOrder = 1;
    });
    modelRoot.add(bs, clone);
    modelReady = true;
  },
  undefined, e => console.error(e)
);

// ─── Connector updater ──────────────────────────────────────────────────────
const mid = document.getElementById('mid');

const updateConnectors = () => {
  const cw  = container.clientWidth;
  const ch  = container.clientHeight;
  const midRect = mid.getBoundingClientRect();

  SYSTEMS.forEach(sys => {
    const path = paths[sys.id];
    const glow = glows[sys.id];
    const card = document.getElementById('card-' + sys.id);
    const dot  = dotMeshes[sys.id];
    if (!path || !glow || !card || !dot) return;

    // 3D anchor → canvas-local 2D
    const wp = new THREE.Vector3();
    dot.getWorldPosition(wp);
    const pr = wp.clone().project(camera);
    const inView = pr.z > -1 && pr.z < 1 && Math.abs(pr.x) < 1.2 && Math.abs(pr.y) < 1.2;
    if (!modelReady || !inView) { path.setAttribute('opacity','0'); glow.setAttribute('opacity','0'); return; }

    const dotX = (pr.x * 0.5 + 0.5) * cw;
    const dotY = (-(pr.y * 0.5) + 0.5) * ch;

    // Card edge: bottom-center for top strip, top-center for bottom strip
    const cr = card.getBoundingClientRect();
    const cardCX = (cr.left + cr.right) * 0.5 - midRect.left;
    let cardCY;
    if (sys.strip === 'top') {
      cardCY = cr.bottom - midRect.top;   // bottom edge of top card
    } else {
      cardCY = cr.top - midRect.top;      // top edge of bottom card
    }

    // Cubic bezier: control points bow vertically
    const tension = Math.abs(dotY - cardCY) * 0.42;
    let d;
    if (sys.strip === 'top') {
      // top card bottom → dot: controls pull downward
      d = \`M\${cardCX.toFixed(1)},\${cardCY.toFixed(1)} C\${cardCX.toFixed(1)},\${(cardCY+tension).toFixed(1)} \${dotX.toFixed(1)},\${(dotY-tension*0.5).toFixed(1)} \${dotX.toFixed(1)},\${dotY.toFixed(1)}\`;
    } else {
      // bottom card top → dot: controls pull upward
      d = \`M\${cardCX.toFixed(1)},\${cardCY.toFixed(1)} C\${cardCX.toFixed(1)},\${(cardCY-tension).toFixed(1)} \${dotX.toFixed(1)},\${(dotY+tension*0.5).toFixed(1)} \${dotX.toFixed(1)},\${dotY.toFixed(1)}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('opacity', '0.65');
    glow.setAttribute('cx', dotX.toFixed(1));
    glow.setAttribute('cy', dotY.toFixed(1));
    glow.setAttribute('opacity', '0.95');
  });
};

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
});

// ─── Theme switch ────────────────────────────────────────────────────────────
const applyTheme = name => {
  document.body.className = name === 'dark' ? 'dark' : 'light';
  const p = pal();
  scene.fog.color.copy(p.fog); scene.fog.density = p.fogD;
  renderer.setClearColor(p.bg, 0);
  edgeMats.forEach(m => { m.color.copy(p.edge); m.opacity = p.edgeO; });
  bodyMats.forEach(m => { m.color.copy(p.body); m.opacity = p.bodyO; });
};
window.addEventListener('message', ev => {
  try { const d=JSON.parse(ev.data); if(d.type==='setTheme') applyTheme(d.theme); } catch(e){}
});

// ─── Animation loop ──────────────────────────────────────────────────────────
const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  modelRoot.updateMatrixWorld();
  renderer.render(scene, camera);
  updateConnectors();
};
animate();
</script>
</body>
</html>`

  return (
    <View style={[styles.container, theme === 'dark' ? styles.dark : styles.light]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        scrollEnabled={false}
        onMessage={handleMessage}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={[styles.loaderText, theme === 'dark' && styles.loaderTextDark]}>
              Initializing 3D Space…
            </Text>
          </View>
        )}
        startInLoadingState={true}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Vertical rectangle: taller than wide
    height: 520,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 8,
  },
  dark: {
    backgroundColor: '#0f1215',
    borderColor: 'rgba(0,229,255,0.12)',
  },
  light: {
    backgroundColor: '#f4f7fa',
    borderColor: '#dde3ec',
  },
  webview: { backgroundColor: 'transparent' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText:     { marginTop: 12, fontSize: 14, color: '#666', fontWeight: '600' },
  loaderTextDark: { color: '#aaa' },
})
