"use client";

import { MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef } from "react";
import { freshnessOpacity } from "@/lib/format";
import { mapCategory } from "@/lib/map-categories";
import type { MapPostWithAuthor } from "@/types/database";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Bundled builds resolve the worker next to a hashed chunk, where it does not
// exist. `scripts/copy-maplibre-worker.mjs` publishes it here instead.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const SOURCE_ID = "dopa-posts";
const PROBE_LAYER = "dopa-posts-probe";
const HEAT_LAYER = "dopa-posts-heat";

export type MapMode = "markers" | "heat";

interface MapCanvasProps {
  posts: MapPostWithAuthor[];
  mode: MapMode;
  center: { lat: number; lng: number };
  userCoords: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (post: MapPostWithAuthor) => void;
  onReady?: () => void;
}

function toFeatureCollection(posts: MapPostWithAuthor[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: posts.map((post) => ({
      type: "Feature",
      id: post.id,
      geometry: { type: "Point", coordinates: [post.longitude, post.latitude] },
      properties: {
        id: post.id,
        category: post.category,
        urgency: post.urgency ? 1 : 0,
        official: post.is_official ? 1 : 0,
        createdAt: post.created_at,
        expiresAt: post.expires_at,
      },
    })),
  };
}

function buildMarkerElement(
  post: MapPostWithAuthor,
  selected: boolean,
  onClick: () => void,
): HTMLElement {
  const meta = mapCategory(post.category);
  const opacity = freshnessOpacity(post.created_at, post.expires_at);

  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${meta.label}の投稿`);
  el.style.cssText = `
    width:${selected ? 46 : 38}px;height:${selected ? 46 : 38}px;border-radius:9999px;
    display:grid;place-items:center;cursor:pointer;padding:0;
    background:rgba(12,17,27,0.92);
    border:2px solid ${meta.color};
    box-shadow:0 0 0 3px ${meta.color}22, 0 0 16px -2px ${meta.color}${post.urgency ? "cc" : "77"};
    opacity:${Math.max(0.35, opacity)};
    transition:width .18s ease,height .18s ease,opacity .3s ease;
    font-size:${selected ? 20 : 17}px;line-height:1;
  `;
  el.textContent = meta.emoji;

  if (post.urgency) {
    const ring = document.createElement("span");
    ring.style.cssText = `
      position:absolute;inset:-4px;border-radius:9999px;border:2px solid ${meta.color};
      animation:dopa-pulse-ring 1.9s ease-out infinite;pointer-events:none;
    `;
    el.style.position = "relative";
    el.appendChild(ring);
  }

  if (post.is_official) {
    const badge = document.createElement("span");
    badge.textContent = "公式";
    badge.style.cssText = `
      position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
      background:#4ef5a3;color:#08130d;font-size:8px;font-weight:800;
      padding:1px 4px;border-radius:5px;white-space:nowrap;pointer-events:none;
    `;
    el.style.position = "relative";
    el.appendChild(badge);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return el;
}

function buildClusterElement(count: number, onClick: () => void): HTMLElement {
  const size = count < 10 ? 40 : count < 30 ? 50 : 60;
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${count}件の投稿。タップで拡大`);
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:9999px;display:grid;place-items:center;
    cursor:pointer;padding:0;border:2px solid rgba(53,220,255,0.55);
    background:radial-gradient(circle at 30% 25%, rgba(53,220,255,0.34), rgba(169,139,255,0.26));
    backdrop-filter:blur(3px);
    box-shadow:0 0 22px -4px rgba(53,220,255,0.65);
    color:#eaf6ff;font-weight:800;font-size:${count < 10 ? 14 : 15}px;
  `;
  el.textContent = String(count);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return el;
}

export default function MapCanvas({
  posts,
  mode,
  center,
  userCoords,
  selectedId,
  onSelect,
  onReady,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new globalThis.Map<string, Marker>());
  const userMarkerRef = useRef<Marker | null>(null);
  const postsRef = useRef(posts);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const modeRef = useRef(mode);
  const readyRef = useRef(false);

  // Map event handlers live outside React, so they read the latest props from
  // refs. Effects declared here run before the map lifecycle effects below.
  useEffect(() => {
    postsRef.current = posts;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
    modeRef.current = mode;
  });

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const existing = markersRef.current;
    if (modeRef.current === "heat") {
      existing.forEach((marker) => marker.remove());
      existing.clear();
      return;
    }

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const byId = new globalThis.Map(postsRef.current.map((p) => [p.id, p]));
    const features = map.querySourceFeatures(SOURCE_ID);
    const wanted = new Set<string>();

    for (const feature of features) {
      const props = feature.properties ?? {};
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (props.cluster) {
        const key = `cluster-${props.cluster_id}`;
        wanted.add(key);
        if (!existing.has(key)) {
          const el = buildClusterElement(Number(props.point_count), () => {
            void source
              .getClusterExpansionZoom(Number(props.cluster_id))
              .then((zoom) => map.easeTo({ center: coords, zoom: zoom + 0.2, duration: 550 }))
              .catch(() => map.easeTo({ center: coords, zoom: map.getZoom() + 1.5 }));
          });
          existing.set(key, new Marker({ element: el }).setLngLat(coords).addTo(map));
        }
        continue;
      }

      const id = String(props.id ?? "");
      const post = byId.get(id);
      if (!post) continue;
      const key = `post-${id}`;
      wanted.add(key);
      const selected = selectedRef.current === id;
      const cached = existing.get(key);
      if (cached) {
        const isSelected = cached.getElement().dataset.selected === "true";
        if (isSelected === selected) continue;
        cached.remove();
        existing.delete(key);
      }
      const el = buildMarkerElement(post, selected, () => onSelectRef.current(post));
      el.dataset.selected = String(selected);
      existing.set(key, new Marker({ element: el }).setLngLat(coords).addTo(map));
    }

    for (const [key, marker] of existing) {
      if (!wanted.has(key)) {
        marker.remove();
        existing.delete(key);
      }
    }
  }, []);

  // --- map lifecycle -------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const markers = markersRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom: 11.4,
      minZoom: 3,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(postsRef.current),
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 14,
      });

      // Invisible layer: querySourceFeatures() needs the source to be rendered.
      map.addLayer({
        id: PROBE_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });

      map.addLayer({
        id: HEAT_LAYER,
        type: "heatmap",
        source: SOURCE_ID,
        layout: { visibility: modeRef.current === "heat" ? "visible" : "none" },
        paint: {
          "heatmap-weight": [
            "case",
            ["==", ["get", "urgency"], 1],
            1,
            ["has", "point_count"],
            ["min", ["/", ["get", "point_count"], 6], 1],
            0.55,
          ],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 1, 15, 3.2],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(8,12,20,0)",
            0.2,
            "rgba(53,220,255,0.42)",
            0.45,
            "rgba(78,245,163,0.6)",
            0.7,
            "rgba(255,196,77,0.72)",
            1,
            "rgba(255,92,122,0.88)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 15, 46],
          "heatmap-opacity": 0.85,
        },
      });

      readyRef.current = true;
      syncMarkers();
      onReady?.();
    });

    map.on("move", syncMarkers);
    map.on("moveend", syncMarkers);
    map.on("sourcedata", (event) => {
      if (event.sourceId === SOURCE_ID && event.isSourceLoaded) syncMarkers();
    });

    // Mobile browsers grow the visual viewport as the address bar retracts, and
    // `dvh` units settle a frame after mount; MapLibre only tracks window
    // resizes, so the canvas would keep whatever size it saw first.
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      markers.forEach((m) => m.remove());
      markers.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; data changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- data ----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(posts));
    syncMarkers();
  }, [posts, syncMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.getLayer(HEAT_LAYER)) return;
    map.setLayoutProperty(HEAT_LAYER, "visibility", mode === "heat" ? "visible" : "none");
    syncMarkers();
  }, [mode, syncMarkers]);

  useEffect(() => {
    syncMarkers();
  }, [selectedId, syncMarkers]);

  // --- camera + current position ------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = `
        width:18px;height:18px;border-radius:9999px;background:#35dcff;
        border:2.5px solid #0b1018;box-shadow:0 0 0 4px rgba(53,220,255,0.22),0 0 18px rgba(53,220,255,0.75);
        position:relative;
      `;
      const halo = document.createElement("span");
      halo.style.cssText = `
        position:absolute;inset:-7px;border-radius:9999px;border:2px solid rgba(53,220,255,0.7);
        animation:dopa-pulse-ring 2.4s ease-out infinite;
      `;
      el.appendChild(halo);
      userMarkerRef.current = new Marker({ element: el });
    }
    userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]).addTo(map);
    map.easeTo({ center: [userCoords.lng, userCoords.lat], zoom: 13, duration: 900 });
  }, [userCoords]);

  // maplibre-gl.css forces `position: relative` onto `.maplibregl-map`, which
  // beats Tailwind's `absolute` and leaves `inset-0` with nothing to stretch,
  // collapsing the container to the height of the attribution bar. The explicit
  // size keeps the map filling its parent under either position.
  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-label="ドパマップ" />
  );
}
