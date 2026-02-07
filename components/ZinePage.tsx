
import React, { useState } from 'react';
import { ZinePageData } from '../types';
import { ExternalLink, Share2, MapPin, Languages, Loader2, ChevronDown, Hash, Link2, Type } from 'lucide-react';
import { translateContent } from '../services/geminiService';

interface ZinePageProps {
  page: ZinePageData;
}

const TypographicPlaceholder = ({ title, script }: { title: string, script: string }) => {
  // Use generic Latin fallback for placeholders
  const getChar = () => {
    if (script.toLowerCase().includes('urdu')) return 'ع';
    if (script.toLowerCase().includes('devanagari')) return 'अ';
    return title.charAt(0).toUpperCase();
  };

  const getScriptClass = () => {
    if (script.toLowerCase().includes('urdu')) return 'urdu';
    if (script.toLowerCase().includes('devanagari')) return 'devanagari';
    return '';
  };

  return (
    <div className="w-full aspect-square bg-[#f8f5f0] flex flex-col items-center justify-center border-2 border-black relative overflow-hidden group">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <span className={`text-[12rem] font-black text-black/10 select-none ${getScriptClass()} transform group-hover:scale-110 transition-transform duration-700`}>
        {getChar()}
      </span>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#cc543a]">{script || 'Typographic Specimen'}</h3>
        <p className="text-3xl font-black uppercase tracking-tighter leading-none text-black drop-shadow-sm">{title}</p>
        <div className="w-12 h-0.5 bg-black/10"></div>
        <p className="handwritten text-sm text-slate-400">Specimen ID: BLR-TYP-{pageId(title)}</p>
      </div>
      
      <div className="absolute bottom-4 right-4 text-[8px] font-black uppercase tracking-widest text-black/20 vertical-text">
        Artifact Scan // Street Level
      </div>
    </div>
  );
};

const pageId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 1000);
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'ur', name: 'اردو (Urdu)' }
];

const ZinePage: React.FC<ZinePageProps> = ({ page }) => {
  const [currentLang, setCurrentLang] = useState('en');
  const [translatedContent, setTranslatedContent] = useState<{context: string, note: string} | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const getLangClass = (code: string) => {
    switch (code) {
      case 'hi': return 'devanagari';
      case 'ur': return 'urdu';
      default: return '';
    }
  };

  const handleTranslate = async (langCode: string, langName: string) => {
    if (langCode === 'en') {
      setCurrentLang('en');
      setTranslatedContent(null);
      return;
    }

    setIsTranslating(true);
    try {
      const contextTrans = await translateContent(page.culturalContext, langName);
      const noteTrans = await translateContent(page.historicalNote, langName);
      setTranslatedContent({
        context: contextTrans || page.culturalContext,
        note: noteTrans || page.historicalNote
      });
      setCurrentLang(langCode);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#page-${page.id}`;
    if (navigator.share) {
      await navigator.share({ title: page.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    }
  };

  const isEven = Number(page.id) % 2 === 0;
  const langClass = getLangClass(currentLang);

  return (
    <div id={`page-${page.id}`} className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-start scroll-mt-24 pb-24 border-b-2 border-black/10 last:border-b-0`}>
      <div className="w-full md:w-3/5 relative py-6 group">
        <div className="tape absolute top-2 left-1/4 w-20 h-8 -rotate-12 opacity-70"></div>
        <div className="tape absolute -bottom-2 right-1/4 w-16 h-8 rotate-6 opacity-70"></div>
        
        <div className="p-3 bg-white border-2 border-black brutalist-shadow transition-all duration-500 relative overflow-hidden hover:rotate-1">
          {page.isUserContribution && page.image && !page.image.includes('unsplash') ? (
            <img 
              src={page.image} 
              alt={page.title} 
              className="w-full aspect-square object-cover contrast-125 grayscale hover:grayscale-0 transition-all duration-700"
            />
          ) : (
            <TypographicPlaceholder title={page.title} script={page.vibe} />
          )}
          
          <div className="p-4 flex justify-between items-center border-t border-black/5 mt-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#cc543a]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-black">{page.location}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Archive Ref #0{page.id}</span>
          </div>
        </div>

        <div className="mt-4 px-4 py-3 bg-slate-100/50 border-l-4 border-black/10 hover:bg-white hover:border-[#cc543a] transition-all">
          <a 
            href={page.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-[#cc543a] transition-colors"
          >
            <Link2 size={14} /> View Reference Archive
          </a>
          <p className="text-[9px] text-slate-400 mt-1 italic">Typographic study: {page.imageSource}</p>
        </div>

        <div className={`absolute ${isEven ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 hidden lg:block z-20`}>
           <div className="bg-[#cc543a] text-white p-4 brutalist-shadow transform rotate-6 border-2 border-black">
              <Hash size={24} className="mb-2" />
              <p className="handwritten text-lg font-bold leading-tight">
                Artifact <br/> Specimen
              </p>
           </div>
        </div>
      </div>

      <div className="w-full md:w-2/5 flex flex-col space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="bg-black text-white px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] rotate-1 border border-black shadow-[4px_4px_0_0_#cc543a]">
              {page.vibe}
            </div>
            <button onClick={handleShare} className="p-2 border-2 border-black bg-white text-black hover:bg-[#cc543a] hover:text-white transition-all brutalist-shadow-sm">
              <Share2 size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Localize Context</label>
            <div className="flex items-center gap-3 bg-white border-2 border-black p-3 brutalist-shadow-sm">
              <div className="relative flex-1">
                <select 
                  value={currentLang}
                  onChange={(e) => {
                    const selected = LANGUAGES.find(l => l.code === e.target.value);
                    if (selected) handleTranslate(selected.code, selected.name);
                  }}
                  disabled={isTranslating}
                  className="w-full appearance-none bg-transparent text-[11px] font-black uppercase tracking-widest focus:outline-none cursor-pointer pr-8 py-1 text-black"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-black" />
              </div>
              {isTranslating && <Loader2 size={14} className="animate-spin text-[#cc543a]" />}
            </div>
          </div>
        </div>
        
        <h2 className={`text-5xl font-black tracking-tighter text-black leading-[0.9] drop-shadow-sm ${langClass}`}>
          {page.title}
        </h2>
        
        <div className="space-y-8 relative min-h-[180px]">
          {isTranslating ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-60">
              <Loader2 className="animate-spin text-[#cc543a]" size={32} />
              <p className="handwritten font-bold text-lg text-black mt-2">Decoding script...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 space-y-8">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#cc543a] flex items-center gap-3">
                  <span className="w-10 h-0.5 bg-[#cc543a]"></span> Typographic Scan
                </h4>
                <p className={`text-xl leading-snug font-medium text-slate-900 ${langClass}`}>
                  {translatedContent ? translatedContent.context : page.culturalContext}
                </p>
              </div>
              
              <div className="bg-[#f8f5f0] p-8 border-4 border-black border-dashed relative">
                <div className="absolute -top-3 left-4 bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">Artifact Footnote</div>
                <p className={`serif text-lg leading-relaxed text-slate-700 italic ${langClass}`}>
                  {translatedContent ? translatedContent.note : page.historicalNote}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t-2 border-black/5">
          <a href={page.readMoreUrl} target="_blank" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black hover:text-[#cc543a]">
            Explore Archives <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ZinePage;
