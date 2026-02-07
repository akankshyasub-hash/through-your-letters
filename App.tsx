
import React, { useState, useEffect } from 'react';
import { AppMode, ZinePageData } from './types';
import { ZINE_PAGES, BENGALURU_REGIONS } from './constants';
import ZinePage from './components/ZinePage';
import ContributionPanel from './components/ContributionPanel';
import Header from './components/Header';
import { fetchAreaArtifacts, generateVisualForArtifact } from './services/geminiService';
import { Compass, PlusCircle, Info, ArrowRight, BookOpen, Layout, Sparkles, User, Globe, Loader2, Type, Heart, Puzzle } from 'lucide-react';

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
  { char: 'ക', lang: 'Malayalam', font: 'malayalam', color: 'bg-[#d4a017]' },
  { char: 'అ', lang: 'Telugu', font: 'telugu', color: 'bg-black' },
  { char: 'ಕ', lang: 'Telugu', font: 'telugu', color: 'bg-[#cc543a]' },
  { char: 'அ', lang: 'Tamil', font: 'latin', color: 'bg-slate-200 text-black' },
  { char: 'க', lang: 'Tamil', font: 'latin', color: 'bg-[#2d5a27]' },
  { char: 'অ', lang: 'Bengali', font: 'bengali', color: 'bg-[#d4a017]' },
  { char: 'କ', lang: 'Bengali', font: 'bengali', color: 'bg-black' },
  { char: 'ਅ', lang: 'Punjabi', font: 'gurmukhi', color: 'bg-[#cc543a]' },
  { char: 'ਕ', lang: 'Punjabi', font: 'gurmukhi', color: 'bg-slate-800' },
  { char: 'અ', lang: 'Gujarati', font: 'gujarati', color: 'bg-black' },
  { char: 'ક', lang: 'Gujarati', font: 'gujarati', color: 'bg-[#2d5a27]' },
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
  const [selectedArea, setSelectedArea] = useState<string>(BENGALURU_REGIONS[0]);
  const [generatedZine, setGeneratedZine] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerateAreaZine = async () => {
    setIsGenerating(true);
    setGeneratedZine(null);
    try {
      const data = await fetchAreaArtifacts(selectedArea);
      const artifactsWithVisuals = data.artifacts.map((art: any) => {
        return { ...art, visual: null };
      });

      setGeneratedZine({
        ...data,
        artifacts: artifactsWithVisuals
      });
      setMode(AppMode.GUIDEBOOK);
    } catch (err) {
      console.error(err);
      alert("The digital archives are being a bit shy. Try another neighborhood!");
    } finally {
      setIsGenerating(false);
    }
  };

  const allPages = [...contributions, ...ZINE_PAGES];

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture transition-colors duration-300">
      <Header mode={mode} setMode={setMode} />

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-12 relative">
        {mode === AppMode.EXPLORE && (
          <div className="space-y-40 pb-24">
            {/* Zine Cover / Intro */}
            <section className="max-w-4xl relative">
              <div className="absolute -left-12 top-0 text-7xl font-black text-black/5 select-none pointer-events-none uppercase tracking-tighter transform -rotate-90 origin-top-left">
                INTRO
              </div>
              
              <div className="bg-[#cc543a] text-white px-1 py-1 inline-block mb-8 brutalist-shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] px-2">Volume 01</span>
              </div>

              <div className="space-y-8">
                <p className="serif text-3xl md:text-5xl leading-tight text-slate-900 font-black max-w-3xl tracking-tighter">
                  What started as a personal obsession with street letters has finally found a cozy home here.
                </p>
                <div className="space-y-4 max-w-2xl">
                  <p className="serif text-2xl leading-snug text-slate-700 italic font-bold">
                    This is an open-source project by the people, for the people. 
                  </p>
                  <p className="text-xl leading-relaxed text-slate-600 font-medium">
                    We're just archiving the cool fonts of the city—hand-painted signs, weird stencils, and whatever else looks awesome on a wall.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                <div className="space-y-8">
                  {contributions.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-left duration-700">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                         <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <User size={12} fill="currentColor" /> Your Finds
                         </h4>
                         <button onClick={() => setMode(AppMode.GUIDEBOOK)} className="text-[8px] font-black uppercase hover:text-[#cc543a] border-b border-transparent hover:border-[#cc543a]">Gallery View</button>
                      </div>
                      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
                        {contributions.slice(0, 8).map((c) => (
                          <a href={`#page-${c.id}`} key={c.id} className="shrink-0 w-36 group">
                            <div className="aspect-square border-2 border-black bg-white p-1 brutalist-shadow-sm group-hover:-translate-y-1 group-hover:rotate-1 transition-all overflow-hidden relative flex items-center justify-center bg-[#f8f5f0]">
                               {c.image ? (
                                 <img src={c.image} className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all" alt={c.title} />
                               ) : (
                                 <Type size={32} className="text-[#cc543a] opacity-40" />
                               )}
                               <div className="absolute inset-0 border border-white/20 pointer-events-none"></div>
                               <div className="absolute top-1 left-1 bg-[#2d5a27] text-white text-[6px] font-black px-1 uppercase shadow-sm">Discovery</div>
                            </div>
                            <p className="text-[9px] font-black uppercase mt-2 truncate text-slate-600 group-hover:text-black">{c.location}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white border-2 border-black p-6 brutalist-shadow-sm space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#cc543a]/5 -rotate-12 translate-x-4 -translate-y-4"></div>
                    <div className="flex items-center gap-2 text-[#cc543a] relative z-10">
                      <Globe size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Neighborhood Search</h4>
                    </div>
                    <p className="text-xs font-bold text-slate-600 relative z-10">Select a spot to uncover documented typographic treasures from the archives.</p>
                    <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                      <select 
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                        className="flex-1 bg-slate-50 border-2 border-black p-2 text-xs font-black uppercase cursor-pointer hover:bg-slate-100 text-black"
                      >
                        {BENGALURU_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button 
                        onClick={handleGenerateAreaZine}
                        disabled={isGenerating}
                        className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#cc543a] transition-all flex items-center justify-center gap-2 brutalist-shadow-sm active:translate-y-1"
                      >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Show Letters
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t-4 border-black pt-6">
                  <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BookOpen size={16} /> Volume Contents
                  </h4>
                  <ul className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-4">
                    {allPages.map((page, idx) => (
                      <li key={page.id} className="flex items-baseline gap-4 group">
                        <span className={`handwritten font-bold text-xl ${page.isUserContribution ? 'text-[#2d5a27]' : 'text-[#cc543a]'}`}>
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <a href={`#page-${page.id}`} className="text-lg font-black uppercase tracking-tighter text-black hover:text-[#cc543a] transition-colors border-b-2 border-transparent hover:border-black truncate block">
                          {page.title} <span className="text-[8px] opacity-40 font-black ml-1">@{page.location}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {allPages.map((page) => (
              <ZinePage key={page.id} page={page} />
            ))}
            
            <section className="bg-black text-white p-12 md:p-20 brutalist-shadow transform rotate-1 flex flex-col md:flex-row items-center justify-between gap-12 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-full bg-[#d4a017]/20 -skew-x-12 translate-x-10"></div>
              <div className="space-y-6 relative z-10">
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.85]">
                  Join the <br/> <span className="text-[#cc543a]">Fun</span>.
                </h3>
                <p className="text-slate-400 max-w-md text-lg font-medium">
                  Spotted a ghost sign or a unique script? <br/>
                  Help us build the city's lettering collection.
                </p>
              </div>
              <button 
                onClick={() => setMode(AppMode.CONTRIBUTE)}
                className="bg-[#cc543a] hover:bg-white hover:text-black text-white px-10 py-6 text-xl font-black uppercase tracking-tighter flex items-center gap-4 transition-all brutalist-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none relative z-10"
              >
                Upload Specimen <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
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

        {mode === AppMode.GUIDEBOOK && (
          <div className="space-y-12 animate-in fade-in duration-500 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 gap-4">
               <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter">The Gallery</h2>
                <p className="handwritten text-lg text-[#cc543a] font-bold">A collection of cool artifacts found on the street.</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setGeneratedZine(null)} className="text-[10px] font-black uppercase border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all">
                    Reset View
                 </button>
                 <button onClick={() => setMode(AppMode.EXPLORE)} className="text-[10px] font-black uppercase bg-black text-white px-4 py-2 hover:bg-[#cc543a] transition-all">
                    Back to Zine
                 </button>
               </div>
            </div>

            {generatedZine && (
              <div className="space-y-16 py-8 animate-in slide-in-from-top-10 duration-700">
                <div className="bg-[#cc543a] text-white p-8 brutalist-shadow rotate-1 flex justify-between items-center">
                  <div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter">Archival Scan: {selectedArea}</h3>
                    <p className="handwritten text-xl mt-2">Check out these letterings documented from the field.</p>
                  </div>
                  <Globe size={48} className="opacity-20 hidden sm:block" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {generatedZine.artifacts.map((art: any, i: number) => (
                    <div key={i} className="bg-white border-2 border-black p-6 brutalist-shadow-sm space-y-4 hover:-translate-y-2 transition-transform group">
                      <div className="aspect-square bg-[#f8f5f0] border-2 border-black flex flex-col items-center justify-center relative overflow-hidden">
                        <Type size={64} className="text-[#cc543a] opacity-20 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-2 left-2 bg-black text-white text-[7px] font-black px-1 uppercase tracking-widest z-10">Specimen Placeholder</div>
                      </div>
                      <div className="space-y-2">
                        <span className="bg-[#d4a017] text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">{art.vibe}</span>
                        <h4 className="text-xl font-black uppercase tracking-tighter leading-tight text-black">{art.title}</h4>
                        <p className="text-[9px] font-black text-slate-400 italic">{art.location}</p>
                        <p className="serif text-sm leading-relaxed text-slate-700">{art.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-12 border-t-4 border-black">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <User size={24} fill="currentColor" className="text-[#2d5a27]" /> My Discoveries
                  </h3>
               </div>
               
               {contributions.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {contributions.map((page) => (
                    <div key={page.id} className="group relative bg-white border-2 border-black brutalist-shadow-sm p-3 hover:-rotate-1 transition-all duration-300 overflow-hidden">
                      <div className="aspect-square bg-[#f8f5f0] border border-black overflow-hidden relative flex items-center justify-center">
                         {page.image ? (
                           <img src={page.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={page.title} />
                         ) : (
                           <Type size={48} className="text-[#2d5a27] opacity-20" />
                         )}
                      </div>
                      <div className="pt-3 border-t border-black/10 mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#cc543a]">{page.location}</span>
                        <p className="text-[10px] font-black truncate uppercase text-slate-900 mt-1">{page.title}</p>
                      </div>
                      <a 
                        href={`#page-${page.id}`} 
                        onClick={() => setMode(AppMode.EXPLORE)}
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity"
                      >
                         <span className="text-white text-[10px] font-black uppercase tracking-widest border border-white px-3 py-1 bg-black/40 backdrop-blur-sm">View in Zine</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : !generatedZine && (
                <div className="py-24 text-center space-y-8 bg-slate-50 border-2 border-dashed border-black/20 rounded-xl">
                  <p className="serif text-xl italic text-slate-500 max-w-sm mx-auto leading-relaxed">
                    No field artifacts have been archived yet.
                  </p>
                  <button 
                    onClick={() => setMode(AppMode.CONTRIBUTE)}
                    className="bg-[#cc543a] text-white px-12 py-5 font-black uppercase tracking-widest brutalist-shadow hover:bg-black transition-all text-sm"
                  >
                    Archive First Discovery
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.ABOUT && (
          <div className="max-w-4xl mx-auto py-20 space-y-24 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-6">
              <h2 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.7] text-black italic">
                A Personal <br/> <span className="text-[#cc543a]">Note.</span>
              </h2>
              <div className="flex items-center gap-4 text-[#d4a017]">
                <Heart size={24} fill="currentColor" />
                <span className="font-black uppercase tracking-[0.3em] text-xs">A message from Akankshya</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative">
              <div className="absolute -left-12 top-0 text-9xl font-black text-black/5 select-none pointer-events-none uppercase">NOTE</div>
              
              <div className="space-y-8 relative z-10">
                <p className="handwritten text-2xl leading-relaxed text-slate-900 font-bold">
                  Hello! This project initially started as a personal curiosity for street lettering. When I was a child, I spent my time reading magazines, books, and charts that my father collected passionately, and he eventually slyly introduced me to them. 
                </p>
                <p className="serif text-xl leading-relaxed text-slate-700 italic">
                  My mother used to show me the charts to get me to eat my food, so I believe that's how my curiosity for letterings and charts truly began—haha, call it storytelling. 
                </p>
                <p className="serif text-xl leading-relaxed text-slate-800">
                  I have been collecting, reading, and even presenting vague, open-ended projects during my time in academia, and now I believe I have something to finally get started with. I have always loved capturing lettering and investigating the stories behind them.
                </p>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="bg-black text-white p-10 brutalist-shadow-lg transform rotate-2">
                  <p className="text-lg leading-snug font-bold mb-6">
                    There is no better place to start than Bengaluru, where I aim to build an open-source platform by the people, for the people, for street lettering archival.
                  </p>
                  <p className="text-sm opacity-80 leading-relaxed font-medium">
                    The intent is to create an archive, give credit, learn, share stories, and remember our histories. I am putting something I genuinely care about and have fun doing here for you.
                  </p>
                </div>
                
                <p className="handwritten text-xl leading-relaxed text-slate-900 font-bold border-l-8 border-[#cc543a] pl-6 py-2">
                  This is my attempt to give a home to my collected letterings and, if you want, yours too. Go have fun with this! Upload your letters, describe them, or just add a fun anecdote. You can also see what others have created. And last but not least—thank you.
                </p>
              </div>
            </div>

            <div className="pt-24 border-t-8 border-black">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Letters and Bits</h3>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">A jumble of characters from everywhere.</p>
                </div>
                <div className="flex-1 max-w-lg md:text-right">
                  <p className="handwritten text-xl text-[#cc543a] font-black rotate-1 leading-tight">
                    Poke around the blocks to see where they came from! Just some cool scripts doing their thing.
                  </p>
                </div>
              </div>

              {/* Interactive Script Puzzle Component */}
              <ScriptPuzzleGrid />
            </div>
            
            <div className="py-20 text-center">
               <div className="inline-block border-b-4 border-black pb-2 mb-8">
                 <p className="handwritten text-3xl font-black italic">Curated with love.</p>
               </div>
               <div className="flex justify-center gap-12">
                  <div className="w-12 h-12 bg-[#cc543a] brutalist-shadow transform rotate-45"></div>
                  <div className="w-12 h-12 bg-black brutalist-shadow transform -rotate-12"></div>
                  <div className="w-12 h-12 bg-[#d4a017] brutalist-shadow transform rotate-12"></div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation - Bottom Bar */}
      <nav className="sticky bottom-8 self-center w-[92%] md:w-[65%] bg-white border-4 border-black p-4 flex justify-between items-center z-50 brutalist-shadow-lg mx-auto mb-10 transition-all hover:scale-[1.01]">
        <button onClick={() => setMode(AppMode.EXPLORE)} className={`flex-1 flex flex-col items-center gap-1 font-black text-[10px] uppercase tracking-widest transition-all ${mode === AppMode.EXPLORE ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Compass size={24} />
          <span>Explore</span>
        </button>
        <button onClick={() => setMode(AppMode.CONTRIBUTE)} className={`flex-1 flex flex-col items-center gap-1 font-black text-[10px] uppercase tracking-widest transition-all ${mode === AppMode.CONTRIBUTE ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <PlusCircle size={24} />
          <span>Contribute</span>
        </button>
        <button onClick={() => setMode(AppMode.GUIDEBOOK)} className={`flex-1 flex flex-col items-center gap-1 font-black text-[10px] uppercase tracking-widest transition-all ${mode === AppMode.GUIDEBOOK ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Layout size={24} />
          <span>Gallery</span>
        </button>
        <button onClick={() => setMode(AppMode.ABOUT)} className={`flex-1 flex flex-col items-center gap-1 font-black text-[10px] uppercase tracking-widest transition-all ${mode === AppMode.ABOUT ? 'text-[#cc543a]' : 'text-slate-400 hover:text-black'}`}>
          <Info size={24} />
          <span>Info</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
