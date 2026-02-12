import React from "react";
import { Link } from "react-router-dom";
import CitySelector from "./CitySelector";

const Header: React.FC = () => {
  return (
    <header className="px-6 md:px-16 pt-12 pb-12 border-b-4 border-black bg-white relative overflow-hidden z-10">
      <div className="absolute top-0 right-0 w-64 h-full bg-[#cc543a]/5 -skew-x-12 transform translate-x-32 -z-10"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
              Volume 01
            </div>
            <div className="bg-[#cc543a] text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest">
              Archive
            </div>
            <CitySelector />
          </div>

          <Link to="/" className="block">
            <div className="flex flex-col text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85]">
              <span className="text-[#cc543a]">Through Your</span>
              <span className="text-black">Letters</span>
            </div>
          </Link>

          <div className="mt-8">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 leading-relaxed max-w-lg block">
              Explore, browse through, learn, and contribute your collected or
              photographed street letterings and typefaces.
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-8 min-w-[240px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left md:text-right leading-tight">
            A project initiated by
          </span>
          <span className="text-sm font-black uppercase tracking-tighter text-black">
            Akankshya Pradhan
          </span>
          <div className="w-full h-1 bg-black mt-2"></div>
          <div className="w-1/2 h-2 bg-[#d4a017]"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
