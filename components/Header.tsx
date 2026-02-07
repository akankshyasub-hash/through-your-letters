
import React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  return (
    <header className="px-6 md:px-12 pt-12 pb-8 border-b-4 border-black bg-white relative overflow-hidden transition-colors duration-300">
      {/* Texture and graphic elements */}
      <div className="absolute top-0 right-0 w-64 h-full bg-[#cc543a]/5 -skew-x-12 transform translate-x-32 -z-10"></div>
      <div className="absolute top-1/2 right-20 w-32 h-1 bg-[#d4a017] rotate-12 -z-10"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1.5 h-full bg-[#cc543a]"></div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-black leading-[0.8] uppercase">
            Bengaluru <br/> 
            <span className="text-[#cc543a] inline-block mt-3 transform -rotate-1 italic tracking-tight">
              Through Your Letters
            </span>
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 mt-8">
             <div className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] brutalist-shadow-sm transition-all duration-300">
                An initiative to explore
             </div>
             <div className="bg-[#cc543a] text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest brutalist-shadow-sm">
                Currently: Bengaluru
             </div>
             <div className="flex items-center gap-2 max-w-lg mt-2 md:mt-0">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                  Explore, learn, and collect street lettering curated for the community.
                </span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4 max-w-[200px] w-full md:w-auto">
           <div className="text-right w-full">
              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Wayfinding Zine</span>
              <span className="block text-xs font-black uppercase tracking-tighter text-black">A Typography Project</span>
              <span className="block text-[8px] font-bold text-slate-400 mt-1 italic leading-tight">By Akankshya Pradhan</span>
           </div>
           <div className="w-full h-1 bg-black mt-1"></div>
           <div className="w-1/2 h-2 bg-[#d4a017] self-end"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
