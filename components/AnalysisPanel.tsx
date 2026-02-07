
import React, { useState, useRef, useEffect } from 'react';
import { analyzeStreetSign } from '../services/geminiService';
import { Loader2, Upload, Search, X, CheckCircle2, Image as ImageIcon, Database, BookmarkCheck } from 'lucide-react';
import { BENGALURU_REGIONS } from '../constants';
import { ZinePageData } from '../types';

interface AnalysisPanelProps {
  onBack: () => void;
  onAddContribution?: (entry: ZinePageData) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ onBack, onAddContribution }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [neighborhood, setNeighborhood] = useState(BENGALURU_REGIONS[0]);
  const [importSource, setImportSource] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic redirect after successful archiving
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        onBack();
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, onBack]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setImportSource('local');
        setIsSubmitted(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateGoogleImport = (source: 'Photos' | 'Drive') => {
    setLoading(true);
    setImportSource(source);
    setTimeout(() => {
      setLoading(false);
      fileInputRef.current?.click();
    }, 800);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await analyzeStreetSign(image, neighborhood);
      setResult(data);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Something went wrong with the curatorial bot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!image || !result || !onAddContribution) return;

    const newEntry: ZinePageData = {
      id: `lab_${Date.now()}`,
      title: result.style || "Street Specimen",
      location: neighborhood,
      culturalContext: result.observation || "Typographic artifact analyzed in Curator Lab.",
      historicalNote: `Material: ${result.materialGuess || 'Unknown'}. Script: ${result.script || 'Unknown'}. Documented via Curator Lab.`,
      image: image,
      imageSource: "Curator Lab Researcher",
      sourceUrl: "#",
      vibe: result.script || "Archival",
      readMoreUrl: "#",
      isUserContribution: true
    };

    onAddContribution(newEntry);
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tighter text-[#cc543a] brutalist-shadow-sm bg-white px-4 inline-block transform -rotate-1">
            Curator Lab
          </h2>
          <p className="block text-[10px] font-black bg-black text-white px-2 py-0.5 mt-2 uppercase tracking-widest">
            DOCUMENTATION MODULE // SPECIMEN ANALYSIS
          </p>
        </div>
        <button onClick={onBack} className="bg-black text-white p-2 hover:bg-[#cc543a] transition-colors brutalist-shadow-sm">
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Upload Side */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Neighborhood Context
            </label>
            <select 
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={isSubmitted}
              className="w-full bg-[#f8f5f0] border-4 border-black p-4 font-black text-lg appearance-none focus:outline-none focus:ring-4 focus:ring-[#cc543a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {BENGALURU_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {!isSubmitted && (
            <div className="flex flex-col gap-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Import Source
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-3 border-2 border-black bg-white hover:bg-slate-50 transition-all font-black text-[9px] uppercase gap-1 brutalist-shadow-sm active:translate-y-0.5 active:shadow-none"
                >
                  <Upload size={16} />
                  Local
                </button>
                <button 
                  onClick={() => simulateGoogleImport('Photos')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-black bg-white hover:bg-slate-50 transition-all font-black text-[9px] uppercase gap-1 brutalist-shadow-sm active:translate-y-0.5 active:shadow-none"
                >
                  <ImageIcon size={16} className="text-blue-600" />
                  Photos
                </button>
                <button 
                  onClick={() => simulateGoogleImport('Drive')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-black bg-white hover:bg-slate-50 transition-all font-black text-[9px] uppercase gap-1 brutalist-shadow-sm active:translate-y-0.5 active:shadow-none"
                >
                  <Database size={16} className="text-green-600" />
                  Drive
                </button>
              </div>
            </div>
          )}

          <div 
            className={`relative border-4 border-black aspect-[4/3] flex flex-col items-center justify-center p-2 bg-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] ${!image && !isSubmitted ? 'hover:shadow-[8px_8px_0px_0px_rgba(204,84,58,1)] cursor-pointer' : ''}`}
            onClick={() => !image && !isSubmitted && fileInputRef.current?.click()}
          >
            {image ? (
              <div className="w-full h-full relative group">
                <img src={image} className="w-full h-full object-cover border-2 border-black grayscale contrast-125" />
                {!isSubmitted && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-black uppercase text-xs tracking-widest bg-black px-4 py-2">Replace Specimen</p>
                  </div>
                )}
                {importSource && (
                  <div className="absolute bottom-2 left-2 bg-[#d4a017] text-white text-[8px] px-2 py-1 font-black uppercase tracking-widest shadow-sm">
                    {importSource}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 p-6">
                <div className="w-16 h-16 bg-[#f8f5f0] border-4 border-black mx-auto flex items-center justify-center transform rotate-3 brutalist-shadow-sm">
                   <ImageIcon size={32} className="text-slate-300" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Awaiting Artifact<br/>Tap to mount specimen
                </p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>

          {!isSubmitted && (
            <button
              onClick={handleAnalyze}
              disabled={!image || loading}
              className={`w-full py-5 text-sm font-black border-4 border-black flex items-center justify-center gap-3 transition-all brutalist-shadow active:translate-y-1 active:shadow-none ${!image || loading ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed' : 'bg-black text-white hover:bg-[#cc543a]'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              {loading ? "SEARCHING ARCHIVES..." : "EXTRACT METADATA"}
            </button>
          )}
        </div>

        {/* Right: Results Side */}
        <div className="bg-white border-4 border-black p-8 min-h-[400px] relative overflow-hidden flex flex-col brutalist-shadow">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {!result && !loading && !isSubmitted && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
              <div className="w-20 h-20 border-4 border-black flex items-center justify-center transform -rotate-6">
                <BookmarkCheck size={40} />
              </div>
              <p className="font-black uppercase text-xs tracking-widest">Awaiting Analysis</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center space-y-8">
              <div className="relative">
                <div className="w-16 h-16 bg-[#d4a017] border-4 border-black animate-bounce"></div>
                <div className="w-16 h-16 bg-[#cc543a] border-4 border-black absolute top-2 left-2 -z-10 animate-pulse"></div>
              </div>
              <div className="space-y-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Scanning scripts...</p>
                <p className="text-[8px] text-black font-black uppercase bg-[#d4a017] px-2 py-1 inline-block border-2 border-black">
                  Ref: {neighborhood}
                </p>
              </div>
            </div>
          )}

          {(result || isSubmitted) && (
            <div className="space-y-8 relative z-10 animate-in zoom-in-95 duration-500 h-full flex flex-col">
              {isSubmitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10">
                  <div className="w-24 h-24 bg-[#2d5a27] text-white flex items-center justify-center rounded-full border-4 border-black brutalist-shadow animate-in zoom-in duration-500">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Artifact Archived</h3>
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest italic">Added to the city lettering map!</p>
                  </div>

                  {/* Visual Confirmation Preview */}
                  <div className="bg-[#f8f5f0] border-4 border-black p-3 brutalist-shadow-sm rotate-2 max-w-[240px] animate-in slide-in-from-bottom-4 duration-700">
                    <div className="aspect-square w-full overflow-hidden border-2 border-black mb-3 grayscale contrast-125">
                      <img src={image || ''} className="w-full h-full object-cover" alt="Archived preview" />
                    </div>
                    <div className="text-left px-1 space-y-1">
                      <p className="text-[11px] font-black uppercase truncate leading-none text-black">
                        {result?.style || "Specimen"}
                      </p>
                      <p className="text-[9px] font-bold text-[#cc543a] uppercase tracking-tighter truncate">
                        {neighborhood}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 w-full">
                    <p className="text-[10px] font-black uppercase text-slate-500 animate-pulse">Auto-redirecting to Zine...</p>
                    <button onClick={onBack} className="w-full bg-black text-white py-4 font-black uppercase tracking-widest text-xs brutalist-shadow hover:bg-[#cc543a] transition-all">
                      Return Home Now
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#2d5a27] border-2 border-black flex items-center justify-center text-white">
                       <CheckCircle2 size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d5a27]">Analysis Successful</span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Classification</h3>
                      <p className="text-4xl font-black text-black leading-none tracking-tighter uppercase">{result.style}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Script Type</h3>
                        <p className="text-xs font-black bg-black text-white px-2 py-1 inline-block uppercase tracking-widest">{result.script}</p>
                      </div>
                      <div>
                        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</h3>
                        <p className="text-xs font-black text-[#cc543a] uppercase tracking-widest">{result.materialGuess}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t-2 border-black/5">
                      <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Field Insight</h3>
                      <p className="serif text-base font-bold italic leading-relaxed text-slate-700">
                        "{result.observation}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4 pt-8">
                    <button 
                      onClick={handleSubmit}
                      className="w-full bg-[#cc543a] text-white py-4 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all brutalist-shadow active:translate-y-1 active:shadow-none"
                    >
                      <BookmarkCheck size={20} />
                      Submit for Archiving
                    </button>
                    
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-300 border-t border-black/5 pt-4">
                      <span>ID_LAB_{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                      <span>{neighborhood} // BLR_ARCHIVE</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
