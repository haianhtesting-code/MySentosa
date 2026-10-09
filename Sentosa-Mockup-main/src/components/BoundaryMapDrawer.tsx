'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
// Events Master List §8.2 — boundary drawing toolbar.
import 'leaflet-draw/dist/leaflet.draw.css';

export interface BoundaryPoint {
  lat: number;
  lng: number;
}

export interface LocationPresetItem {
  name: string;
  label: string;
  lat: number;
  lng: number;
  roadName: string;
  buildingCommonName: string;
  postalCode: string;
  zone: string;
  level?: string;
  tags?: string[];
}

export const SENTOSA_LOCATION_PRESETS: LocationPresetItem[] = [
  { name: 'siloso', label: 'Siloso Beach Walk (Sector 1)', lat: 1.2505, lng: 103.8185, roadName: 'Siloso Beach Walk', buildingCommonName: 'Siloso Canopy Pavilions', postalCode: '099981', zone: 'Sector 1 (North Siloso)', level: 'Ground Level / Walkway', tags: ['Beachfront', 'Promenade'] },
  { name: 'palawan', label: 'Palawan Beach Boardwalk (Sector 3)', lat: 1.2502, lng: 103.8232, roadName: 'Palawan Beach Walk', buildingCommonName: 'Palawan Food Kiosk 3', postalCode: '098234', zone: 'Sector 3 (Palawan Beach)', level: 'Ground Level / Boardwalk', tags: ['Beachfront', 'Promenade'] },
  { name: 'tanjong', label: 'Tanjong Beach Area (Sector 4)', lat: 1.2440, lng: 103.8270, roadName: 'Tanjong Beach Walk', buildingCommonName: 'Tanjong Beach Pavilion', postalCode: '098942', zone: 'Sector 4 (Tanjong Beach)', level: 'Ground Level', tags: ['Beachfront'] },
  { name: 'cove', label: 'Sentosa Cove & Village (Sector 2)', lat: 1.2465, lng: 103.8300, roadName: 'Ocean Way', buildingCommonName: 'Sentosa Cove Village & Jetty', postalCode: '098375', zone: 'Sector 2 (South Beach)', level: 'Basement / Ground', tags: ['Maritime', 'Commercial'] },
  { name: 'imbiah', label: 'Imbiah Lookout (Sector 1)', lat: 1.2550, lng: 103.8170, roadName: 'Imbiah Road', buildingCommonName: 'Imbiah Lookout Transit Hub', postalCode: '099705', zone: 'Sector 1 (North Siloso)', level: 'Level 1', tags: ['Attractions', 'High Ground'] },
  { name: 'gateway', label: 'Sentosa Gateway & Arterial', lat: 1.2580, lng: 103.8220, roadName: 'Sentosa Gateway', buildingCommonName: 'Sentosa Gateway Gantry & Inbound Lane', postalCode: '098585', zone: 'Sentosa Gateway & Arterial', level: 'Ground Level / Roadway', tags: ['Roadway', 'Traffic'] },
  { name: 'resorts world', label: 'Resorts World Sentosa Precinct', lat: 1.2560, lng: 103.8200, roadName: 'Gateway Avenue', buildingCommonName: 'Resorts World Sentosa Central', postalCode: '098138', zone: 'Sentosa Gateway & Arterial', level: 'Basement 1', tags: ['Integrated Resort'] },
  { name: 'fort siloso', label: 'Fort Siloso Skywalk', lat: 1.2590, lng: 103.8080, roadName: 'Siloso Road', buildingCommonName: 'Fort Siloso Skywalk Tower', postalCode: '099981', zone: 'Sector 1 (North Siloso)', level: 'Elevated Walkway', tags: ['Heritage', 'High Ground'] },
  { name: '099981', label: 'Siloso Beach Walk Canopy (Postal 099981)', lat: 1.2505, lng: 103.8185, roadName: 'Siloso Beach Walk', buildingCommonName: 'Siloso Canopy Pavilions', postalCode: '099981', zone: 'Sector 1 (North Siloso)', level: 'Ground Level / Walkway', tags: ['Beachfront', 'Promenade'] },
  { name: '098234', label: 'Palawan Beach Walk (Postal 098234)', lat: 1.2502, lng: 103.8232, roadName: 'Palawan Beach Walk', buildingCommonName: 'Palawan Food Kiosk 3', postalCode: '098234', zone: 'Sector 3 (Palawan Beach)', level: 'Ground Level / Boardwalk', tags: ['Beachfront', 'Promenade'] },
  { name: '098942', label: 'Tanjong Beach Walk (Postal 098942)', lat: 1.2440, lng: 103.8270, roadName: 'Tanjong Beach Walk', buildingCommonName: 'Tanjong Beach Pavilion', postalCode: '098942', zone: 'Sector 4 (Tanjong Beach)', level: 'Ground Level', tags: ['Beachfront'] },
  { name: '098375', label: 'Ocean Way (Postal 098375)', lat: 1.2465, lng: 103.8300, roadName: 'Ocean Way', buildingCommonName: 'Sentosa Cove Village & Jetty', postalCode: '098375', zone: 'Sector 2 (South Beach)', level: 'Ground Level', tags: ['Maritime'] },
  { name: '099705', label: 'Imbiah Road (Postal 099705)', lat: 1.2550, lng: 103.8170, roadName: 'Imbiah Road', buildingCommonName: 'Imbiah Lookout Transit Hub', postalCode: '099705', zone: 'Sector 1 (North Siloso)', level: 'Level 1', tags: ['Attractions'] },
  { name: '098585', label: 'Sentosa Gateway (Postal 098585)', lat: 1.2580, lng: 103.8220, roadName: 'Sentosa Gateway', buildingCommonName: 'Sentosa Gateway Gantry', postalCode: '098585', zone: 'Sentosa Gateway & Arterial', level: 'Ground Level / Roadway', tags: ['Roadway'] },
  { name: '098138', label: 'Gateway Avenue (Postal 098138)', lat: 1.2560, lng: 103.8200, roadName: 'Gateway Avenue', buildingCommonName: 'Resorts World Sentosa Central', postalCode: '098138', zone: 'Sentosa Gateway & Arterial', level: 'Basement 1', tags: ['Integrated Resort'] }
];

interface BoundaryMapDrawerProps {
  /** Center of the allowed drawing area — the selected location hierarchy node's coordinates. */
  center: BoundaryPoint;
  initialBoundary?: BoundaryPoint[];
  onBoundaryChange: (points: BoundaryPoint[] | undefined) => void;
  onSelectLocation?: (location: LocationPresetItem) => void;
  /**
   * Radius (metres) around `center` that a drawn boundary must stay within.
   * Defaults to 300m for Events; callers (e.g. NOP wizard) may pass 5000m to span the island.
   */
  maxRadiusMeters?: number;
  disabled?: boolean;
  /** Read-only preview — renders the map + drawn polygon (if any) with no draw toolbar, no editing. Used in the Event detail View mode. */
  readOnly?: boolean;
  /** Map height in pixels. Defaults to 260 (200 when readOnly) if omitted. */
  heightPx?: number;
  /**
   * Overrides the field label shown above the map (including any qualifier
   * text such as "optional"/"mandatory"). Defaults to the Events-module
   * wording ("Event Area Boundary (optional — §8.2)") so existing Events
   * callers are unaffected.
   */
  label?: string;
  helpText?: React.ReactNode;
}

// FRD §8.2 & NOP FRD §4.4 — mark an Event/NOP boundary on the 2D island map.
export default function BoundaryMapDrawer({
  center,
  initialBoundary,
  onBoundaryChange,
  onSelectLocation,
  maxRadiusMeters = 300,
  disabled = false,
  readOnly = false,
  heightPx,
  label,
  helpText,
}: BoundaryMapDrawerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const allowedCircleRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasShape, setHasShape] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || disabled) return;
    let isMounted = true;

    const init = async () => {
      const L = await import('leaflet');
      // leaflet-draw (last released for Leaflet <1.8) still calls the renamed
      // L.LineUtil._flat internally — shim it so the draw toolbar doesn't throw
      // on Leaflet 1.9.x. Widely-documented compatibility fix for this combo.
      (L as any).LineUtil.isFlat = (L as any).LineUtil.isFlat || (L as any).LineUtil._flat;
      (L as any).LineUtil._flat = (L as any).LineUtil._flat || (L as any).LineUtil.isFlat;
      await import('leaflet-draw');
      if (!isMounted || !mapRef.current) return;

      LRef.current = L;

      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: 17,
        minZoom: 13,
        maxZoom: 19,
      });
      mapInstance.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const drawnItems = new (L as any).FeatureGroup();
      drawnItemsRef.current = drawnItems;
      map.addLayer(drawnItems);

      if (initialBoundary && initialBoundary.length >= 3) {
        const poly = L.polygon(initialBoundary.map(p => [p.lat, p.lng] as [number, number]), {
          color: '#ff8200',
        });
        drawnItems.addLayer(poly);
        setHasShape(true);
      }

      if (readOnly) {
        // View mode — just frame the drawn shape (or the center point if there's none), no draw toolbar.
        if (initialBoundary && initialBoundary.length >= 3) {
          map.fitBounds(L.polygon(initialBoundary.map(p => [p.lat, p.lng] as [number, number])).getBounds(), { padding: [20, 20] });
        } else {
          map.setView([center.lat, center.lng], 17);
        }
        return;
      }

      // Allowed-area indicator (§8.2d) — dashed circle standing in for "the
      // selected Location Hierarchy area" (see prop doc above for why a radius).
      allowedCircleRef.current = L.circle([center.lat, center.lng], {
        radius: maxRadiusMeters,
        color: '#008c95',
        weight: 1.5,
        dashArray: '6,6',
        fillOpacity: 0.05,
      }).addTo(map);
      map.fitBounds(allowedCircleRef.current.getBounds(), { padding: [20, 20] });

      const drawControl = new (L as any).Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#ff8200' } },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });
      map.addControl(drawControl);

      const isWithinAllowedArea = (layer: any): boolean => {
        const latlngs: any[] = layer.getLatLngs()[0];
        const centerLatLng = L.latLng(center.lat, center.lng);
        return latlngs.every(pt => centerLatLng.distanceTo(pt) <= maxRadiusMeters);
      };

      const emitBoundary = () => {
        const layers = drawnItems.getLayers();
        if (layers.length === 0) {
          onBoundaryChange(undefined);
          setHasShape(false);
          return;
        }
        const layer = layers[0] as any;
        const latlngs: any[] = layer.getLatLngs()[0];
        onBoundaryChange(latlngs.map(p => ({ lat: p.lat, lng: p.lng })));
        setHasShape(true);
      };

      // leaflet-draw's L.Draw.Event constants map is unreliable across
      // leaflet@1.9.x / leaflet-draw@1.0.4 bundling (L.Draw.Event can come back
      // undefined depending on import/execution order), so listen with the
      // library's documented runtime string event names directly rather than
      // relying on the constant lookup — sidesteps the broken property access
      // entirely and matches leaflet-draw's actual emitted event names.
      const DRAW_CREATED = (L as any).Draw?.Event?.CREATED || 'draw:created';
      const DRAW_EDITED = (L as any).Draw?.Event?.EDITED || 'draw:edited';
      const DRAW_DELETED = (L as any).Draw?.Event?.DELETED || 'draw:deleted';

      map.on(DRAW_CREATED, (e: any) => {
        const layer = e.layer;
        if (!isWithinAllowedArea(layer)) {
          setError('Boundary falls outside the selected location’s area — draw within the dashed circle.');
          return;
        }
        setError(null);
        // Only one boundary shape per Event — replace any existing shape.
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        emitBoundary();
      });

      map.on(DRAW_EDITED, (e: any) => {
        let allValid = true;
        e.layers.eachLayer((layer: any) => {
          if (!isWithinAllowedArea(layer)) allValid = false;
        });
        if (!allValid) {
          setError('Boundary falls outside the selected location’s area — edit stayed within the dashed circle.');
          return;
        }
        setError(null);
        emitBoundary();
      });

      map.on(DRAW_DELETED, () => {
        setError(null);
        emitBoundary();
      });
    };

    init();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, readOnly, center.lat, center.lng]);

  const handleClear = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    setError(null);
    setHasShape(false);
    onBoundaryChange(undefined);
  };

  const executeSearch = (queryStr: string) => {
    const q = queryStr.toLowerCase().trim();
    if (!q) {
      setSearchFeedback(null);
      return;
    }
    const match = SENTOSA_LOCATION_PRESETS.find(p => q.includes(p.name) || p.label.toLowerCase().includes(q) || p.roadName.toLowerCase().includes(q) || p.postalCode.includes(q));
    if (match && mapInstance.current) {
      if (searchMarkerRef.current) {
        try { mapInstance.current.removeLayer(searchMarkerRef.current); } catch {}
      }
      if (LRef.current) {
        try {
          const marker = LRef.current.circleMarker([match.lat, match.lng], {
            radius: 8,
            fillColor: '#FF8200',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
          }).addTo(mapInstance.current);
          marker.bindPopup(`<strong>${match.label}</strong><br/><span style="font-size:11px;color:#64748B;">Road: ${match.roadName} &bull; Postal: ${match.postalCode}</span>`).openPopup();
          searchMarkerRef.current = marker;
        } catch {}
      }
      mapInstance.current.setView([match.lat, match.lng], 18);
      setSearchFeedback(`✓ Located: ${match.label} (Road: ${match.roadName}, Postal: ${match.postalCode})`);
      if (onSelectLocation) {
        onSelectLocation(match);
      }
    } else {
      if (mapInstance.current) {
        mapInstance.current.setView([center.lat, center.lng], 17);
      }
      setSearchFeedback(`⚠️ No direct OneMap match for "${queryStr}". Centered on sector coordinates.`);
    }
  };

  if (disabled) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-inset)', border: '1px dashed var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Select an Event Location above to enable boundary drawing.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: label === '' ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: 8, minHeight: label === '' ? 22 : undefined }}>
        {label === '' ? (
          // Caller renders its own label/heading above this component (e.g. the
          // NOP wizard's "Interactive Work Boundary Demarcation" section header) —
          // suppress this component's own label to avoid a duplicated/contradictory heading.
          <span />
        ) : (
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label ?? (
              <>
                Event Area Boundary {!readOnly && <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-faint)' }}>(optional — §8.2)</span>}
              </>
            )}
          </label>
        )}
        {!readOnly && hasShape && (
          <button type="button" onClick={handleClear} className="btn btn-secondary btn-xs" style={{ fontSize: 11, padding: '2px 8px' }}>
            Clear boundary
          </button>
        )}
      </div>

      {!readOnly && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search OneMap location, postal code or road (e.g. Siloso, Palawan, 099981)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  executeSearch(searchQuery);
                }
              }}
              className="form-control"
              style={{ fontSize: '12px', padding: '6px 10px', flex: 1, borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFFFFF' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => executeSearch(searchQuery)}
              style={{ fontSize: '11.5px', padding: '6px 12px', fontWeight: 600 }}
            >
              Locate
            </button>
          </div>
          {searchFeedback && (
            <div style={{ fontSize: '11.5px', fontWeight: 600, marginTop: '5px', color: searchFeedback.startsWith('✓') ? '#15803D' : '#B45309' }}>
              {searchFeedback}
            </div>
          )}
        </div>
      )}

      <div ref={mapRef} style={{ height: heightPx ?? (readOnly ? 200 : 260), borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }} />
      {!readOnly && (
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 }}>
          {helpText ?? "Use the polygon tool (top-right of the map) to demarcate the work boundary within the permitted sector. Work zone demarcation on OneMap is mandatory for all permit applications."}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>{error}</p>
      )}
    </div>
  );
}
