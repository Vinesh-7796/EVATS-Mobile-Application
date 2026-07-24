import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { HV_FLOWCHART_SVG_BASE64 } from '../../data/flowchartData'
import type { ComponentDetail } from '../../types'
import { useThemeStore } from '../../stores/useThemeStore'

export interface FlowchartViewerHandle {
  selectComponent: (componentId: string) => void
}

interface FlowchartViewerProps {
  components: ComponentDetail[]
  onComponentPress?: (componentId: string) => void
  onContentHeight?: (height: number) => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

// Domain accent colours — kept in sync with Windows version
const DOMAIN_ACCENT_COLORS: Record<string, string> = {
  HV: '#F97316',
  LV: '#2563EB',
  CAN: '#16A34A',
  Thermal: '#0891B2',
  Safety: '#DC2626',
  Control: '#8B5CF6',
  Ground: '#64748B',
  'Hydraulic / Mechanical': '#8B5CF6',
  'Powertrain / Drivetrain': '#F97316',
}

// Industrial standard wire colors:
//   HV DC  → #F97316  (orange)
//   HV AC  → #2563EB  (blue)
// The SVG uses black (#000000) for HV DC edges and the blue light-dark() for AC.
// We re-apply the correct colors via JS after SVG injection.

// SVG cell IDs mapped to component IDs
const COMPONENT_CELL_MAP: Record<string, string[]> = {
  'ac-dc-charging-station': ['3qHOZeVK11j_1dg9K6C2-31'],
  'ccs2-charger': ['3qHOZeVK11j_1dg9K6C2-33'],
  'junction-box': ['3qHOZeVK11j_1dg9K6C2-34', '3qHOZeVK11j_1dg9K6C2-4'],
  'hv-pdb': ['3qHOZeVK11j_1dg9K6C2-6', '3qHOZeVK11j_1dg9K6C2-38'],
  'hv-battery-system': ['3qHOZeVK11j_1dg9K6C2-8', '3qHOZeVK11j_1dg9K6C2-41'],
  'mcu': ['3qHOZeVK11j_1dg9K6C2-17'],
  'traction-motor': ['3qHOZeVK11j_1dg9K6C2-18'],
}

// Edge (flow-line) cell IDs that carry HV AC current (MCU → Traction Motor 6-phase + AC Legend)
const HV_AC_EDGE_IDS = new Set([
  '3qHOZeVK11j_1dg9K6C2-20',
  '3qHOZeVK11j_1dg9K6C2-21',
  '3qHOZeVK11j_1dg9K6C2-22',
  '3qHOZeVK11j_1dg9K6C2-23',
  '3qHOZeVK11j_1dg9K6C2-24',
  '3qHOZeVK11j_1dg9K6C2-54', // 6th AC line
  '3qHOZeVK11j_1dg9K6C2-26', // Legend line next to "HV AC CABLE"
])

// Edge (flow-line) cell IDs that carry HV DC current
const HV_DC_EDGE_IDS = new Set([
  '3qHOZeVK11j_1dg9K6C2-5',
  '3qHOZeVK11j_1dg9K6C2-7',
  '3qHOZeVK11j_1dg9K6C2-29', // Legend line next to "HV DC CABLE"
  '3qHOZeVK11j_1dg9K6C2-32',
  '3qHOZeVK11j_1dg9K6C2-35', // Charging station to CCS2
  '3qHOZeVK11j_1dg9K6C2-36',
  '3qHOZeVK11j_1dg9K6C2-37',
  '3qHOZeVK11j_1dg9K6C2-40',
  '3qHOZeVK11j_1dg9K6C2-50',
  '3qHOZeVK11j_1dg9K6C2-52',
  '3qHOZeVK11j_1dg9K6C2-53',
])


// Local image map — resolves component.image → require()
const IMAGE_MAP: Record<string, ReturnType<typeof require>> = {
  'MCU.png':           require('../../../assets/images/MCU.png'),
  'JunctionBox.png':   require('../../../assets/images/JunctionBox.png'),
  'Charger.png':       require('../../../assets/images/Charger.png'),
  'CCS2Charger.png':   require('../../../assets/images/CCS2Charger.png'),
  'BatteryPack.png':   require('../../../assets/images/BatteryPack.png'),
  'PDB.png':           require('../../../assets/images/PDB.png'),
  'TractionMotor.png': require('../../../assets/images/TractionMotor.png'),
}

const FlowchartViewer = forwardRef<FlowchartViewerHandle, FlowchartViewerProps>(function FlowchartViewer(
  { components, onComponentPress, onContentHeight }: FlowchartViewerProps,
  ref
) {
  const [loading, setLoading] = useState(true)
  const [selectedComponent, setSelectedComponent] = useState<ComponentDetail | null>(null)
  const webViewRef = useRef<WebView>(null)

  // Build reverse lookup: cellId → componentId
  const cellIdToComponentId: Record<string, string> = {}
  for (const [compId, cellIds] of Object.entries(COMPONENT_CELL_MAP)) {
    for (const cellId of cellIds) {
      cellIdToComponentId[cellId] = compId
    }
  }

  // Build component domain map for accent colours
  const componentDomainMap: Record<string, string> = {}
  for (const comp of components) {
    componentDomainMap[comp.id] = comp.domain
  }

  const generateHTML = useCallback((isDarkTheme: boolean) => {
    const cellMapJson = JSON.stringify(cellIdToComponentId)
    const domainMapJson = JSON.stringify(componentDomainMap)
    const accentColorsJson = JSON.stringify(DOMAIN_ACCENT_COLORS)
    const hvAcEdgeIds = JSON.stringify(Array.from(HV_AC_EDGE_IDS))
    const hvDcEdgeIds = JSON.stringify(Array.from(HV_DC_EDGE_IDS))

    return `<!DOCTYPE html>
<html${isDarkTheme ? ' style="color-scheme: dark;"' : ''}>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      min-height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: transparent;
      color-scheme: ${isDarkTheme ? 'dark' : 'light'};
    }
    .flowchart-container {
      padding: 12px;
      min-height: 100%;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 12px;
      border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.08)' : '#E2E8F0'};
      background: ${isDarkTheme ? '#252525' : '#ffffff'} !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      color-scheme: ${isDarkTheme ? 'dark' : 'light'};
    }

    /* ── Highlight box (mirrors Windows CSS) ── */
    .flowchart-component-highlight {
      opacity: 0;
      pointer-events: none;
    }
    .flowchart-component-highlight-selected {
      stroke-width: 3;
      stroke-opacity: 1;
      fill-opacity: 0.08;
    }
    .flowchart-component-highlight.is-active {
      opacity: 1;
      animation: pulse-selected 2.5s ease-in-out infinite;
    }
    @keyframes pulse-selected {
      0%, 100% { stroke-opacity: 0.9; fill-opacity: 0.06; }
      50%       { stroke-opacity: 1;   fill-opacity: 0.12; }
    }

    /* ── Hit zones ── */
    .hit-zone { cursor: pointer; }

    /* ── Prevent text/shapes inside cell groups from blocking hit-zones ── */
    g[data-cell-id] text,
    g[data-cell-id] tspan,
    g[data-cell-id] foreignObject,
    g[data-cell-id] foreignObject * {
      pointer-events: none !important;
      user-select: none !important;
    }
  </style>
</head>
<body>
  <div class="flowchart-container" id="container"></div>
  <script>
    // ── 1. Decode and inject SVG ──────────────────────────────────────────
    var b64 = "${HV_FLOWCHART_SVG_BASE64}";
    var svgString = decodeURIComponent(escape(atob(b64)));
    var isDarkTheme = ${isDarkTheme};

    // Resolve light-dark() in the source markup before the SVG is parsed.
    // Android WebView does not consistently resolve it for HTML embedded in
    // foreignObject labels, so post-render CSS overrides are not sufficient.
    function resolveLightDarkFunctions(markup) {
      var functionName = "light-dark(";
      var result = "";
      var cursor = 0;
      var start;

      while ((start = markup.indexOf(functionName, cursor)) !== -1) {
        result += markup.slice(cursor, start);

        var depth = 1;
        var end = start + functionName.length;
        while (end < markup.length && depth > 0) {
          var character = markup.charAt(end);
          if (character === "(") depth++;
          if (character === ")") depth--;
          end++;
        }

        if (depth !== 0) {
          result += markup.slice(start);
          return result;
        }

        var content = markup.slice(start + functionName.length, end - 1);
        var colors = [];
        var color = "";
        var colorDepth = 0;
        for (var index = 0; index < content.length; index++) {
          var colorCharacter = content.charAt(index);
          if (colorCharacter === "(") colorDepth++;
          else if (colorCharacter === ")") colorDepth--;

          if (colorCharacter === "," && colorDepth === 0) {
            colors.push(color.trim());
            color = "";
          } else {
            color += colorCharacter;
          }
        }
        colors.push(color.trim());

        result += colors.length >= 2
          ? (isDarkTheme ? colors[1] : colors[0])
          : markup.slice(start, end);
        cursor = end;
      }

      return result + markup.slice(cursor);
    }

    svgString = resolveLightDarkFunctions(svgString);
    var container = document.getElementById("container");
    container.innerHTML = svgString;

    var svgEl = document.querySelector("svg");
    if (svgEl) {
      svgEl.style.width = "100%";
      svgEl.style.height = "auto";
      svgEl.style.removeProperty("background");
      svgEl.style.removeProperty("background-color");
      if (${isDarkTheme}) {
        svgEl.style.setProperty("color-scheme", "dark");
      }
    }

    // ── 2. Industrial-standard flowline color coding ──────────────────────
    //   HV DC  → orange  #F97316
    //   HV AC  → blue    #2563EB
    var HV_DC_COLOR = "#F97316";
    var HV_AC_COLOR = "#2563EB";
    var hvAcEdgeIds = new Set(${hvAcEdgeIds});
    var hvDcEdgeIds = new Set(${hvDcEdgeIds});

    // Process every edge group
    svgEl && svgEl.querySelectorAll("g[data-cell-id]").forEach(function(group) {
      var cellId = group.getAttribute("data-cell-id");
      if (!cellId) return;

      var isAcEdge = hvAcEdgeIds.has(cellId);
      var isDcEdge = hvDcEdgeIds.has(cellId);

      // If it's a flowline/legend line mapped explicitly, color it perfectly
      if (isAcEdge || isDcEdge) {
        var targetColor = isAcEdge ? HV_AC_COLOR : HV_DC_COLOR;

        group.querySelectorAll("path, line, polyline, polygon").forEach(function(el) {
          el.setAttribute("stroke", targetColor);
          el.style.stroke = targetColor;

          var fill = (el.getAttribute("fill") || "").toLowerCase().trim();
          if (fill !== "none" && fill !== "") {
            el.setAttribute("fill", targetColor);
            el.style.fill = targetColor;
          }
        });
      }
    });

    // ── 3. Handle light-dark() CSS color schemes (Manual JS fallback for WebView compatibility) ──
    // Step A: Preserve signal colors (force colored lines/borders to stay colored)
    svgEl && svgEl.querySelectorAll("path[style*='light-dark'], line[style*='light-dark'], polyline[style*='light-dark'], polygon[style*='light-dark']").forEach(function(el) {
      ["stroke", "fill"].forEach(function(prop) {
        var rawStyle = el.getAttribute("style") || "";
        var propRe = new RegExp(prop + ":\\\\s*(light-dark\\\\((?:[^()]*\\\\([^()]*\\\\)\\\\s*,?\\\\s*)*\\\\))", "i");
        var m = rawStyle.match(propRe);
        if (!m) return;
        var ldMatch = m[1].match(/light-dark\\(\\s*((?:rgb\\([^)]*\\)|#[0-9a-fA-F]{3,6}|[^,]+))\\s*,\\s*((?:rgb\\([^)]*\\)|#[0-9a-fA-F]{3,6}|[^)]+))\\s*\\)/i);
        if (!ldMatch) return;
        var lightColor = ldMatch[1].trim(), darkColor = ldMatch[2].trim();
        function isGray(c) {
          var hex = c.replace(/^#/, "");
          if (hex.length === 3) { hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; }
          if (hex.length === 6) {
            var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
            return r === g && g === b;
          }
          var rgbM = c.match(/rgb\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)/i);
          if (rgbM) { return rgbM[1]===rgbM[2] && rgbM[2]===rgbM[3]; }
          return true;
        }
        if (isGray(lightColor) && isGray(darkColor)) return; // Let container boxes and neutral colors adapt
        var forced = !isGray(lightColor) ? lightColor : darkColor;
        el.setAttribute(prop, forced);
        el.style[prop] = forced;
        var newStyle = rawStyle.replace(
          new RegExp(prop + ":\\\\s*light-dark\\\\((?:[^()]*\\\\([^()]*\\\\)\\\\s*,?\\\\s*)*\\\\)", "i"),
          prop + ": " + forced
        );
        el.setAttribute("style", newStyle);
      });
    });

    // Step B: Resolve all remaining light-dark() variables manually (e.g. rect backgrounds, text)
    if (svgEl) {
      svgEl.querySelectorAll("[style*='light-dark'], [fill*='light-dark'], [stroke*='light-dark']").forEach(function(el) {
        var rawStyle = el.getAttribute("style") || "";
        // SVG text commonly uses fill, while draw.io foreignObject labels use
        // CSS color. Android WebView does not reliably resolve light-dark().
        ["fill", "stroke", "color"].forEach(function(prop) {
          var ldValue = null;
          var source = "style";
          
          var propRe = new RegExp(prop + "\\\\s*:\\\\s*(light-dark\\\\((?:[^()]*\\\\([^()]*\\\\)\\\\s*,?\\\\s*)*\\\\))", "i");
          var m = rawStyle.match(propRe);
          if (m) {
            ldValue = m[1];
          } else {
            var attrVal = el.getAttribute(prop) || "";
            if (attrVal.indexOf("light-dark") !== -1) {
              ldValue = attrVal;
              source = "attr";
            }
          }
          if (!ldValue) return;

          var content = ldValue.substring(11, ldValue.length - 1);
          var parts = [];
          var current = "";
          var depth = 0;
          for (var i = 0; i < content.length; i++) {
            var char = content[i];
            if (char === '(') depth++;
            else if (char === ')') depth--;
            
            if (char === ',' && depth === 0) {
              parts.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          parts.push(current.trim());

          if (parts.length >= 2) {
            var lightColor = parts[0];
            var darkColor = parts[1];
            var resolvedColor = ${isDarkTheme} ? darkColor : lightColor;
            
            el.setAttribute(prop, resolvedColor);
            el.style[prop] = resolvedColor;
            
            if (source === "style") {
              rawStyle = rawStyle.replace(ldValue, resolvedColor);
            }
          }
        });
        if (rawStyle) {
          el.setAttribute("style", rawStyle);
        }
      });
    }

    // ── 4. Build hit zones + highlight rects ─────────────────────────────
    var cellMap   = ${cellMapJson};
    var domainMap = ${domainMapJson};
    var accentMap = ${accentColorsJson};

    var hitLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    hitLayer.setAttribute("class", "flowchart-hit-zones");
    if (svgEl) svgEl.appendChild(hitLayer);

    var activeHighlights = [];
    function clearHighlights() {
      activeHighlights.forEach(function(r) { r.classList.remove("is-active"); });
      activeHighlights = [];
    }
    function applyHighlights(componentId) {
      var rects = svgEl.querySelectorAll('.flowchart-component-highlight-selected[data-component-id="' + componentId + '"]');
      rects.forEach(function(r) { r.classList.add("is-active"); activeHighlights.push(r); });
    }
    function safeGetBBox(el) {
      try { return el.getBBox(); } catch(e) { return null; }
    }
    function getAccentColor(componentId) {
      var domain = domainMap[componentId] || "Control";
      return accentMap[domain] || accentMap["Control"] || "#8B5CF6";
    }
    function createHighlightRect(componentId, x, y, w, h) {
      var pad = 8, accent = getAccentColor(componentId);
      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x",      String(x - pad));
      rect.setAttribute("y",      String(y - pad));
      rect.setAttribute("width",  String(w + pad * 2));
      rect.setAttribute("height", String(h + pad * 2));
      rect.setAttribute("rx", "10"); rect.setAttribute("ry", "10");
      rect.setAttribute("stroke", accent);
      rect.setAttribute("stroke-linecap", "round");
      rect.setAttribute("fill", accent);
      rect.setAttribute("pointer-events", "none");
      rect.setAttribute("data-component-id", componentId);
      rect.classList.add("flowchart-component-highlight", "flowchart-component-highlight-selected");
      return rect;
    }

    Object.keys(cellMap).forEach(function(cellId) {
      var componentId = cellMap[cellId];
      var groups = svgEl.querySelectorAll("g[data-cell-id='" + cellId + "']");
      groups.forEach(function(group) {
        var bestBBox = null;
        var shapes = group.querySelectorAll("rect, path, ellipse, polygon, image");
        for (var i = 0; i < shapes.length; i++) {
          var s = shapes[i];
          if (s.tagName === "rect" && s.getAttribute("fill") === "none" && s.getAttribute("stroke") === "none") {
            if (!bestBBox && s.getAttribute("pointer-events") === "all") {
              var w = parseFloat(s.getAttribute("width") || "0");
              var h = parseFloat(s.getAttribute("height") || "0");
              if (w > 0 && h > 0) { bestBBox = safeGetBBox(s); }
            }
            continue;
          }
          var b = safeGetBBox(s);
          if (b && b.width > 0 && b.height > 0) { bestBBox = b; break; }
        }
        if (!bestBBox) bestBBox = safeGetBBox(group);
        if (!bestBBox || bestBBox.width <= 0 || bestBBox.height <= 0) return;

        var vb = svgEl.viewBox.baseVal;
        var svgArea = (vb.width > 0 && vb.height > 0) ? vb.width * vb.height : svgEl.clientWidth * svgEl.clientHeight;
        if (svgArea > 0 && (bestBBox.width * bestBBox.height) > svgArea * 0.45) return;

        var hitZone = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hitZone.setAttribute("x",            String(bestBBox.x));
        hitZone.setAttribute("y",            String(bestBBox.y));
        hitZone.setAttribute("width",        String(bestBBox.width));
        hitZone.setAttribute("height",       String(bestBBox.height));
        hitZone.setAttribute("fill",         "#ffffff");
        hitZone.setAttribute("fill-opacity", "0");
        hitZone.setAttribute("stroke",       "none");
        hitZone.setAttribute("pointer-events", "all");
        hitZone.classList.add("hit-zone");

        var highlight = createHighlightRect(componentId, bestBBox.x, bestBBox.y, bestBBox.width, bestBBox.height);

        hitZone.addEventListener("click", function(e) {
          e.stopPropagation();
          clearHighlights();
          applyHighlights(componentId);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "componentClick", componentId: componentId }));
          }
        });

        hitLayer.appendChild(highlight);
        hitLayer.appendChild(hitZone);
      });
    });

    function reportHeight() {
      var svg = document.querySelector("svg");
      var h = svg ? (svg.getBoundingClientRect().height + 24) : document.body.scrollHeight;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'contentHeight', height: Math.ceil(h) })
        );
      }
    }

    window.addEventListener("load", reportHeight);
    window.addEventListener("resize", reportHeight);
    setTimeout(reportHeight, 150);
  </script>
</body>
</html>`
  }, [])

  const handleLoad = () => {
    setLoading(false)
    // Measure actual rendered SVG bounding height + padding and report to parent
    webViewRef.current?.injectJavaScript(`
      (function() {
        var svg = document.querySelector("svg");
        var h = svg ? (svg.getBoundingClientRect().height + 24) : document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'contentHeight', height: h })
        );
      })();
      true;
    `)
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'contentHeight' && data.height) {
        onContentHeight?.(Math.ceil(data.height))
      } else if (data.type === 'componentClick' && data.componentId) {
        const component = components.find(c => c.id === data.componentId)
        if (component) {
          setSelectedComponent(component)
          onComponentPress?.(data.componentId)
        }
      }
    } catch (_e) {}
  }

  const handleComponentTap = (component: ComponentDetail) => {
    setSelectedComponent(component)
    onComponentPress?.(component.id)
    webViewRef.current?.injectJavaScript(`
      (function() {
        clearHighlights();
        applyHighlights(${JSON.stringify(component.id)});
      })();
      true;
    `)
  }

  // Expose selectComponent so parent list can drive highlight + modal
  useImperativeHandle(ref, () => ({
    selectComponent: (componentId: string) => {
      const component = components.find(c => c.id === componentId)
      if (component) handleComponentTap(component)
    },
  }))

  const getAccentColor = (domain?: string) =>
    DOMAIN_ACCENT_COLORS[domain ?? ''] ?? '#F97316'

  const getComponentImage = (imageName?: string) => {
    if (!imageName) return null
    return IMAGE_MAP[imageName] ?? null
  }

  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {loading && (
        <View style={[styles.loadingOverlay, isDark && styles.loadingOverlayDark]}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={[styles.loadingText, isDark && styles.textLightDark]}>Loading Flowchart...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: generateHTML(isDark) }}
        style={[styles.webview, isDark && styles.webviewDark]}
        onLoad={handleLoad}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        bounces={true}
        overScrollMode="always"
        containerStyle={[styles.webviewContainer, isDark && styles.webviewContainerDark]}
      />




      {/* Component detail modal */}
      <Modal
        visible={!!selectedComponent}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedComponent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            {selectedComponent && (
              <>
                {/* Accent top bar */}
                <View style={[styles.modalAccentBar, { backgroundColor: getAccentColor(selectedComponent.domain) }]} />

                {/* Header */}
                <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.domainBadge, { backgroundColor: getAccentColor(selectedComponent.domain) + '18' }]}>
                      <Text style={[styles.domainBadgeText, { color: getAccentColor(selectedComponent.domain) }]}>
                        {selectedComponent.domain}
                      </Text>
                    </View>
                    <Text style={[styles.modalTitle, isDark && styles.textLightDark]}>{selectedComponent.name}</Text>
                  </View>
                  <TouchableOpacity style={[styles.closeButton, isDark && styles.closeButtonDark]} onPress={() => setSelectedComponent(null)}>
                    <Text style={[styles.closeButtonText, isDark && styles.textLightDark]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                  {/* ── Component Image ─────────────────────────────── */}
                  {selectedComponent.image && getComponentImage(selectedComponent.image) && (
                    <View style={[styles.imageContainer, isDark && styles.imageContainerDark]}>
                      <Image
                        source={getComponentImage(selectedComponent.image)!}
                        style={[styles.componentImage, isDark && styles.componentImageDark]}
                        resizeMode="contain"
                      />
                      <View style={[styles.imageBadge, { backgroundColor: getAccentColor(selectedComponent.domain) + '14' }]}>
                        <View style={[styles.imageBadgeDot, { backgroundColor: getAccentColor(selectedComponent.domain) }]} />
                        <Text style={[styles.imageBadgeText, { color: getAccentColor(selectedComponent.domain) }]}>
                          {selectedComponent.name}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  <Text style={[styles.description, isDark && styles.textLightDark]}>{selectedComponent.description}</Text>

                  {selectedComponent.detailedNotes && (
                    <DetailSection
                      label="Detailed Notes"
                      value={selectedComponent.detailedNotes}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.cableType && (
                    <CableTypeSection
                      value={selectedComponent.cableType}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.communicationType && (
                    <DetailSection
                      label="Communication"
                      value={selectedComponent.communicationType}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.upstream && selectedComponent.upstream.length > 0 && (
                    <DetailSection
                      label="Upstream"
                      value={selectedComponent.upstream.join(', ')}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.downstream && selectedComponent.downstream.length > 0 && (
                    <DetailSection
                      label="Downstream"
                      value={selectedComponent.downstream.join(', ')}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.diagnostics && (
                    <DetailSection
                      label="Diagnostics"
                      value={selectedComponent.diagnostics}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.relatedSystems && selectedComponent.relatedSystems.length > 0 && (
                    <DetailSection
                      label="Related Systems"
                      value={selectedComponent.relatedSystems.join(', ')}
                      accent={getAccentColor(selectedComponent.domain)}
                    />
                  )}

                  {selectedComponent.sourceReferences && selectedComponent.sourceReferences.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: getAccentColor(selectedComponent.domain) }]}>
                        References
                      </Text>
                      {selectedComponent.sourceReferences.map((ref, i) => (
                        <Text key={i} style={[styles.referenceText, isDark && styles.textMutedDark]}>• {ref}</Text>
                      ))}
                    </View>
                  )}

                  <View style={{ height: 28 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
})

export default FlowchartViewer

// ── Detail row ─────────────────────────────────────────────────────────────────
function DetailSection({ label, value, accent }: { label: string; value: string; accent: string }) {
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  return (
    <View style={styles.detailSection}>
      <Text style={[styles.detailLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.detailText, isDark && styles.textLightDark]}>{value}</Text>
    </View>
  )
}

// ── Cable type with industrial color indicators ────────────────────────────────
function CableTypeSection({ value, accent }: { value: string; accent: string }) {
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  const hasAC = value.toLowerCase().includes('ac')
  const hasDC = value.toLowerCase().includes('dc')
  return (
    <View style={styles.detailSection}>
      <Text style={[styles.detailLabel, { color: accent }]}>Cable Type</Text>
      <Text style={[styles.detailText, isDark && styles.textLightDark]}>{value}</Text>
      {(hasAC || hasDC) && (
        <View style={styles.cableIndicators}>
          {hasDC && (
            <View style={[styles.cableChip, isDark && styles.cableChipDark]}>
              <View style={[styles.cableChipLine, { backgroundColor: '#F97316' }]} />
              <Text style={[styles.cableChipText, { color: '#F97316' }]}>HV DC — Orange</Text>
            </View>
          )}
          {hasAC && (
            <View style={[styles.cableChip, isDark && styles.cableChipDark]}>
              <View style={[styles.cableChipLine, { backgroundColor: '#2563EB' }]} />
              <Text style={[styles.cableChipText, { color: '#2563EB' }]}>HV AC — Blue</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Wire color legend bar ────────────────────────────────────────────────────
  legendBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLineLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },

  // ── Component chip legend ────────────────────────────────────────────────────
  legendContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendScroll: {
    paddingHorizontal: 6,
  },
  legendScrollContent: {
    paddingHorizontal: 6,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#475569',
    maxWidth: 110,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    overflow: 'hidden',
  },
  modalAccentBar: {
    height: 4,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  domainBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  domainBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Component image ──────────────────────────────────────────────────────────
  imageContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  componentImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
  },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imageBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  imageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Detail rows ──────────────────────────────────────────────────────────────
  description: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 23,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  referenceText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 19,
  },

  // ── Cable color chips ────────────────────────────────────────────────────────
  cableIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  cableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cableChipLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginRight: 7,
  },
  cableChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Dark Theme Overrides (palette matches Windows: #1a1a1a body, #252525 surfaces)
  containerDark: {
    backgroundColor: 'transparent',
  },
  loadingOverlayDark: {
    backgroundColor: 'rgba(26,26,26,0.96)',
  },
  webviewDark: {
    backgroundColor: 'transparent',
  },
  webviewContainerDark: {
    backgroundColor: 'transparent',
  },
  legendBarDark: {
    backgroundColor: '#252525',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  legendContainerDark: {
    backgroundColor: '#252525',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  legendItemDark: {
    backgroundColor: '#333333',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalContentDark: {
    backgroundColor: '#252525',
  },
  modalHeaderDark: {
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeButtonDark: {
    backgroundColor: '#333333',
  },
  imageContainerDark: {
    backgroundColor: '#2d2d2d',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  componentImageDark: {
    backgroundColor: '#2d2d2d',
  },
  cableChipDark: {
    backgroundColor: '#333333',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  textLightDark: {
    color: '#d4d4d4',
  },
  textMutedDark: {
    color: '#888888',
  },
})
