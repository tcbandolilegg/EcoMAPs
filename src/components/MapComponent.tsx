/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CollectionPoint } from '../types';
import { useEffect } from 'react';

// Standard Leaflet icons from CDN
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  points: CollectionPoint[];
  userLocation: [number, number] | null;
  onPointSelect: (point: CollectionPoint) => void;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function MapComponent({ points, userLocation, onPointSelect }: MapComponentProps) {
  const defaultCenter: [number, number] = [-25.4284, -49.2733]; // Curitiba
  const center = userLocation || defaultCenter;

  // Mock route data for "Rota de Coleta Seletiva - Centro"
  const routePositions: [number, number][] = [
    [-25.4284, -49.2733],
    [-25.4300, -49.2650],
    [-25.4350, -49.2600],
    [-25.4411, -49.2391],
  ];

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={routePositions} color="emerald" weight={5} opacity={0.6} dashArray="10, 10">
          <Popup>Rota de Coleta Seletiva - Terça/Quinta</Popup>
        </Polyline>
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}
        {points.map((point) => (
          <Marker 
            key={point.id} 
            position={[point.lat, point.lng]}
            eventHandlers={{
              click: () => onPointSelect(point)
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-emerald-800">{point.name}</h3>
                <p className="text-xs text-neutral-600 mb-2">{point.address}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {point.acceptedItems.slice(0, 3).map(item => (
                    <span key={item} className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">
                      {item}
                    </span>
                  ))}
                </div>
                <button 
                  className="w-full text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 rounded hover:bg-emerald-100 transition-colors"
                  onClick={() => onPointSelect(point)}
                >
                  Ver Detalhes Completos
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && <ChangeView center={userLocation} />}
      </MapContainer>
    </div>
  );
}
