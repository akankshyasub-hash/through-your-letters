import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppMode, ZinePageData, Lettering } from "./types";
import { API_BASE_URL } from "./constants";
import { syncOfflineUploads } from "./lib/offlineQueue";
import { api } from "./lib/api";
import { useInfiniteGallery } from "./hooks/useLetteringGallery";
import { useWebSocket } from "./hooks/useWebSocket";
import Header from "./components/Header";
import ZinePage from "./components/ZinePage";
import ContributionPanel from "./components/ContributionPanel";
import MapSection from "./components/MapSection";
import AdminPanel from "./components/AdminPanel";
import SearchBar from "./components/SearchBar";
import ImageLightbox from "./components/ImageLightbox";
import ContributorProfile from "./components/ContributorProfile";
import CommunityPage from "./components/CommunityPage";
import ToastContainer from "./components/ui/ToastContainer";
import { useToastStore } from "./store/useToastStore";
import { useCityStore } from "./store/useCityStore";
import {
  Compass,
  PlusCircle,
  Globe,
  Loader2,
  Puzzle,
  Map as MapIcon,
  Info,
  Trophy,
} from "lucide-react";

const SCRIPT_SPECIMENS = [
  {
    char: "\u0B05",
    lang: "Odia",
    font: "odia",
    color: "bg-[#cc543a] text-white",
  },
  {
    char: "\u0C95",
    lang: "Kannada",
    font: "kannada",
    color: "bg-black text-white",
  },
  {
    char: "\u0C85",
    lang: "Kannada",
    font: "kannada",
    color: "bg-slate-200 text-black",
  },
  {
    char: "\u0905",
    lang: "Hindi",
    font: "devanagari",
    color: "bg-[#cc543a] text-white",
  },
  {
    char: "\u0939",
    lang: "Marathi",
    font: "devanagari",
    color: "bg-black text-white",
  },
  {
    char: "\u0D05",
    lang: "Malayalam",
    font: "malayalam",
    color: "bg-[#2d5a27] text-white",
  },
  {
    char: "\u0627",
    lang: "Urdu",
    font: "urdu",
    color: "bg-[#d4a017] text-white",
  },
  {
    char: "\uABC0",
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

const mapLetteringToZinePage = (item: Lettering): ZinePageData => ({
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
  imageSource: "",
  sourceUrl: "",
  vibe: item.ml_metadata?.style || "Handcrafted",
  readMoreUrl: "",
  isUserContribution: true,
  contributorName: item.contributor_tag,
  description: item.description,
  likes_count: item.likes_count || 0,
  comments_count: item.comments_count || 0,
  ml_script: item.ml_metadata?.script,
});

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("admin") ? AppMode.ADMIN : AppMode.EXPLORE;
  });

  const [searchResults, setSearchResults] = useState<ZinePageData[] | null>(
    null,
  );
  const [lightbox, setLightbox] = useState<{
    imageUrl: string;
    title: string;
    letteringId?: string | number;
  } | null>(null);
  const [contributorTag, setContributorTag] = useState<string>("");
  const [liveLetterings, setLiveLetterings] = useState<ZinePageData[]>([]);
  const { addToast } = useToastStore();
  const { selectedCityId } = useCityStore();

  // Infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteGallery(selectedCityId);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: "400px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  // Sync offline uploads when connectivity returns
  useEffect(() => {
    const handleOnline = async () => {
      const synced = await syncOfflineUploads();
      if (synced > 0) {
        addToast(
          `${synced} offline upload${synced > 1 ? "s" : ""} synced`,
          "success",
        );
        refetch();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [addToast, refetch]);

  const allLetterings: ZinePageData[] =
    data?.pages.flatMap((page) =>
      page.letterings.map(mapLetteringToZinePage),
    ) ?? [];

  const displayItems = searchResults || allLetterings;

  useWebSocket(
    useCallback((payload: unknown) => {
      const data = payload as { type?: string; id?: string };
      if (data?.type !== "PROCESSED" || !data.id) return;

      api
        .getLettering(data.id)
        .then((item) => {
          const mapped = mapLetteringToZinePage(item);
          setLiveLetterings((prev) => {
            const filtered = prev.filter(
              (p) => String(p.id) !== String(mapped.id),
            );
            return [mapped, ...filtered].slice(0, 20);
          });
        })
        .catch(() => {
          // Ignore transient fetch errors from live feed
        });
    }, []),
  );

  // const handleDelete = async (id: string | number) => {
  //   if (!window.confirm("Permanently delete this specimen?")) return;
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}`, {
  //       method: "DELETE",
  //     });
  //     if (res.ok) {
  //       addToast("Specimen deleted", "success");
  //       refetch();
  //     } else throw new Error();
  //   } catch {
  //     addToast("Delete failed", "error");
  //   }
  // };
  const adminToken = sessionStorage.getItem("ttl_admin_token");

  const handleDelete = async (id: string | number) => {
    if (!adminToken) return; // Safety check
    if (!window.confirm("Permanently delete this specimen?")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/letterings/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}` // Must include the token
        }
      });
      
      if (res.ok) {
        addToast("Specimen deleted by curator", "success");
        refetch(); // Refresh the gallery
      } else {
        const err = await res.json();
        addToast(err.error || "Delete failed", "error");
      }
    } catch {
      addToast("Network error", "error");
    }
  };

  const openContributor = (tag: string) => {
    setContributorTag(tag);
    setMode(AppMode.CONTRIBUTOR);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture">
      <div className="grain-overlay"></div>
      <Header mode={mode} setMode={setMode} />
      <ToastContainer />

      {lightbox && (
        <ImageLightbox
          imageUrl={lightbox.imageUrl}
          title={lightbox.title}
          letteringId={lightbox.letteringId}
          onClose={() => setLightbox(null)}
        />
      )}

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-16 relative">
        {mode === AppMode.ADMIN && (
          <AdminPanel onClose={() => setMode(AppMode.EXPLORE)} />
        )}

        {mode === AppMode.CONTRIBUTOR && (
          <ContributorProfile
            tag={contributorTag}
            onBack={() => setMode(AppMode.EXPLORE)}
            onSelectLettering={(page) => {
              setLightbox({
                imageUrl: page.image,
                title: page.title,
                letteringId: page.id,
              });
            }}
            mapLetteringToZinePage={mapLetteringToZinePage}
          />
        )}

        {mode === AppMode.COMMUNITY && (
          <CommunityPage
            onContributorClick={(tag) => {
              setContributorTag(tag);
              setMode(AppMode.CONTRIBUTOR);
            }}
          />
        )}

        {mode === AppMode.EXPLORE && (
          <div className="space-y-40 pb-24">
            <section className="space-y-12">
              <div className="flex justify-between items-end border-b-4 border-black pb-8">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                  {searchResults ? "Search Results" : "The Gallery"}
                </h2>
                <button
                  onClick={() => setMode(AppMode.CONTRIBUTE)}
                  className="bg-[#cc543a] text-white px-6 py-3 text-[10px] font-black uppercase brutalist-shadow-sm hover:bg-black transition-all"
                >
                  Add Discovery
                </button>
              </div>
              <SearchBar
                onResults={(results) =>
                  setSearchResults(results.map(mapLetteringToZinePage))
                }
                onClear={() => setSearchResults(null)}
              />
              {isLoading && !searchResults ? (
                <Loader2 className="animate-spin mx-auto text-[#cc543a]" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {displayItems.slice(0, 10).map((page, idx) => (
                    <div
                      key={page.id}
                      className={`group bg-white border-2 border-black p-3 brutalist-shadow-sm hover:-translate-y-1 transition-all ${idx === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
                    >
                      <button
                        onClick={() =>
                          setLightbox({
                            imageUrl: page.image,
                            title: page.title,
                            letteringId: page.id,
                          })
                        }
                        className="block w-full text-left space-y-4"
                      >
                        <img
                          src={page.thumbnail || page.image}
                          className="aspect-square w-full object-cover border border-black grayscale group-hover:grayscale-0"
                          alt={page.title}
                        />
                        <p className="text-[11px] font-black uppercase truncate text-black">
                          {page.title}
                        </p>
                      </button>
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
              {[...liveLetterings, ...displayItems]
                .filter(
                  (page, index, arr) =>
                    index ===
                    arr.findIndex((p) => String(p.id) === String(page.id)),
                )
                .map((page) => (
                  <ZinePage
                    key={page.id}
                    page={page}
                    // 2. Only pass onDelete if the user is an admin
                    onDelete={adminToken ? handleDelete : undefined} 
                    onImageClick={() =>
                      setLightbox({
                        imageUrl: page.image,
                        title: page.title,
                        letteringId: page.id,
                      })
                    }
                    onContributorClick={
                      page.contributorName
                        ? () => openContributor(page.contributorName!)
                        : undefined
                    }
                  />
                //   <ZinePage
                //     key={page.id}
                //     page={page}
                //     onDelete={handleDelete}
                //     onImageClick={() =>
                //       setLightbox({
                //         imageUrl: page.image,
                //         title: page.title,
                //         letteringId: page.id,
                //       })
                //     }
                //     onContributorClick={
                //       page.contributorName
                //         ? () => openContributor(page.contributorName!)
                //         : undefined
                //     }
                //   />
                ))}

              {/* Infinite scroll sentinel */}
              {!searchResults && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {isFetchingNextPage && (
                    <Loader2
                      size={24}
                      className="animate-spin text-[#cc543a]"
                    />
                  )}
                  {!hasNextPage && allLetterings.length > 0 && (
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
                      End of archive
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.CONTRIBUTE && (
          <ContributionPanel
            onCancel={() => setMode(AppMode.EXPLORE)}
            onSubmit={() => {
              refetch();
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
                <p className="handwritten text-2xl leading-relaxed text-slate-900 font-bold border-l-4 border-black pl-8">
                  Hello! This project started as a personal curiosity for street
                  lettering. When I was a child, I spent my time reading
                  magazines, books, and charts that my father collected
                  passionately. Every evening, when we went out for ice cream,
                  we would look at the signboards on shops and streets. He used
                  to tell me how to read and pronounce them, and eventually I
                  realized how much I love the way letters are created, styled,
                  painted and so on.
                </p>
                <p className="serif text-xl leading-relaxed text-slate-700 italic">
                  My mother used to show me those same charts to get me to eat
                  my food, so I believe that's where my fascination with
                  letterforms truly began—haha, call it storytelling.
                </p>
                <p className="serif text-xl leading-relaxed text-slate-800">
                  Throughout my time in academia, I've been collecting, reading,
                  and even presenting projects on this niche interest. Now, I
                  feel I finally have something to truly get started with. I've
                  always loved capturing lettering and investigating the stories
                  hidden behind them.
                </p>
              </div>
              <div className="space-y-12 relative z-10">
                <div className="bg-black text-white p-14 brutalist-shadow-lg transform rotate-1">
                  <p className="text-xl leading-snug font-bold mb-8 italic">
                    There is no better place to start than Bengaluru, where I
                    aim to build an open-source platform by the people, for the
                    people, for street lettering archival.
                  </p>
                  <p className="text-base opacity-80 leading-relaxed font-medium">
                    The intent is to create an archive, give credit, learn,
                    share stories, and remember our histories. I am putting
                    something I genuinely care about and have fun doing here for
                    you.
                  </p>
                </div>
                <p className="handwritten text-2xl leading-relaxed text-slate-900 font-bold border-l-8 border-[#cc543a] pl-8 py-6">
                  This is my attempt to give a home to my collected letterings
                  and, if you want, yours too. Go have fun with this! Upload
                  your letters, describe them, or just add a fun anecdote. You
                  can also see what others have created. And last but not
                  least—thank you.
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
          onClick={() => setMode(AppMode.COMMUNITY)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.COMMUNITY ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <Trophy size={28} />
          Community
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
