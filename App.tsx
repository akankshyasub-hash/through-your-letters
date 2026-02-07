
import React, { useState, useEffect } from 'react';
import { AppMode, ZinePageData } from './types';
import { ZINE_PAGES, BENGALURU_REGIONS } from './constants';
import ZinePage from './components/ZinePage';
import ContributionPanel from './components/ContributionPanel';
import Header from './components/Header';
import MapSection from './components/MapSection';
import { Compass, PlusCircle, Info, ArrowRight, Layout, Type, Heart, Puzzle, Trash2, AlertTriangle, Map as MapIcon, Globe, User } from 'lucide-react';

const SCRIPT_SPECIMENS = [
  { char: 'ଅ', lang: 'Odia', font: 'odia', color: 'bg-[#cc543a]' },
  { char: 'କ', lang: 'Odia', font: 'odia', color: 'bg-black' },
  { char: 'ଥ', lang: 'Odia', font: 'odia', color: 'bg-[#2d5a27]' },
  { char: 'ଲ', lang: 'Odia', font: 'odia', color: 'bg-[#d4a017]' },
  { char: 'ಅ', lang: 'Kannada', font: 'kannada', color: 'bg-slate-200 text-black' },
  { char: 'ಕ', lang: 'Kannada', font: 'kannada', color: 'bg-black' },
  { char: 'ಖ', lang: 'Kannada', font: 'kannada', color: 'bg-[#cc543a]' },
  { char: 'ಘ', lang: 'Kannada', font: 'kannada', color: 'bg-slate-800' },
  { char: 'अ', lang: 'Hindi', font: 'devanagari', color: 'bg-[#cc543a]' },
  { char: 'क', lang: 'Hindi', font: 'devanagari', color: 'bg-slate-800' },
  { char: 'ह', lang: 'Marathi', font: 'devanagari', color: 'bg-black' },
  { char: 'അ', lang: 'Malayalam', font: 'malayalam', color: 'bg-[#2d5a27]' },
  { char: 'କ', lang: 'Malayalam', font: 'malayalam', color: 'bg-[#d4a017]' },
  { char: 'ಅ', lang: 'Telugu', font: 'telugu', color: 'bg-black' },
  { char: 'କ', lang: 'Telugu', font: 'telugu', color: 'bg-[#cc543a]' },
  { char: 'அ', lang: 'Tamil', font: 'latin', color: 'bg-slate-200 text-black' },
  { char: 'க', lang: 'Tamil', font: 'latin', color: 'bg-[#2d5a27]' },
  { char: 'অ', lang: 'Bengali', font: 'bengali', color: 'bg-[#d4a017]' },
  { char: 'କ', lang: 'Bengali', font: 'bengali', color: 'bg-black' },
  { char: 'ਅ', lang: 'Punjabi', font: 'gurmukhi', color: 'bg-[#cc543a]' },
  { char: 'କ', lang: 'Punjabi', font: 'gurmukhi', color: 'bg-slate-800' },
  { char: 'અ', lang: 'Gujarati', font: 'gujarati', color: 'bg-black' },
  { char: 'ಕ', lang: 'Gujarati', font: 'gujarati', color: 'bg-[#2d5a27]' },
  { char: 'ا', lang: 'Urdu', font: 'urdu', color: 'bg-[#d4a017]' },
  { char: 'ک', lang: 'Urdu', font: 'urdu', color: 'bg-black' },
  { char: 'ᱚ', lang: 'Santhali', font: 'olchiki', color: 'bg-[#cc543a]' },
  { char: 'ꯀ', lang: 'Manipuri', font: 'latin', color: 'bg-slate-800' },
  { char: 'A', lang: 'Latin', font: '', color: 'bg-slate-100 text-black' },
];

const ScriptPuzzleGrid = () => {
  const [activeItem, setActiveItem] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-black">
          <Puzzle size={20} className="animate-pulse" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">The Character Maze</h4>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase italic">Tap a block to reveal its identity</p>
      </div>
      
      <div className="pixel-grid">
        {SCRIPT_SPECIMENS.map((item, idx) => (
          <button
            key={idx}
            onMouseEnter={() => setActiveItem(idx)}
            onMouseLeave={() => setActiveItem(null)}
            onClick={() => setActiveItem(idx === activeItem ? null : idx)}
            className={`${item.color} ${item.color.includes('text-black') ? '' : 'text-white'} aspect-square flex items-center justify-center transition-all duration-300 relative group overflow-hidden border border-black/10`}
          >
            <span className={`text-2xl font-black ${item.font} transition-transform duration-500 group-hover:scale-125`}>
              {item.char}
            </span>
            
            {activeItem === idx && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-1 animate-in zoom-in-90 duration-200">
                <span className="text-[7px] font-black uppercase tracking-widest text-white mb-1 leading-none text-center">{item.lang}</span>
                <div className="w-4 h-[1px] bg-[#cc543a]"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EXPLORE);
  const [contributions, setContributions] = useState<ZinePageData[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('blr_lettering_contributions');
    if (saved) {
      try {
        setContributions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load contributions", e);
      }
    }
  }, []);

  const handleAddContribution = (newEntry: ZinePageData) => {
    setContributions((prev) => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem('blr_lettering_contributions', JSON.stringify(updated));
      } catch (e) {
        console.warn("Local storage full, contribution might not persist across sessions.");
      }
      return updated;
    });
  };

  const handleDeleteContribution = (id: string | number) => {
    if (window.confirm("Are you sure you want to remove this specimen from the archive? This cannot be undone.")) {
      setContributions((prev) => {
        const updated = prev.filter(c => c.id !== id);
        localStorage.setItem('blr_lettering_contributions', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handlePurgeArchive = () => {
    if (window.confirm("WARNING: This will permanently delete ALL your personal contributions from this browser's local archive. Continue?")) {
      localStorage.removeItem('blr_lettering_contributions');
      setContributions([]);
      alert("Local archive purged.");
    }
  };

  const allPages = [...contributions, ...ZINE_PAGES];

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture transition-colors duration-300">
      <Header mode={mode} setMode={setMode} />

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-16 relative">
        {mode === AppMode.EXPLORE && (
          <div className="space-y-40 pb-24">
            <section className="space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-8">
                  <div className="space-y-2">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Open Gallery</h2>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Recently archived specimens from the field</p>
                  </div>
                  <button onClick={() => setMode(AppMode.CONTRIBUTE)} className="mt-4 md:mt-0 bg-[#cc543a] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest brutalist-shadow-sm hover:bg-black transition-all">
                    Let's Add to the Gallery
                  </button>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
                 {allPages.slice(0, 10).map((page, idx) => (
                   <div key={page.id} className={`group bg-white border-2 border-black p-3 brutalist-shadow-sm hover:-translate-y-1 transition-all ${idx % 3 === 0 ? 'md:col-span-2 md:row-span-1' : ''}`}>
                      <a href={`#page-${page.id}`} className="block space-y-4">
                        <div className="aspect-square bg-slate-100 border border-black overflow-hidden relative">
                           {page.image ? (
                             <img src={page.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all hover:[image-rendering:pixelated]" alt={page.title} />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center opacity-20">
                               <Type size={idx % 3 === 0 ? 64 : 32} />
                             </div>
                           )}
                           <div className="absolute top-2 left-2 bg-black text-white text-[7px] font-black px-1.5 py-0.5 uppercase tracking-widest">{page.location}</div>
                        </div>
                        <div className="px-1 border-t border-black/5 pt-3">
                          <p className="text-[11px] font-black uppercase truncate text-black leading-none mb-1.5">{page.title}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">By {page.contributorName || page.imageSource || 'Archivist'}</p>
                        </div>
                      </a>
                   </div>
                 ))}
               </div>
            </section>

            <section className="max-w-5xl pt-20 border-t-8 border-black">
              <div className="space-y-10">
                <p className="serif text-3xl md:text-5xl leading-tight text-slate-900 font-black max-w-4xl tracking-tighter">
                  What started as a personal curiosity for street letterforms has grown into a collaborative digital museum. 
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  <div className="space-y-8">
                    <p className="serif text-2xl leading-relaxed text-slate-700 italic font-bold border-l-8 border-[#cc543a] pl-8 py-2">
                      This is an attempt to archive and create a museum for your captured street letterings, hand-painted signs, unique stencils, and whatever typographic moments made you stop and click—capturing the soul of the city, starting with Bengaluru.
                    </p>
                    <p className="text-xl leading-relaxed text-slate-600 font-medium">
                      Every hand-painted sign and weathered stencil carries the living history of its neighborhood. We are documenting these letterforms to preserve our visual identity before they fade from the landscape.
                    </p>
                  </div>
                  
                  <div className="bg-black text-white p-10 brutalist-shadow space-y-8 relative overflow-hidden group">
                    <div className="flex items-center gap-3 text-[#d4a017] relative z-10">
                      <Globe size={20} />
                      <h4 className="text-[11px] font-black uppercase tracking-widest">Museum Access</h4>
                    </div>
                    <p className="text-sm font-bold text-slate-300 relative z-10 leading-relaxed">Browse the complete archive to discover typographic treasures and documented stories from every corner of the city.</p>
                    <button 
                      onClick={() => setMode(AppMode.GUIDEBOOK)}
                      className="w-full bg-[#cc543a] text-white px-5 py-4 text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 brutalist-shadow-sm active:translate-y-1"
                    >
                      <Layout size={16} />
                      Enter Museum Archive
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {allPages.map((page) => (
              <ZinePage key={page.id} page={page} />
            ))}
            
            <section className="bg-black text-white p-12 md:p-24 brutalist-shadow flex flex-col md:flex-row items-center justify-between gap-16 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-full bg-[#d4a017]/20 -skew-x-12 translate-x-10"></div>
              <div className="space-y-8 relative z-10 text-center md:text-left">
                <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
                  Join the <br/> <span className="text-[#cc543a]">Archive</span>.
                </h3>
                <p className="text-slate-400 max-w-md text-xl font-medium leading-relaxed">
                  Spotted a unique script or a ghost sign? <br/>
                  Help us build the city's living typographic museum.
                </p>
              </div>
              <button 
                onClick={() => setMode(AppMode.CONTRIBUTE)}
                className="bg-[#cc543a] hover:bg-white hover:text-black text-white px-12 py-8 text-2xl font-black uppercase tracking-tighter flex items-center gap-6 transition-all brutalist-shadow hover:translate-y-1 hover:shadow-none relative z-10"
              >
                Let's Add to the Gallery <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </section>
          </div>
        )}

        {mode === AppMode.CONTRIBUTE && (
          <ContributionPanel 
            onBack={() => setMode(AppMode.EXPLORE)} 
            onAddContribution={handleAddContribution}
          />
        )}

        {mode === AppMode.MAP && (
          <MapSection 
            contributions={contributions} 
            onSelectArea={() => setMode(AppMode.GUIDEBOOK)} 
          />
        )}

        {mode === AppMode.GUIDEBOOK && (
          <div className="space-y-16 animate-in fade-in duration-500 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-10 gap-8">
               <div className="space-y-3">
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Museum Archive</h2>
                <p className="handwritten text-xl text-[#cc543a] font-bold">A collection of user-contributed and heritage street artifacts.</p>
               </div>
               <div className="flex gap-4">
                 <button onClick={() => setMode(AppMode.EXPLORE)} className="text-[11px] font-black uppercase bg-black text-white px-6 py-3 hover:bg-[#cc543a] transition-all brutalist-shadow-sm">
                    Back to Explore
                 </button>
               </div>
            </div>

            <div className="pt-8">
               <div className="flex items-center justify-between mb-12">
                  <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                    <User size={32} fill="currentColor" className="text-[#2d5a27]" /> Our Collections
                  </h3>
               </div>
               
               {allPages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                  {allPages.map((page) => (
                    <div key={page.id} className="group relative bg-white border-2 border-black brutalist-shadow-sm p-5 transition-all duration-300 overflow-hidden">
                      <div className="aspect-square bg-[#f8f5f0] border border-black overflow-hidden relative flex items-center justify-center">
                         {page.image ? (
                           <img src={page.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all hover:[image-rendering:pixelated]" alt={page.title} />
                         ) : (
                           <Type size={64} className="text-[#2d5a27] opacity-20" />
                         )}
                         
                         {page.isUserContribution && (
                           <button 
                             onClick={(e) => {
                               e.preventDefault();
                               handleDeleteContribution(page.id);
                             }}
                             className="absolute top-3 right-3 p-2 bg-white border border-black text-black hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 brutalist-shadow-sm"
                             title="Remove specimen"
                           >
                             <Trash2 size={16} />
                           </button>
                         )}
                      </div>
                      <div className="pt-5 border-t border-black/10 mt-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#cc543a] mb-2 block">{page.location}</span>
                        <p className="text-[11px] font-black truncate uppercase text-slate-900 leading-none">{page.title}</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-wide">By {page.contributorName || page.imageSource || 'Archivist'}</p>
                      </div>
                      <a 
                        href={`#page-${page.id}`} 
                        onClick={() => setMode(AppMode.EXPLORE)}
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity"
                      >
                         <span className="text-white text-[11px] font-black uppercase tracking-widest border border-white px-6 py-3 bg-black/40 backdrop-blur-sm">View Details</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center space-y-10 bg-slate-50 border-4 border-dashed border-black/10">
                  <p className="serif text-2xl italic text-slate-500 max-w-md mx-auto leading-relaxed">
                    The museum is waiting for its first artifact.
                  </p>
                  <button 
                    onClick={() => setMode(AppMode.CONTRIBUTE)}
                    className="bg-[#cc543a] text-white px-14 py-6 font-black uppercase tracking-widest brutalist-shadow hover:bg-black transition-all text-sm"
                  >
                    Archive First Discovery
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.ABOUT && (
          <div className="max-w-4xl mx-auto py-20 space-y-32 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-6 text-center md:text-left">
              <h2 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.7] text-black italic">
                A Personal <br/> <span className="text-[#cc543a]">Note.</span>
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-4 text-[#d4a017] pt-6">
                <Heart size={32} fill="currentColor" />
                <span className="font-black uppercase tracking-[0.3em] text-sm">A message from Akankshya</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 relative items-start">
              <div className="space-y-12 relative z-10">
                <p className="handwritten text-2xl leading-relaxed text-slate-900 font-bold border-l-4 border-black pl-8">
                  Hello! This project started as a personal curiosity for street lettering. When I was a child, I spent my time reading magazines, books, and charts that my father collected passionately. Every evening, when we went out for ice cream, we would look at the signboards on shops and streets. He used to tell me how to read and pronounce them, and eventually I realized how much I love the way letters are created, styled, painted and so on.
                </p>
                <p className="serif text-xl leading-relaxed text-slate-700 italic">
                  My mother used to show me those same charts to get me to eat my food, so I believe that's where my fascination with letterforms truly began—haha, call it storytelling. 
                </p>
                <p className="serif text-xl leading-relaxed text-slate-800">
                  Throughout my time in academia, I've been collecting, reading, and even presenting projects on this niche interest. Now, I feel I finally have something to truly get started with. I've always loved capturing lettering and investigating the stories hidden behind them.
                </p>
              </div>

              <div className="space-y-12 relative z-10">
                <div className="bg-black text-white p-14 brutalist-shadow-lg transform rotate-1">
                  <p className="text-xl leading-snug font-bold mb-8 italic">
                    There is no better place to start than Bengaluru, where I aim to build an open-source platform by the people, for the people, for street lettering archival.
                  </p>
                  <p className="text-base opacity-80 leading-relaxed font-medium">
                    The intent is to create an archive, give credit, learn, share stories, and remember our histories. I am putting something I genuinely care about and have fun doing here for you.
                  </p>
                </div>
                
                <p className="handwritten text-2xl leading-relaxed text-slate-900 font-bold border-l-8 border-[#cc543a] pl-8 py-6">
                  This is my attempt to give a home to my collected letterings and, if you want, yours too. Go have fun with this! Upload your letters, describe them, or just add a fun anecdote. You can also see what others have created. And last but not least—thank you.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border-4 border-black border-dashed p-12 space-y-10">
              <div className="flex items-center gap-5 text-black">
                <AlertTriangle size={40} className="text-[#cc543a]" />
                <h3 className="text-3xl font-black uppercase tracking-tighter">Archive Management</h3>
              </div>
              <p className="text-base font-medium text-slate-600 leading-relaxed max-w-2xl">
                Your contributions are currently stored locally in this browser. 
                If you wish to clear all your saved specimens or reset the app, you can purge the archive below.
              </p>
              <button 
                onClick={handlePurgeArchive}
                className="bg-white border-2 border-black text-black px-10 py-5 text-[11px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all brutalist-shadow-sm flex items-center gap-4"
              >
                <Trash2 size={20} /> Purge Local Archive
              </button>
            </div>

            <div className="pt-32 border-t-8 border-black">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-12">
                <div className="space-y-3">
                  <h3 className="text-5xl font-black uppercase tracking-tighter">Letters and Bits</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">A jumble of characters from everywhere.</p>
                </div>
                <div className="flex-1 max-w-lg md:text-right">
                  <p className="handwritten text-2xl text-[#cc543a] font-black leading-tight">
                    Poke around the blocks to see where they came from! Just some cool scripts doing their thing.
                  </p>
                </div>
              </div>

              <ScriptPuzzleGrid />
            </div>
            
            <div className="py-32 text-center space-y-16">
               <div className="inline-block border-b-4 border-black pb-6">
                 <p className="handwritten text-5xl font-black italic">Curated with love.</p>
               </div>
               <div className="flex justify-center gap-20">
                  <div className="w-20 h-20 bg-[#cc543a] brutalist-shadow"></div>
                  <div className="w-20 h-20 bg-black brutalist-shadow"></div>
                  <div className="w-20 h-20 bg-[#d4a017] brutalist-shadow"></div>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className="sticky bottom-10 self-center w-[92%] md:w-[65%] bg-white border-4 border-black p-6 flex justify-between items-center z-50 brutalist-shadow-lg mx-auto mb-10 transition-all hover:scale-[1.01]">
        <button onClick={() => setMode(AppMode.EXPLORE)} className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase tracking-widest transition-all ${mode === AppMode.EXPLORE ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Compass size={28} />
          <span>Explore</span>
        </button>
        <button onClick={() => setMode(AppMode.CONTRIBUTE)} className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase tracking-widest transition-all ${mode === AppMode.CONTRIBUTE ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <PlusCircle size={28} />
          <span>Contribute</span>
        </button>
        <button onClick={() => setMode(AppMode.MAP)} className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase tracking-widest transition-all ${mode === AppMode.MAP ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <MapIcon size={28} />
          <span>Map</span>
        </button>
        <button onClick={() => setMode(AppMode.GUIDEBOOK)} className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase tracking-widest transition-all ${mode === AppMode.GUIDEBOOK ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Layout size={28} />
          <span>Gallery</span>
        </button>
        <button onClick={() => setMode(AppMode.ABOUT)} className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase tracking-widest transition-all ${mode === AppMode.ABOUT ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Info size={28} />
          <span>Info</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
