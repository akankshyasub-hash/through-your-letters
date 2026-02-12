import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Loader2, Navigation, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "../constants";

// Fix Leaflet default icon path issue with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  thumbnail: string;
}

const smallIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [0, -33],
  shadowSize: [33, 33],
});

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

const LeafletMap: React.FC<{
  center?: [number, number];
  zoom?: number;
}> = ({ center = [12.9716, 77.5946], zoom = 12 }) => {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [showDeserts, setShowDeserts] = useState(false);
  const [desertData, setDesertData] = useState<
    { pin_code: string; count: number; lat: number; lng: number }[]
  >([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/geo/markers`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setMarkers(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showDeserts && desertData.length === 0) {
      fetch(`${API_BASE_URL}/api/v1/analytics/neighborhoods`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((json) => {
          // Map neighborhoods to approximate coordinates
          const PIN_COORDS: Record<string, [number, number]> = {
            "560001": [12.9762, 77.5993],
            "560003": [13.0035, 77.5647],
            "560004": [12.9431, 77.5738],
            "560005": [12.9891, 77.6132],
            "560008": [12.9822, 77.62],
            "560011": [12.9308, 77.5838],
            "560034": [12.9352, 77.6245],
            "560038": [12.9719, 77.6412],
            "560066": [12.9698, 77.75],
            "560102": [12.9116, 77.6389],
          };
          const neighborhoods = json.neighborhoods || [];
          setDesertData(
            neighborhoods
              .filter((n: { pin_code: string }) => PIN_COORDS[n.pin_code])
              .map((n: { pin_code: string; count: number }) => ({
                ...n,
                lat: PIN_COORDS[n.pin_code][0],
                lng: PIN_COORDS[n.pin_code][1],
              })),
          );
        })
        .catch(() => {});
    }
  }, [showDeserts, desertData.length]);

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
    );
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleNearMe}
          className="bg-white border-2 border-black p-2 hover:bg-black hover:text-white transition-colors shadow-md"
          title="Near Me"
        >
          <Navigation size={18} />
        </button>
        <button
          onClick={() => setShowDeserts(!showDeserts)}
          className={`bg-white border-2 border-black p-2 hover:bg-black hover:text-white transition-colors shadow-md ${showDeserts ? "bg-[#cc543a] text-white" : ""}`}
          title="Show coverage"
        >
          {showDeserts ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[1000] bg-white/80 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#cc543a]" />
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-[500px] md:h-[600px] border-4 border-black"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <FlyToLocation lat={userLocation[0]} lng={userLocation[1]} />
        )}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={smallIcon}>
            <Popup>
              <div className="text-center">
                {m.thumbnail && (
                  <img
                    src={m.thumbnail}
                    className="w-24 h-24 object-cover mx-auto mb-2 border border-black"
                    alt="Lettering"
                  />
                )}
                <a
                  href={`#page-${m.id}`}
                  className="text-[10px] font-black uppercase text-[#cc543a] hover:underline"
                >
                  View in Archive
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Desert/coverage overlays */}
        {showDeserts &&
          desertData.map((d) => (
            <Circle
              key={d.pin_code}
              center={[d.lat, d.lng]}
              radius={800}
              pathOptions={{
                color:
                  d.count === 0
                    ? "#ef4444"
                    : d.count < 5
                      ? "#f97316"
                      : "#22c55e",
                fillColor:
                  d.count === 0
                    ? "#ef4444"
                    : d.count < 5
                      ? "#f97316"
                      : "#22c55e",
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <span className="text-[10px] font-black">
                  PIN {d.pin_code}: {d.count} uploads
                </span>
              </Popup>
            </Circle>
          ))}

        {userLocation && (
          <Circle
            center={userLocation}
            radius={200}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
