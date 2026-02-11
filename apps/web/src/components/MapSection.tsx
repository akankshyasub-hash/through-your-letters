import React, { useState, useEffect } from "react";
import { Target, Info, Globe, Loader2 } from "lucide-react";
import { API_BASE_URL, PIN_AREA_MAP } from "../constants";
import { NeighborhoodCount } from "../types";
import LeafletMap from "./LeafletMap";

const REGIONS = [
  { name: "Basavanagudi", pin: "560004" },
  { name: "Malleshwaram", pin: "560003" },
  { name: "Frazer Town", pin: "560005" },
  { name: "MG Road / GPO", pin: "560001" },
  { name: "Ulsoor", pin: "560008" },
  { name: "Jayanagar", pin: "560011" },
  { name: "Indiranagar", pin: "560038" },
  { name: "Koramangala", pin: "560034" },
  { name: "HSR Layout", pin: "560102" },
  { name: "Whitefield", pin: "560066" },
];

function getHeatColor(count: number): string {
  if (count === 0) return "bg-slate-100 text-slate-300";
  if (count <= 2) return "bg-[#cc543a]/10 text-[#cc543a]/60";
  if (count <= 5) return "bg-[#cc543a]/25 text-[#cc543a]/80";
  if (count <= 10) return "bg-[#cc543a]/50 text-[#cc543a]";
  if (count <= 20) return "bg-[#cc543a]/75 text-white";
  return "bg-[#cc543a] text-white";
}

function getHeatLabel(count: number): string {
  if (count === 0) return "Desert";
  if (count <= 2) return "Sparse";
  if (count <= 5) return "Growing";
  if (count <= 10) return "Active";
  if (count <= 20) return "Thriving";
  return "Oasis";
}

const MapSection: React.FC = () => {
  const [data, setData] = useState<NeighborhoodCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/analytics/neighborhoods`)
      .then((res) => res.json())
      .then((json) => setData(json.neighborhoods || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const countMap = new Map(data.map((d) => [d.pin_code, d.count]));

  return (
    <div className="space-y-16 animate-in">
      <div className="border-b-4 border-black pb-8 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
          The <span className="text-[#cc543a]">Archive Heatmap</span>
        </h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs font-black uppercase text-slate-400 max-w-xl">
            Darker shades indicate higher documentation density. We can't
            preserve what we haven't documented.
          </p>
          <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Target size={12} className="text-[#d4a017]" /> Target: 10 artifacts
            per region
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <LeafletMap />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-8">
          <section className="bg-black text-white p-8 brutalist-shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase flex items-center gap-2 border-b border-white/20 pb-4">
              <Info size={16} className="text-[#cc543a]" /> Purpose
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 font-medium italic">
              "This tool identifies 'Typographic Deserts'—neighborhoods whose
              visual history remains undocumented."
            </p>
          </section>

          <section className="border-2 border-black p-6 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Legend
            </h4>
            <div className="space-y-2">
              {[
                { label: "Desert (0)", color: "bg-slate-100" },
                { label: "Sparse (1-2)", color: "bg-[#cc543a]/10" },
                { label: "Growing (3-5)", color: "bg-[#cc543a]/25" },
                { label: "Active (6-10)", color: "bg-[#cc543a]/50" },
                { label: "Thriving (11-20)", color: "bg-[#cc543a]/75" },
                { label: "Oasis (20+)", color: "bg-[#cc543a]" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 border border-black/10 ${l.color}`}
                  ></div>
                  <span className="text-[9px] font-black uppercase">
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-100 border-2 border-dashed border-black/20 p-6 space-y-4">
            <Globe size={32} className="opacity-20" />
            <p className="text-[10px] font-bold text-slate-500">
              Future modules will expand to cover other international street
              scripts.
            </p>
          </section>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6 bg-white border-4 border-black p-8 brutalist-shadow">
          {loading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="animate-spin text-[#cc543a]" size={32} />
            </div>
          ) : (
            REGIONS.map((region) => {
              const count = countMap.get(region.pin) || 0;
              const heatColor = getHeatColor(count);
              const heatLabel = getHeatLabel(count);
              return (
                <div
                  key={region.pin}
                  className={`aspect-square border-2 border-black ${heatColor} flex flex-col items-center justify-center text-center p-4 transition-colors relative group`}
                >
                  <span className="text-4xl font-black mb-1">{count}</span>
                  <p className="text-[9px] font-black uppercase tracking-tighter">
                    {region.name}
                  </p>
                  <p className="text-[7px] font-bold uppercase tracking-widest mt-1 opacity-70">
                    {heatLabel}
                  </p>
                  <div className="absolute top-1 right-1 text-[7px] font-mono opacity-40">
                    {region.pin}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && data.length > 0 && (
        <div className="border-4 border-black p-8 bg-white brutalist-shadow-sm space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter">
            All Documented PINs
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.map((n) => (
              <div
                key={n.pin_code}
                className="bg-slate-50 border-2 border-black px-4 py-2 flex items-center gap-3"
              >
                <span className="text-[10px] font-black">
                  {PIN_AREA_MAP[n.pin_code] || n.pin_code}
                </span>
                <span className="text-[10px] font-black text-[#cc543a]">
                  {n.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSection;
