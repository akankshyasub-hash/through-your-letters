import React from 'react';
import { Target, Info, Globe } from 'lucide-react';

const REGIONS = ["Basavanagudi", "Malleshwaram", "Fraser Town", "Shivajinagar", "Chickpet", "Ulsoor", "Jayanagar", "Indiranagar", "Koramangala"];

const MapSection: React.FC = () => {
  return (
    <div className="space-y-16 animate-in">
      <div className="border-b-4 border-black pb-8 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">The <span className="text-[#cc543a]">Archive Heatmap</span></h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs font-black uppercase text-slate-400 max-w-xl">Darker shades indicate higher documentation density. We can't preserve what we haven't documented.</p>
          <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Target size={12} className="text-[#d4a017]" /> Target: 10 artifacts per region</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-8">
          <section className="bg-black text-white p-8 brutalist-shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase flex items-center gap-2 border-b border-white/20 pb-4"><Info size={16} className="text-[#cc543a]" /> Purpose</h3>
            <p className="text-xs leading-relaxed text-slate-300 font-medium italic">"This tool identifies 'Typographic Deserts'—neighborhoods whose visual history remains undocumented."</p>
          </section>
          <section className="bg-slate-100 border-2 border-dashed border-black/20 p-6 space-y-4"><Globe size={32} className="opacity-20"/><p className="text-[10px] font-bold text-slate-500">Future modules will expand to cover other international street scripts.</p></section>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6 bg-white border-4 border-black p-8 brutalist-shadow">
          {REGIONS.map((region) => (
            <div key={region} className="aspect-square border-2 border-black bg-slate-50 flex flex-col items-center justify-center text-center p-4 hover:bg-[#cc543a]/10 transition-colors cursor-help">
              <span className="text-4xl font-black mb-1 text-slate-300">{region.charAt(0)}</span>
              <p className="text-[9px] font-black uppercase tracking-tighter">{region}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapSection;