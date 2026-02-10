import React from "react";
import { ZinePageData } from "../types";
import { MapPin, Share2, Trash2, AlertTriangle, AlignLeft } from "lucide-react";
import { useToastStore } from "../store/useToastStore";
import { API_BASE_URL } from "../constants";

const ZinePage: React.FC<{
  page: ZinePageData;
  onDelete?: (id: string | number) => void;
}> = ({ page, onDelete }) => {
  const { addToast } = useToastStore();

  const handleShare = async () => {
    const url = `${window.location.origin}/#page-${page.id}`;
    const shareData = {
      title: `Through Your Letters: ${page.title}`,
      text: `Check out this typography artifact from ${page.location}`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        addToast("Link copied to clipboard", "success");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        addToast("Share failed", "error");
    }
  };

  const handleReport = () => {
    const reason = window.prompt("Why are you reporting this image?");
    if (!reason) return;

    fetch(`${API_BASE_URL}/api/v1/letterings/${page.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
      .then((res) => {
        if (res.ok) addToast("Report submitted for review", "success");
        else throw new Error();
      })
      .catch(() => addToast("Failed to submit report", "error"));
  };

  // Merge User Story and AI Context into one narrative block
  const narrative = page.description || page.culturalContext;

  return (
    <div
      id={`page-${page.id}`}
      className="flex flex-col md:flex-row gap-12 items-start scroll-mt-24 pb-24 border-b-2 border-black/10 last:border-b-0 overflow-hidden"
    >
      <div className="w-full md:w-3/5 relative py-6 group">
        <div className="tape absolute top-2 left-1/4 w-20 h-8 -rotate-12 opacity-70"></div>
        <div className="tape absolute -bottom-2 right-1/4 w-16 h-8 rotate-6 opacity-70"></div>

        <div className="p-3 bg-white border-2 border-black brutalist-shadow transition-all duration-500 hover:rotate-1">
          <img
            src={page.image}
            className="w-full aspect-square object-cover contrast-125 grayscale hover:grayscale-0 transition-all duration-700"
            alt={page.title}
          />
          <div className="p-4 flex justify-between items-center border-t border-black/5 mt-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#cc543a]" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {page.location}
              </span>
            </div>
            <span className="text-[9px] font-black uppercase text-slate-500">
              By {page.contributorName}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-2/5 flex flex-col space-y-8">
        <div className="flex justify-between items-start">
          <div className="bg-black text-white px-4 py-1.5 text-xs font-black uppercase rotate-1 shadow-[4px_4px_0_0_#cc543a]">
            {page.vibe}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 border-2 border-black bg-white hover:bg-slate-100"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleReport}
              className="p-2 border-2 border-black bg-white hover:bg-yellow-50 text-yellow-700"
              title="Report"
            >
              <AlertTriangle size={16} />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(page.id)}
                className="p-2 border-2 border-black bg-white hover:bg-red-600 hover:text-white text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <h2 className="text-5xl font-black tracking-tighter leading-[0.9] drop-shadow-sm break-words">
          {page.title}
        </h2>

        <div className="space-y-8">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-[#cc543a] flex items-center gap-3">
              <AlignLeft size={14} />
              <span className="tracking-widest">Museum Context & Story</span>
            </h4>
            {/* break-words and whitespace-pre-wrap ensure long text stays in layout */}
            <p className="text-xl leading-snug font-medium text-slate-900 break-words whitespace-pre-wrap">
              {narrative}
            </p>
          </div>

          <div className="bg-[#f8f5f0] p-8 border-4 border-black border-dashed relative overflow-hidden">
            <div className="absolute -top-3 left-4 bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
              Archival Record
            </div>
            <p className="serif text-lg leading-relaxed text-slate-700 italic break-words">
              {page.historicalNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZinePage;
