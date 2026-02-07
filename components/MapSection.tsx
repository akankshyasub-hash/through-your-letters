
import React, { useState, useMemo } from 'react';
import { ZinePageData } from '../types';
import { BENGALURU_REGIONS } from '../constants';
import { Map as MapIcon, Type, MapPin, ArrowUpRight, Target, Search, AlertCircle, Info, Trophy, Clock, X, Sparkles, Globe } from 'lucide-react';

interface MapSectionProps {
  contributions: ZinePageData[];
  onSelectArea: (area: string) => void;
}

const MapSection: React.FC<MapSectionProps> = ({ contributions, onSelectArea }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate distribution
  const stats = useMemo(() => BENGALURU_REGIONS.reduce((acc, region) => {
    acc[region] = contributions.filter(c => c.location === region).length;
    return acc;
  }, {} as Record<string, number>), [contributions]);

  // Identify regions with recent activity (last 7 days)
  const recentRegions = useMemo(() => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return BENGALURU_REGIONS.filter(region => 
      contributions.some(c => {
        if (c.location === region && typeof c.id === 'string' && c.id.includes('_')) {
          const timestamp = parseInt(c.id.split('_')[1]);
          return !isNaN(timestamp) && (now - timestamp) < SEVEN_DAYS_MS;
        }
        return false;
      })
    );
  }, [contributions]);

  const underservedAreas = BENGALURU_REGIONS.filter(r => (stats[r] || 0) < 2 && !r.includes("Other"));

  // Calculate top contributors
  const topRegions = [...BENGALURU_REGIONS]
    .filter(r => !r.includes("Other") && stats[r] > 0)
    .sort((a, b) => stats[b] - stats[a])
    .slice(0, 2);

  // Filter regions for the grid based on search
  const filteredRegions = BENGALURU_REGIONS.filter(r => 
    !r.includes("Other") && 
    r.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDensityStyles = (count: number) => {
    if (count === 0) {
      return 'bg-slate-50 opacity-40 hover:opacity-100 hover:bg-white text-slate-400';
    } else if (count < 3) {
      return 'bg-[#cc543a]/10 text-black brutalist-shadow-sm';
    } else if (count < 6) {
      return 'bg-[#cc543a]/30 text-black brutalist-shadow-sm';
    } else if (count < 10) {
      return 'bg-[#cc543a]/60 text-black brutalist-shadow-sm';
    } else {
      return 'bg-[#cc543a] text-white brutalist-shadow-lg scale-105 z-10';
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      <div className="border-b-4 border-black pb-8 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
          The <span className="text-[#cc543a]">Archive Heatmap</span>
        </h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 max-w-xl">
            A functional tool to visualize documentation progress. Darker shades indicate higher documentation density.
          </p>
          <div className="flex items-center gap-2 bg-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest">
            <Target size={12} className="text-[#d4a017]" /> Target: 10 artifacts per region
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Statistics & Mission */}
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-black text-white p-8 brutalist-shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 border-b border-white/20 pb-4">
              <Info size={16} className="text-[#cc543a]" /> Mapping Purpose
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 font-medium">
              This map identifies "Typographic Deserts"—neighborhoods whose unique street signage and visual history haven't been archived yet. 
            </p>
            <div className="bg-[#cc543a]/10 border-l-4 border-[#cc543a] p-4">
               <p className="handwritten text-base text-[#cc543a] font-bold">"We can't preserve what we haven't documented."</p>
            </div>
          </section>

          {/* Global Vision Indicator */}
          <section className="bg-slate-100 border-2 border-dashed border-black/20 p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-700">
              <Globe size={64} className="text-black" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[#d4a017] animate-pulse"></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Global Horizon</h4>
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                Phase 1: Bengaluru Archive. <br/> 
                Future modules will expand to cover other states and international street scripts. The museum's heart is global.
              </p>
            </div>
          </section>

          {/* Contribution Leaders */}
          <section className="bg-[#d4a017] border-4 border-black p-6 brutalist-shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-black">
              <Trophy size={16} className="text-white" /> Archive Leaders
            </h3>
            <div className="space-y-4">
              {topRegions.length > 0 ? topRegions.map(region => {
                const regionLatest = contributions
                  .filter(c => c.location === region)
                  .sort((a, b) => {
                    const tsA = typeof a.id === 'string' && a.id.includes('_') ? parseInt(a.id.split('_')[1]) : 0;
                    const tsB = typeof b.id === 'string' && b.id.includes('_') ? parseInt(b.id.split('_')[1]) : 0;
                    return tsB - tsA;
                  })[0];
                
                return (
                  <div key={region} className="bg-white border-2 border-black p-3 space-y-2 group cursor-pointer" onClick={() => onSelectArea(region)}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest">{region}</span>
                      <span className="bg-black text-white text-[8px] font-black px-1.5 py-0.5">{stats[region]} Finds</span>
                    </div>
                    {regionLatest && (
                      <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                        <Clock size={10} className="text-[#cc543a] mt-0.5" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Latest Specimen</p>
                          <p className="text-[9px] font-black uppercase truncate max-w-[140px]">{regionLatest.title}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <p className="text-[10px] font-bold text-black/60 italic">Waiting for the first leader to emerge...</p>
              )}
            </div>
          </section>

          <section className="bg-white border-4 border-black p-6 brutalist-shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-black">
              <AlertCircle size={16} className="text-[#cc543a]" /> Undocumented Gaps
            </h3>
            <div className="flex flex-wrap gap-2">
              {underservedAreas.length > 0 ? underservedAreas.map(r => (
                <button 
                  key={r}
                  onClick={() => {
                    setSearchQuery(r);
                    onSelectArea(r);
                  }}
                  className="bg-slate-100 border border-black px-2 py-1 text-[9px] font-black uppercase hover:bg-[#cc543a] hover:text-white transition-all"
                >
                  {r}
                </button>
              )) : (
                <p className="text-[10px] font-bold text-slate-400 italic">No gaps remaining! The city is letter-perfect.</p>
              )}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic pt-2 border-t border-black/5">
              Can't wait to see the city through your captured letterings.
            </p>
          </section>
        </div>

        {/* Interactive Grid Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-black transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search Neighborhoods..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-4 border-black p-4 pl-12 text-sm font-black uppercase tracking-widest brutalist-shadow-sm focus:outline-none focus:ring-4 focus:ring-[#cc543a]/20 transition-all placeholder:text-slate-300"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center hover:text-[#cc543a] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="bg-white border-4 border-black p-8 brutalist-shadow relative overflow-hidden min-h-[500px] flex flex-col justify-center group">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:24px_24px]"></div>
            
            {filteredRegions.length > 0 ? (
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-in fade-in zoom-in-95 duration-300">
                {filteredRegions.map((region) => {
                  const count = stats[region] || 0;
                  const isActive = count > 0;
                  const isRecent = recentRegions.includes(region);
                  const densityStyles = getDensityStyles(count);
                  
                  return (
                    <div 
                      key={region}
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => onSelectArea(region)}
                      className={`aspect-square border-2 border-black p-4 flex flex-col items-center justify-center text-center transition-all duration-300 transform cursor-pointer relative overflow-hidden group/tile hover:-translate-y-1 ${densityStyles}`}
                    >
                      {/* NEW Badge */}
                      {isRecent && (
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[7px] font-black uppercase tracking-tighter flex items-center gap-1 z-20 animate-pulse ${count >= 10 ? 'bg-white text-[#cc543a]' : 'bg-[#cc543a] text-white'}`}>
                          <Sparkles size={6} /> New!
                        </div>
                      )}

                      <span className={`text-3xl md:text-5xl font-black mb-1 transition-transform group-hover/tile:scale-110 ${count >= 10 ? 'text-white' : isActive ? 'text-black' : 'text-slate-300'}`}>
                        {region.charAt(0)}
                      </span>
                      <p className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter leading-tight">{region}</p>
                      
                      {isActive && (
                        <div className={`mt-2 text-[7px] font-black px-2 py-0.5 rounded-full border border-current ${count >= 10 ? 'bg-white text-[#cc543a]' : 'bg-white/40 text-black'}`}>
                          {count} Artifacts
                        </div>
                      )}
                      
                      {hoveredRegion === region && (
                        <div className="absolute inset-0 bg-black text-white p-2 flex flex-col items-center justify-center animate-in fade-in duration-200 z-30">
                           <Search size={14} className="mb-1 text-[#d4a017]" />
                           <span className="text-[8px] font-black uppercase tracking-widest">Scan Area</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                <AlertCircle size={48} className="text-[#cc543a]" />
                <p className="font-black uppercase tracking-widest text-sm">No neighborhoods match your scan</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-bold border-b-2 border-black hover:text-[#cc543a] hover:border-[#cc543a] transition-all"
                >
                  Reset Filter
                </button>
              </div>
            )}

            <div className="mt-12 p-6 border-t-2 border-black/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-[#cc543a] text-white flex items-center justify-center border-2 border-black brutalist-shadow-sm">
                   <MapIcon size={24} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Grid Coverage</p>
                   <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-black text-black leading-none">
                       {Math.round((BENGALURU_REGIONS.filter(r => stats[r] > 0).length / (BENGALURU_REGIONS.length - 1)) * 100)}%
                     </p>
                     <span className="text-[9px] font-black uppercase text-[#cc543a]">Documented</span>
                   </div>
                 </div>
              </div>
              
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="handwritten text-sm text-black font-bold flex items-center gap-2 group/cta"
              >
                <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center group-hover/cta:bg-black group-hover/cta:text-white transition-all">
                  <ArrowUpRight size={14} />
                </div>
                Contribute to the Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
