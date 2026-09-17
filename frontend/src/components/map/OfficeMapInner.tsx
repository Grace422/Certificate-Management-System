'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { config } from '@/lib/config';
import { directionsUrl, formatDistance } from '@/lib/geo';
import type { GeoPoint, MunicipalOffice } from '@/lib/types';

/** Leaflet's default marker images break under bundlers — use inline SVG pins. */
const pin = (fill: string) =>
  L.divIcon({
    className: '',
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${fill}"/>
      <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });

const officeIcon = pin('#047857');   // emerald-700
const selectedIcon = pin('#4338ca'); // indigo-700
const userIcon = pin('#0f172a');     // slate-900

/** Refit the viewport whenever the marker set changes. */
function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])),
      { padding: [40, 40], maxZoom: 14 },
    );
  }, [map, points]);
  return null;
}

export default function OfficeMapInner({
  offices,
  userPosition,
  selectedOfficeId,
  onSelect,
  height = 400,
}: {
  offices: MunicipalOffice[];
  userPosition?: GeoPoint | null;
  selectedOfficeId?: string | null;
  onSelect?: (office: MunicipalOffice) => void;
  height?: number;
}) {
  const points: GeoPoint[] = [...offices, ...(userPosition ? [userPosition] : [])];
  const center = points[0] ?? config.defaultMapCenter;

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={points.length ? 12 : config.defaultMapZoom}
      scrollWheelZoom={false}
      style={{ height, width: '100%' }}
      className="z-0 rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={points} />

      {userPosition && (
        <>
          <Marker position={[userPosition.latitude, userPosition.longitude]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
          <Circle
            center={[userPosition.latitude, userPosition.longitude]}
            radius={400}
            pathOptions={{ color: '#0f172a', fillOpacity: 0.06, weight: 1 }}
          />
        </>
      )}

      {offices.map((o) => (
        <Marker
          key={o.id}
          position={[o.latitude, o.longitude]}
          icon={o.id === selectedOfficeId ? selectedIcon : officeIcon}
          eventHandlers={{ click: () => onSelect?.(o) }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">{o.name}</p>
              <p className="text-xs text-slate-600">
                {o.council}, {o.division} — {o.region}
              </p>
              {o.distanceKm != null && (
                <p className="text-xs text-emerald-700">{formatDistance(o.distanceKm)} away</p>
              )}
              <a
                href={directionsUrl(o, userPosition)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block pt-1 text-xs font-medium text-indigo-700 underline"
              >
                Get directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
