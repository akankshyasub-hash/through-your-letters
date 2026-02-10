import React from "react";
import { AppMode } from "../types";
import { Compass, PlusCircle, Info } from "lucide-react";

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  const navItems = [
    { mode: AppMode.EXPLORE, icon: Compass, label: "Gallery" },
    { mode: AppMode.CONTRIBUTE, icon: PlusCircle, label: "Upload" },
    { mode: AppMode.ABOUT, icon: Info, label: "About" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
      <div className="px-6 md:px-16 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMode(AppMode.EXPLORE)}
            className="flex items-center gap-3 group"
          >
            <div className="w-12 h-12 bg-[#cc543a] border-2 border-black flex items-center justify-center group-hover:bg-black transition-colors">
              <span className="text-white text-2xl font-black">T</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">
                Through Your Letters
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                Bengaluru Street Typography Archive
              </p>
            </div>
          </button>

          <nav className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.mode;

              return (
                <button
                  key={item.mode}
                  onClick={() => setMode(item.mode)}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest
                    border-2 border-black transition-all
                    ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-slate-100"
                    }
                  `}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
