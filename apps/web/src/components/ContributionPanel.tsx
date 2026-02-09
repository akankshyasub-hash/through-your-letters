import React, { useState, useRef } from 'react';
import { ZinePageData } from '../types';
import { Upload, X, MapPin, User, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../constants';

interface ContributionPanelProps {
  onSubmit: (entry: ZinePageData) => void;
  onCancel: () => void;
}

const ContributionPanel: React.FC<ContributionPanelProps> = ({ onSubmit, onCancel }) => {
  const [contributorName, setContributorName] = useState('');
  const [location, setLocation] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/heic'].includes(file.type)) {
      setError('Only JPEG, PNG, and HEIC files are supported');
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUploading) {
      return;
    }

    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    if (!contributorName.trim()) {
      setError('Please enter your contributor name');
      return;
    }

    if (!pinCode.trim() || !/^56\d{4}$/.test(pinCode)) {
      setError('Please enter a valid Bengaluru PIN code (560xxx)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('contributor_tag', contributorName.trim());
      formData.append('pin_code', pinCode.trim());
      formData.append('city_id', '0194f123-4567-7abc-8def-0123456789ab');
      
      if (location.trim()) {
        formData.append('location_name', location.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/letterings/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      const newEntry: ZinePageData = {
        id: data.id || `local_${Date.now()}`,
        title: location.trim() || 'Untitled',
        location: pinCode,
        culturalContext: 'User contribution',
        historicalNote: `Contributed by ${contributorName}`,
        image: data.url || previewUrl || '',
        imageSource: contributorName,
        sourceUrl: '',
        vibe: 'Community',
        readMoreUrl: '',
        isUserContribution: true,
        contributorName: contributorName,
      };

      onSubmit(newEntry);
      
      setContributorName('');
      setLocation('');
      setPinCode('');
      setSelectedFile(null);
      setPreviewUrl(null);
      
      alert('Upload successful! Your contribution will appear in the gallery after processing.');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="space-y-4">
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
          Contribute to the Archive
        </h1>
        <p className="text-sm text-slate-600 font-medium max-w-2xl">
          Share your captured street lettering with the community. All uploads are publicly visible and help preserve urban typography.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border-4 border-black p-8 brutalist-shadow-lg space-y-6">
          <div className="space-y-4">
            <label className="block">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={20} />
                <span className="text-sm font-black uppercase tracking-widest">Image</span>
                <span className="text-xs text-red-600 font-bold">*Required</span>
              </div>
              
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full aspect-video border-4 border-dashed border-black bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={48} className="text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">JPEG, PNG, or HEIC • Max 20MB</p>
                  </div>
                </button>
              ) : (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full aspect-video object-cover border-4 border-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploading}
                    className="absolute top-4 right-4 bg-red-600 text-white p-2 border-2 border-black hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="block">
              <div className="flex items-center gap-2 mb-3">
                <User size={20} />
                <span className="text-sm font-black uppercase tracking-widest">Contributor Tag</span>
                <span className="text-xs text-red-600 font-bold">*Required</span>
              </div>
              <input
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="@urbanist_blr"
                disabled={isUploading}
                className="w-full px-4 py-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#cc543a] disabled:opacity-50 disabled:cursor-not-allowed"
                maxLength={30}
                required
              />
              <p className="text-xs text-slate-500 mt-2">3-30 characters • Alphanumeric only</p>
            </label>

            <label className="block">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={20} />
                <span className="text-sm font-black uppercase tracking-widest">PIN Code</span>
                <span className="text-xs text-red-600 font-bold">*Required</span>
              </div>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="560001"
                disabled={isUploading}
                className="w-full px-4 py-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#cc543a] disabled:opacity-50 disabled:cursor-not-allowed"
                pattern="^56\d{4}$"
                maxLength={6}
                required
              />
              <p className="text-xs text-slate-500 mt-2">Bengaluru PIN codes only (560xxx)</p>
            </label>
          </div>

          <label className="block">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={20} />
              <span className="text-sm font-black uppercase tracking-widest">Location Description</span>
              <span className="text-xs text-slate-500 font-bold">Optional</span>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., 8th Cross, Malleshwaram"
              disabled={isUploading}
              className="w-full px-4 py-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#cc543a] disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={100}
            />
          </label>

          {error && (
            <div className="bg-red-100 border-2 border-red-600 p-4">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="flex-1 bg-[#cc543a] text-white px-8 py-4 text-sm font-black uppercase tracking-widest brutalist-shadow-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Submit to Archive
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="bg-white text-black px-8 py-4 text-sm font-black uppercase tracking-widest border-2 border-black hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="bg-slate-50 border-4 border-black p-6 brutalist-shadow-lg">
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Contribution Guidelines</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>• Only upload photos you own or have permission to share</li>
          <li>• Focus on lettering, signage, and typography</li>
          <li>• Avoid including people's faces</li>
          <li>• No offensive, illegal, or copyrighted content</li>
          <li>• All uploads become publicly visible after processing</li>
        </ul>
      </div>
    </div>
  );
};

export default ContributionPanel;
