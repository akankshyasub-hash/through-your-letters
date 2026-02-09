import React from 'react';
import { BENGALURU_REGIONS } from '../constants';
import { MapPin } from 'lucide-react';

const MapSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
          Browse by Region
        </h2>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Explore letterings from different parts of Bengaluru
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {BENGALURU_REGIONS.map((region) => (
          <button
            key={region.slug}
            className="bg-white border-2 border-black p-6 brutalist-shadow-sm hover:-translate-y-1 hover:bg-slate-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#cc543a] border-2 border-black flex items-center justify-center group-hover:bg-black transition-colors">
                <MapPin size={24} className="text-white" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {region.pinPrefix}
              </span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter">
              {region.name}
            </h3>
          </button>
        ))}
      </div>

      <div className="bg-slate-100 border-4 border-black p-12 text-center">
        <MapPin size={64} className="mx-auto mb-4 text-slate-300" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
          Interactive map coming soon
        </p>
      </div>
    </div>
  );
};

export default MapSection;
