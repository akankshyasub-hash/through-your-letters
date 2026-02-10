import React, { useState, useEffect } from "react";
import { AppMode, ZinePageData, Lettering } from "./types";
import { API_BASE_URL } from "./constants";
import Header from "./components/Header";
import ZinePage from "./components/ZinePage";
import ContributionPanel from "./components/ContributionPanel";
import MapSection from "./components/MapSection";
import AdminPanel from "./components/AdminPanel";
import ToastContainer from "./components/ui/ToastContainer";
import { useToastStore } from "./store/useToastStore";
import {
  Compass,
  PlusCircle,
  Globe,
  Loader2,
  Puzzle,
  Map as MapIcon,
  Info,
} from "lucide-react";

const SCRIPT_SPECIMENS = [
  { char: "ଅ", lang: "Odia", font: "odia", color: "bg-[#cc543a] text-white" },
  { char: "ಕ", lang: "Kannada", font: "kannada", color: "bg-black text-white" },
  {
    char: "ಅ",
    lang: "Kannada",
    font: "kannada",
    color: "bg-slate-200 text-black",
  },
  {
    char: "अ",
    lang: "Hindi",
    font: "devanagari",
    color: "bg-[#cc543a] text-white",
  },
  {
    char: "ह",
    lang: "Marathi",
    font: "devanagari",
    color: "bg-black text-white",
  },
  {
    char: "അ",
    lang: "Malayalam",
    font: "malayalam",
    color: "bg-[#2d5a27] text-white",
  },
  { char: "ا", lang: "Urdu", font: "urdu", color: "bg-[#d4a017] text-white" },
  {
    char: "ꯀ",
    lang: "Manipuri",
    font: "latin",
    color: "bg-slate-800 text-white",
  },
  { char: "A", lang: "Latin", font: "", color: "bg-slate-100 text-black" },
];

const ScriptPuzzleGrid = () => {
  const [activeItem, setActiveItem] = useState<number | null>(null);
  return (
    <div className="pixel-grid">
      {SCRIPT_SPECIMENS.map((item, idx) => (
        <button
          key={idx}
          onClick={() => setActiveItem(idx === activeItem ? null : idx)}
          className={`${item.color} aspect-square flex items-center justify-center border border-black/10 relative overflow-hidden group`}
        >
          <span
            className={`text-2xl font-black ${item.font} transition-transform group-hover:scale-125`}
          >
            {item.char}
          </span>
          {activeItem === idx && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-1">
              <span className="text-[7px] font-black uppercase text-white mb-1">
                {item.lang}
              </span>
              <div className="w-4 h-[1px] bg-[#cc543a]"></div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  // Fix: Detect Admin from URL immediately
  const [mode, setMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("admin") ? AppMode.ADMIN : AppMode.EXPLORE;
  });

  const [letterings, setLetterings] = useState<ZinePageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const fetchLetterings = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/v1/letterings?limit=50&offset=0`,
      );
      const data = await res.json();
      const formatted = data.letterings.map((item: Lettering) => ({
        id: item.id,
        title: item.detected_text || "Street Discovery",
        location: item.pin_code,
        culturalContext:
          item.cultural_context ||
          item.description ||
          "Archived street typography from the city.",
        historicalNote: `Status: ${item.status}. Archived: ${new Date(item.created_at).toLocaleDateString()}`,
        image: item.image_url,
        thumbnail: item.thumbnail_urls.small,
        vibe: item.ml_metadata?.style || "Handcrafted",
        isUserContribution: true,
        contributorName: item.contributor_tag,
        description: item.description,
      }));
      setLetterings(formatted);
    } catch (e) {
      addToast("Archive connection failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Permanently delete this specimen?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("Specimen deleted", "success");
        fetchLetterings();
      } else throw new Error();
    } catch (e) {
      addToast("Delete failed", "error");
    }
  };

  useEffect(() => {
    fetchLetterings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture">
      <div className="grain-overlay"></div>
      <Header mode={mode} setMode={setMode} />
      <ToastContainer />

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-16 relative">
        {mode === AppMode.ADMIN && (
          <AdminPanel onClose={() => setMode(AppMode.EXPLORE)} />
        )}

        {mode === AppMode.EXPLORE && (
          <div className="space-y-40 pb-24">
            <section className="space-y-12">
              <div className="flex justify-between items-end border-b-4 border-black pb-8">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                  The Gallery
                </h2>
                <button
                  onClick={() => setMode(AppMode.CONTRIBUTE)}
                  className="bg-[#cc543a] text-white px-6 py-3 text-[10px] font-black uppercase brutalist-shadow-sm hover:bg-black transition-all"
                >
                  Add Discovery
                </button>
              </div>
              {loading ? (
                <Loader2 className="animate-spin mx-auto text-[#cc543a]" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {letterings.slice(0, 10).map((page, idx) => (
                    <div
                      key={page.id}
                      className={`group bg-white border-2 border-black p-3 brutalist-shadow-sm hover:-translate-y-1 transition-all ${idx % 3 === 0 ? "md:col-span-2" : ""}`}
                    >
                      <a href={`#page-${page.id}`} className="block space-y-4">
                        <img
                          src={page.thumbnail || page.image}
                          className="aspect-square w-full object-cover border border-black grayscale group-hover:grayscale-0"
                          alt={page.title}
                        />
                        <p className="text-[11px] font-black uppercase truncate text-black">
                          {page.title}
                        </p>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-black text-white p-10 brutalist-shadow space-y-8 relative overflow-hidden group">
              <div className="flex items-center gap-3 text-[#d4a017]">
                <Globe size={20} />
                <h4 className="text-[11px] font-black uppercase tracking-widest">
                  Museum Access
                </h4>
              </div>
              <p className="text-sm font-bold text-slate-300">
                Browse the complete archive to discover documented typographic
                stories from the city.
              </p>
              <button
                onClick={() =>
                  document
                    .getElementById("archive-root")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-[#cc543a] px-5 py-4 text-[11px] font-black uppercase hover:bg-white hover:text-black transition-all"
              >
                Enter Archive
              </button>
            </section>

            <div id="archive-root" className="space-y-32">
              {letterings.map((page) => (
                <ZinePage key={page.id} page={page} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {mode === AppMode.CONTRIBUTE && (
          <ContributionPanel
            onCancel={() => setMode(AppMode.EXPLORE)}
            onSubmit={() => {
              fetchLetterings();
              setMode(AppMode.EXPLORE);
            }}
          />
        )}
        {mode === AppMode.MAP && <MapSection />}
        {mode === AppMode.ABOUT && (
          <div className="max-w-4xl mx-auto py-20 space-y-32">
            <h2 className="text-7xl md:text-9xl font-black uppercase italic leading-[0.7]">
              A Personal <span className="text-[#cc543a]">Note.</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <div className="space-y-8">
                <p className="handwritten text-2xl leading-relaxed font-bold border-l-4 border-black pl-8">
                  This project started as a personal curiosity for street
                  lettering. When I was a child, I spent my time reading
                  magazines and books that my father collected passionately...
                </p>
                <p className="serif text-xl italic text-slate-700">
                  My mother used to show me those same charts to get me to eat
                  my food, so I believe that's where my fascination with
                  letterforms truly began.
                </p>
              </div>
              <div className="bg-black text-white p-14 brutalist-shadow-lg transform rotate-1">
                <p className="text-xl font-bold mb-4 italic">
                  I aim to build an open-source platform by the people, for the
                  people, for street lettering archival.
                </p>
                <p className="text-base opacity-80">
                  Capture yours, and thank you.
                </p>
              </div>
            </div>
            <div className="pt-32 border-t-8 border-black">
              <h3 className="text-5xl font-black uppercase mb-12 flex items-center gap-4">
                <Puzzle size={40} /> Letters and Bits
              </h3>
              <ScriptPuzzleGrid />
            </div>
          </div>
        )}
      </main>

      <nav className="sticky bottom-10 self-center w-[92%] md:w-[65%] bg-white border-4 border-black p-6 flex justify-between items-center z-50 brutalist-shadow-lg mx-auto mb-10 transition-all hover:scale-[1.01]">
        <button
          onClick={() => setMode(AppMode.EXPLORE)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.EXPLORE ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <Compass size={28} />
          Explore
        </button>
        <button
          onClick={() => setMode(AppMode.CONTRIBUTE)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.CONTRIBUTE ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <PlusCircle size={28} />
          Contribute
        </button>
        <button
          onClick={() => setMode(AppMode.MAP)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.MAP ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <MapIcon size={28} />
          Map
        </button>
        <button
          onClick={() => setMode(AppMode.ABOUT)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.ABOUT ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <Info size={28} />
          Info
        </button>
      </nav>
    </div>
  );
};

export default App;
