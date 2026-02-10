import React, { useState, useRef } from "react";
import { Upload, X, Loader2, MapPin } from "lucide-react";
import { API_BASE_URL, AREA_PIN_MAP, PIN_AREA_MAP } from "../constants";
import { useToastStore } from "../store/useToastStore";

const ContributionPanel: React.FC<{
  onCancel: () => void;
  onSubmit: () => void;
}> = ({ onCancel, onSubmit }) => {
  const { addToast } = useToastStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    area: "Other",
    pin: "",
    desc: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePinChange = (val: string) => {
    const pin = val.replace(/\D/g, "").substring(0, 6);
    const matchedArea = PIN_AREA_MAP[pin] || "Other";
    setForm((prev) => ({ ...prev, pin, area: matchedArea }));
  };

  const handleAreaChange = (val: string) => {
    const matchedPin = AREA_PIN_MAP[val] || "";
    setForm((prev) => ({ ...prev, area: val, pin: matchedPin || prev.pin }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation)
      return addToast("Geolocation not supported", "error");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = await res.json();
        const pc = data.address.postcode?.replace(/\s/g, "").substring(0, 6);
        if (pc) handlePinChange(pc);
      } catch (e) {
        addToast("Auto-detect failed", "error");
      } finally {
        setIsLocating(false);
      }
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return addToast("Artifact image required", "error");
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("contributor_tag", form.name);
    formData.append("pin_code", form.pin);
    formData.append("description", form.desc);
    formData.append("city_id", "0194f123-4567-7abc-8def-0123456789ab");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/letterings/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        addToast("Artifact submitted successfully", "success");
        onSubmit();
      } else throw new Error();
    } catch (err) {
      addToast("Network error. Try a smaller image.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in pb-32">
      <div className="flex justify-between items-center bg-black text-white p-6 brutalist-shadow">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">
            Contributor Lab
          </h2>
          <p className="handwritten text-sm text-[#d4a017] italic">
            Preserving the city's lettered soul...
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 bg-white text-black border-2 border-black hover:bg-[#cc543a] hover:text-white transition-colors"
        >
          <X />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="text-xs font-black uppercase bg-[#2d5a27] text-white px-2 py-1 inline-block">
            Step 01: Capture Lettering
          </h4>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-4 border-black aspect-[4/3] flex flex-col items-center justify-center bg-white brutalist-shadow-sm cursor-pointer overflow-hidden group"
          >
            {preview ? (
              <img
                src={preview}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <div className="text-center p-12">
                <Upload
                  size={48}
                  className="mx-auto mb-4 text-slate-300 group-hover:text-black transition-colors"
                />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tap to mount specimen
                </p>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>

        <form
          onSubmit={handleUpload}
          className="bg-white p-8 md:p-10 border-4 border-black brutalist-shadow space-y-8 flex flex-col"
        >
          <h4 className="text-[10px] font-black uppercase text-[#cc543a]">
            Step 02: Archive Details
          </h4>
          <div className="space-y-6 flex-1">
            <input
              placeholder="Contributor Name"
              className="w-full border-2 border-black p-4 font-black text-sm focus:border-[#cc543a] outline-none"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-400">
                  Neighborhood
                </label>
                <select
                  className="w-full border-2 border-black p-4 font-black bg-white text-sm outline-none"
                  value={form.area}
                  onChange={(e) => handleAreaChange(e.target.value)}
                >
                  <option value="Other">Other Area</option>
                  {Object.keys(AREA_PIN_MAP).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 relative">
                <label className="text-[8px] font-black uppercase text-slate-400">
                  PIN Code
                </label>
                <input
                  placeholder="560xxx"
                  className="w-full border-2 border-black p-4 font-black text-sm outline-none pr-10"
                  value={form.pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="absolute right-3 top-10 text-[#cc543a]"
                >
                  {isLocating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <MapPin size={18} />
                  )}
                </button>
              </div>
            </div>

            <textarea
              placeholder="Tell the story of this find (material, style, location context)..."
              className="w-full border-2 border-black p-4 font-medium text-sm focus:border-[#cc543a] outline-none"
              rows={5}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-black text-white py-6 font-black uppercase brutalist-shadow hover:bg-[#cc543a] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Finalize Archiving"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContributionPanel;
