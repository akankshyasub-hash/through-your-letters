
import React, { useState, useRef, useEffect } from 'react';
import { analyzeStreetSign, QuotaExceededError } from '../services/geminiService';
import { Loader2, Upload, Search, X, Image as ImageIcon, CheckCircle, ArrowRight, Bookmark, Link2, AlertTriangle, RefreshCw } from 'lucide-react';
import { BENGALURU_REGIONS } from '../constants';
import { ZinePageData } from '../types';

interface ContributionPanelProps {
  onBack: () => void;
  onAddContribution: (entry: ZinePageData) => void;
}

const ContributionPanel: React.FC<ContributionPanelProps> = ({ onBack, onAddContribution }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [lastArchived, setLastArchived] = useState<{title: string, location: string} | null>(null);
  const [form, setForm] = useState({
    neighborhood: BENGALURU_REGIONS[0],
    customNeighborhood: '',
    description: '',
    imageSourceName: '',
    imageSourceUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Automatic redirect after success
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => {
        onBack();
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [saved, onBack]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onerror = () => reject(new Error("Failed to load image for processing."));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Reduced size slightly more to ensure it fits in localStorage alongside other entries
        const MAX_SIZE = 600; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed."));
        // Draw with a slight reduction in quality (0.5) to keep file size small
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      setIsQuotaError(false);
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onerror = () => {
        setError("File read failed.");
        setIsProcessingImage(false);
      };
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressed = await compressImage(rawBase64);
          setImage(compressed);
          setResult(null);
          setSaved(false);
        } catch (err) {
          console.error("Processing failed", err);
          setError("Image processing failed. Try a different photo.");
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setIsQuotaError(false);
    try {
      const finalNeighborhood = form.neighborhood.includes("Other") ? (form.customNeighborhood || "Bengaluru Streets") : form.neighborhood;
      const data = await analyzeStreetSign(image, finalNeighborhood);
      if (data) {
        setResult(data);
      } else {
        throw new Error("No analysis data returned.");
      }
    } catch (error: any) {
      console.error("Analysis failed", error);
      if (error instanceof QuotaExceededError) {
        setIsQuotaError(true);
        setError(error.message);
      } else {
        setError("AI analysis failed. You can still archive it as a 'Field Discovery' manually.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToZine = (isInstant: boolean = false) => {
    if (!image) return;
    const finalNeighborhood = form.neighborhood.includes("Other") ? (form.customNeighborhood || "Bengaluru Streets") : form.neighborhood;
    
    // Fallback logic for title if AI analysis failed or was skipped
    let title = "Field Discovery";
    if (!isInstant && result?.style) {
      title = result.style;
    } else if (form.customNeighborhood) {
      title = form.customNeighborhood;
    } else if (form.description) {
      // Use first word of description as a hint
      title = form.description.split(' ').slice(0, 2).join(' ') + "...";
    }
    
    const newEntry: ZinePageData = {
      id: `user_${Date.now()}`,
      title: title,
      location: finalNeighborhood,
      culturalContext: isInstant ? (form.description || "Manual documentation of a street find.") : (result?.observation || "Interesting typeface found."),
      historicalNote: form.description || "Archived by field contributor.",
      image: image,
      imageSource: form.imageSourceName || "Field Contributor",
      sourceUrl: form.imageSourceUrl || "#",
      vibe: isInstant ? "Street Type" : (result?.script || "Unknown Script"),
      readMoreUrl: "#",
      isUserContribution: true
    };
    onAddContribution(newEntry);
    setLastArchived({ title, location: finalNeighborhood });
    setSaved(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-10 duration-700 pb-32">
      <div className="flex justify-between items-center bg-black text-white p-6 brutalist-shadow mb-12">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Contributor Lab</h2>
          <p className="handwritten text-sm text-[#d4a017] mt-1 italic">Preserving the city's lettered soul...</p>
        </div>
        <button onClick={onBack} className="p-2 bg-white text-black hover:bg-[#cc543a] hover:text-white transition-colors border-2 border-black">
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-10">
           <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] bg-[#2d5a27] text-white px-2 py-1 inline-block">Step 01: Capture Lettering</h4>
                {image && !saved && (
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black uppercase text-[#cc543a] flex items-center gap-1 hover:underline">
                    <RefreshCw size={10} /> Change Image
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Upload Photo', icon: <ImageIcon size={16} /> },
                  { name: 'Browse Files', icon: <Upload size={16} /> }
                ].map((src) => (
                  <button 
                    key={src.name}
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-black bg-white text-black transition-all text-[11px] font-black uppercase brutalist-shadow-sm hover:bg-slate-50 active:translate-y-0.5 active:shadow-none"
                  >
                    {src.icon}
                    {src.name}
                  </button>
                ))}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
           </section>

           <div className="relative group bg-slate-100 border-4 border-black p-4 brutalist-shadow-sm min-h-[300px] flex items-center justify-center transition-colors overflow-hidden">
              {isProcessingImage ? (
                <Loader2 size={48} className="animate-spin text-[#cc543a]" />
              ) : image ? (
                <div className="w-full relative animate-in fade-in duration-300">
                  <img src={image} className="w-full h-auto max-h-[500px] object-contain border-2 border-black shadow-lg bg-white" alt="Preview" />
                  <div className="absolute top-2 right-2 bg-black text-white text-[8px] font-black uppercase px-2 py-1">Captured Artifact</div>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="text-center p-12 border-4 border-dashed border-black/10 w-full flex flex-col items-center cursor-pointer hover:bg-black/5 group">
                  <ImageIcon size={64} className="mb-4 text-black/20 group-hover:text-[#cc543a] transition-colors" />
                  <p className="text-sm font-black uppercase tracking-widest text-black/40 group-hover:text-black">Drop Specimen Image Here</p>
                </div>
              )}
           </div>

           {error && (
             <div className={`p-6 border-4 border-black brutalist-shadow-sm flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500 ${isQuotaError ? 'bg-orange-50' : 'bg-red-50'}`}>
               <div className="flex items-start gap-4">
                 <div className={`p-2 rounded-full ${isQuotaError ? 'bg-orange-200 text-orange-700' : 'bg-red-200 text-red-700'}`}>
                    <AlertTriangle size={24} />
                 </div>
                 <div>
                   <h5 className="font-black uppercase text-xs tracking-widest mb-1">System Limitation</h5>
                   <p className="text-xs font-bold leading-relaxed">{error}</p>
                 </div>
               </div>
               {isQuotaError && (
                 <div className="pt-4 border-t border-black/10 space-y-3">
                   <p className="text-[10px] font-bold text-slate-500 italic">The AI is resting, but you don't have to wait. Archive it manually below to save your find!</p>
                   <button onClick={() => handleSaveToZine(true)} className="w-full bg-black text-white py-3 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-[#cc543a] transition-all">
                      Archive Manually <ArrowRight size={14} />
                   </button>
                 </div>
               )}
             </div>
           )}

           {image && !saved && !isQuotaError && (
             <div className="bg-[#cc543a]/5 border-2 border-[#cc543a] p-6 space-y-4 brutalist-shadow-sm">
                <button onClick={() => handleSaveToZine(true)} className="w-full bg-black text-white py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#cc543a] transition-all">
                  Instant Archive Discovery <ArrowRight size={16} />
                </button>
                <p className="text-[10px] text-slate-400 italic text-center">Save directly without AI metadata extraction.</p>
             </div>
           )}
        </div>

        <div className="space-y-8 bg-white p-8 md:p-10 border-4 border-black brutalist-shadow flex flex-col transition-colors">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cc543a]">Step 02: Analysis & Location</h4>
          
          <div className="space-y-6 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neighborhood</label>
              <select 
                value={form.neighborhood}
                onChange={(e) => setForm({...form, neighborhood: e.target.value})}
                className="w-full bg-slate-50 border-2 border-black p-4 text-base font-black text-black appearance-none focus:bg-white transition-colors"
              >
                {BENGALURU_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {form.neighborhood.includes("Other") && (
              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specific Area Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Richmond Town, Kammanahalli"
                  value={form.customNeighborhood}
                  onChange={(e) => setForm({...form, customNeighborhood: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-black p-4 text-sm font-black text-black focus:bg-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discovery Caption / Anecdote</label>
              <textarea 
                placeholder="Where exactly was this? Describe the typeface or the story behind it."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full bg-slate-50 border-2 border-black p-4 text-sm font-medium text-black focus:outline-none focus:border-[#cc543a] focus:bg-white"
              />
            </div>

            {!result && !saved && !isQuotaError && (
              <button
                onClick={handleAnalyze}
                disabled={!image || loading}
                className={`w-full py-6 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 brutalist-shadow transition-all ${!image || loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 shadow-none' : 'bg-black text-white hover:bg-[#cc543a] border-black'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                Extract Type Metadata
              </button>
            )}

            {result && !saved && (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="p-6 bg-[#2d5a27]/5 border-2 border-dashed border-[#2d5a27] space-y-4">
                  <div className="flex justify-between items-start">
                    <p className="text-xl font-black tracking-tighter uppercase text-slate-900 leading-none">{result.style}</p>
                    <span className="text-[8px] font-black bg-[#2d5a27] text-white px-2 py-0.5 uppercase tracking-widest">{result.script}</span>
                  </div>
                  <p className="serif italic text-slate-700 leading-relaxed text-sm border-l-2 border-[#2d5a27] pl-3">"{result.observation}"</p>
                </div>
                <button onClick={() => handleSaveToZine(false)} className="w-full py-6 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 brutalist-shadow bg-[#2d5a27] text-white hover:bg-black transition-colors">
                  <Bookmark size={20} />
                  Archive Specimen
                </button>
              </div>
            )}

            {saved && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in py-8">
                <div className="w-20 h-20 bg-[#2d5a27] text-white flex items-center justify-center rounded-full border-4 border-black brutalist-shadow">
                  <CheckCircle size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Artifact Archived</h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 italic">Successfully added to the zine!</p>
                </div>
                
                {/* Visual Confirmation Preview */}
                <div className="bg-[#f8f5f0] border-2 border-black p-2 brutalist-shadow-sm rotate-1 max-w-[200px] animate-in zoom-in-95 duration-500">
                  <div className="aspect-square w-full overflow-hidden border border-black mb-2 bg-white">
                    <img src={image || ''} className="w-full h-full object-cover grayscale contrast-125" alt="Archived preview" />
                  </div>
                  <div className="text-left px-1 space-y-0.5">
                    <p className="text-[10px] font-black uppercase truncate leading-none">{lastArchived?.title}</p>
                    <p className="text-[8px] font-bold text-[#cc543a] uppercase tracking-tighter truncate">{lastArchived?.location}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 animate-pulse">Redirecting to gallery...</p>
                  <button onClick={onBack} className="bg-black text-white px-8 py-3 font-black uppercase tracking-widest text-xs brutalist-shadow hover:bg-[#cc543a] transition-all">
                    Return Home Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionPanel;
