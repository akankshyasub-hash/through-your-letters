import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { API_BASE_URL } from "../constants";
import { useCityStore } from "../store/useCityStore";

interface CityOption {
  id: string;
  name: string;
  country_code: string;
  center_lat: number | null;
  center_lng: number | null;
  default_zoom: number | null;
  is_active: boolean | null;
}

const CitySelector: React.FC = () => {
  const [cities, setCities] = useState<CityOption[]>([]);
  const { selectedCityId, setCity, clearCity } = useCityStore();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/cities`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "all") {
      clearCity();
    } else {
      const city = cities.find((c) => c.id === val);
      if (city) {
        setCity(
          city.id,
          city.name,
          city.center_lat || 12.9716,
          city.center_lng || 77.5946,
          city.default_zoom || 12,
        );
      }
    }
  };

  if (cities.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <MapPin size={14} className="text-[#cc543a]" />
      <select
        value={selectedCityId || "all"}
        onChange={handleChange}
        className="bg-transparent border-b-2 border-black text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer py-1 pr-6"
      >
        <option value="all">All Cities</option>
        {cities
          .filter((c) => c.is_active)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        {cities.some((c) => !c.is_active) && (
          <optgroup label="Coming Soon">
            {cities
              .filter((c) => !c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id} disabled>
                  {c.name}
                </option>
              ))}
          </optgroup>
        )}
      </select>
    </div>
  );
};

export default CitySelector;
