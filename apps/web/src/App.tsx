import React, { useState, useEffect } from 'react';
import { AppMode, ZinePageData } from './types';
import { ZINE_PAGES, API_BASE_URL } from './constants';
import ZinePage from './components/ZinePage';
import ContributionPanel from './components/ContributionPanel';
import Header from './components/Header';
import MapSection from './components/MapSection';
import { Type, Heart, Puzzle, AlertTriangle, Map as MapIcon, Loader2, PlusCircle } from 'lucide-react';
import './index.css';

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

const ScriptPuzzleGrid: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState(true);

  // Senior Engineer approach: Pull data from the source of truth (the DB)
  const fetchGallery = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/letterings?limit=50&offset=0`);
      
      if (!response.ok) throw new Error('Failed to fetch gallery');
      
      const data = await response.json();
      
      // Defensively handle the Rust PaginatedResponse format
      // data.letterings matches your get_letterings/dto.rs
      const rawItems = data.letterings || [];
      
      const backendContributions: ZinePageData[] = rawItems.map((item: any) => ({
        id: item.id,
        // Entity names are snake_case in Rust
        title: `${item.contributor_tag}'s Discovery` || 'Untitled Specimen',
        location: item.pin_code,
        culturalContext: item.detected_text || 'Archived street lettering',
        historicalNote: `Status: ${item.status}. Archived on ${new Date(item.created_at).toLocaleDateString()}`,
        image: item.image_url, 
        imageSource: item.contributor_tag,
        sourceUrl: '',
        vibe: item.ml_metadata?.style || 'Community Archive',
        readMoreUrl: '',
        isUserContribution: true,
        contributorName: item.contributor_tag,
      }));

      setContributions(backendContributions);
    } catch (err) {
      console.error("Gallery fetch error:", err);
      // Fallback: Check local storage only if API is unreachable
      const saved = localStorage.getItem('blr_lettering_contributions');
      if (saved) {
        setContributions(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleAddContribution = (newEntry: ZinePageData) => {
    setContributions((prev) => [newEntry, ...prev]);
  };

  const handleDeleteContribution = async (id: string | number) => {
    if (window.confirm("Are you sure you want to remove this specimen?")) {
      try {
        // Only attempt API delete for real IDs
        if (typeof id === 'string' && id.length > 20) {
           const response = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}`, { method: 'DELETE' });
           if (!response.ok) throw new Error("Delete failed on server");
        }
        
        setContributions((prev) => prev.filter(c => c.id !== id));
      } catch (e) {
        console.error("Delete failed", e);
        alert("Could not delete from archive. Please try again.");
      }
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

               {isLoading ? (
                 <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <Loader2 size={48} className="animate-spin text-[#cc543a]" />
                    <p className="text-[10px] font-black uppercase tracking-widest animate-pulse italic">Connecting to the Archive Matrix...</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
                   {allPages.slice(0, 10).map((page, idx) => (
                     <div key={page.id} className={`group bg-white border-2 border-black p-3 brutalist-shadow-sm hover:-translate-y-1 transition-all ${idx % 3 === 0 ? 'md:col-span-2 md:row-span-1' : ''}`}>
                        <a href={`#page-${page.id}`} className="block space-y-4">
                          <div className="aspect-square bg-slate-100 border border-black overflow-hidden relative">
                             {page.image ? (
                               <img src={page.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={page.title} onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'; }} />
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
               )}
            </section>

            <section className="max-w-5xl pt-20 border-t-8 border-black">
              <div className="space-y-10">
                <p className="serif text-3xl md:text-5xl leading-tight text-slate-900 font-black max-w-4xl tracking-tighter">
                  What started as a personal curiosity for street letterforms has grown into a collaborative digital museum. 
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  <div className="space-y-8">
                    <p className="serif text-2xl leading-relaxed text-slate-700 italic font-bold border-l-8 border-[#cc543a] pl-8 py-2">
                      This is an attempt to archive and create a museum for your captured street letterings, hand-painted signs, unique stencils, and whatever typographic moments made you stop and click.
                    </p>
                  </div>
                  <div className="bg-slate-50 border-4 border-black p-8 brutalist-shadow-lg">
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 border-b-2 border-black pb-4">How It Works</h3>
                    <ol className="space-y-6">
                      {[
                        { icon: Type, text: 'Capture unique lettering in the wild' },
                        { icon: MapIcon, text: 'Tag it with a location (PIN code)' },
                        { icon: PlusCircle, text: 'Upload to the public archive' },
                        { icon: Heart, text: 'Preserve urban linguistic heritage' }
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-4 group">
                          <div className="flex-shrink-0 w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg group-hover:bg-[#cc543a] transition-colors">
                            {i + 1}
                          </div>
                          <div className="flex-1 pt-2 text-base font-bold text-slate-800">{step.text}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-12 pt-20 border-t-8 border-black">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Script Matrix</h2>
              <ScriptPuzzleGrid />
            </section>

            <section className="space-y-12 pt-20 border-t-8 border-black">
              <MapSection />
            </section>

            <section className="space-y-12 pt-20 border-t-8 border-black">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Complete Archive</h2>
              <div className="space-y-12">
                {allPages.map((page) => (
                  <div key={page.id} id={`page-${page.id}`}>
                    <ZinePage page={page} onDelete={page.isUserContribution ? handleDeleteContribution : undefined} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.CONTRIBUTE && (
          <ContributionPanel 
            onSubmit={handleAddContribution} 
            onCancel={() => setMode(AppMode.EXPLORE)} 
          />
        )}

        {mode === AppMode.ABOUT && (
          <div className="max-w-3xl mx-auto space-y-12 pb-24">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">About This Project</h1>
            <div className="space-y-8 text-lg leading-relaxed text-slate-700">
              <p className="text-2xl font-bold">Preserving disappearing linguistic artifacts.</p>
              <div className="bg-slate-50 border-4 border-black p-8 brutalist-shadow-lg space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Stack</h3>
                <ul className="space-y-2 font-mono text-sm">
                  <li>• Rust (Axum) + Postgres + R2</li>
                  <li>• ML: ONNX + OCR Pipeline</li>
                  <li>• React + TS + Tailwind</li>
                </ul>
              </div>
              <button onClick={() => setMode(AppMode.EXPLORE)} className="bg-[#cc543a] text-white px-8 py-4 text-sm font-black uppercase tracking-widest brutalist-shadow-sm">
                Back to Gallery
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;