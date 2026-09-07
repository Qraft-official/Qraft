"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER } from "@/lib/geo";

export type GeoStatus = "idle" | "prompting" | "granted" | "denied" | "unavailable";

export interface GeoState {
  status: GeoStatus;
  coords: { lat: number; lng: number } | null;
  /** Falls back to central Tokyo so the map always has somewhere to go. */
  center: { lat: number; lng: number };
  request: () => void;
}

/**
 * Location is never read without an explicit user action or a previously
 * granted permission, and the raw position is never sent anywhere on its own.
 */
export function useGeolocation(autoRequest = true): GeoState {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const requested = useRef(false);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    requested.current = true;
    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!autoRequest || requested.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    // Only auto-locate when the browser already remembers a granted permission,
    // so a first-time visitor is never hit by an unexpected prompt.
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (result.state === "granted") request();
        else if (result.state === "denied") setStatus("denied");
      })
      .catch(() => {
        // Permissions API unsupported: wait for the user to tap the button.
      });
  }, [autoRequest, request]);

  return {
    status,
    coords,
    center: coords ?? DEFAULT_CENTER,
    request,
  };
}
