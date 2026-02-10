import React from 'react';
import { ZinePageData } from '../types';
import { MapPin, ExternalLink, Trash2, AlignLeft } from 'lucide-react';

interface ZinePageProps {
  page: ZinePageData;
  onDelete?: (id: string | number) => void;
}

const ZinePage: React.FC<ZinePageProps> = ({ page, onDelete }) => {
  return (
    <div className="bg-white border-4 border-black p-8 md:p-12 brutalist-shadow-lg space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square bg-slate-100 border-4 border-black overflow-hidden">
            {page.image ? (
              <img 
                src={page.image} 
                alt={page.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <span className="text-6xl font-black">?</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={16} className="text-[#cc543a]" />
            <span className="font-bold">{page.location}</span>
          </div>
          
          <div className="inline-block bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest">
            {page.vibe}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-4">
              {page.title}
            </h3>
            {page.contributorName && (
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                By {page.contributorName}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {page.description && (
              <div className="bg-slate-50 p-4 border-l-4 border-black">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <AlignLeft size={14} />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Curator's Note
                  </h4>
                </div>
                <p className="text-base leading-relaxed text-slate-800 font-medium">
                  {page.description}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Cultural Context
              </h4>
              <p className="text-base leading-relaxed text-slate-700">
                {page.culturalContext}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Historical Note
              </h4>
              <p className="text-base leading-relaxed text-slate-700">
                {page.historicalNote}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {page.sourceUrl && (
              <a
                href={page.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-black hover:text-white transition-all"
              >
                <ExternalLink size={14} />
                Source
              </a>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(page.id)}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-red-800 transition-all"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZinePage;