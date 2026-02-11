import { API_BASE_URL } from "../constants";
import { Lettering, RevisitLink } from "../types";

export const api = {
  async getGallery(limit = 50, offset = 0, cityId?: string | null) {
    let url = `${API_BASE_URL}/api/v1/letterings?limit=${limit}&offset=${offset}`;
    if (cityId) url += `&city_id=${cityId}`;
    const res = await fetch(url);
    return res.json();
  },
  async getLettering(id: string): Promise<Lettering> {
    const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}`);
    if (!res.ok) throw new Error("Not found");
    return res.json();
  },
  async upload(formData: FormData) {
    const res = await fetch(`${API_BASE_URL}/api/v1/letterings/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async toggleLike(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}/like`, {
      method: "POST",
    });
    return res.json();
  },
  async search(q: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/letterings/search?q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },
  async getContributor(tag: string, limit = 50, offset = 0) {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/contributors/${encodeURIComponent(tag)}?limit=${limit}&offset=${offset}`,
    );
    if (!res.ok) throw new Error("Contributor not found");
    return res.json() as Promise<{
      contributor_tag: string;
      total_count: number;
      letterings: Lettering[];
    }>;
  },
  async getRevisits(id: string | number): Promise<{ revisits: RevisitLink[] }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}/revisits`);
    if (!res.ok) throw new Error("Failed to load revisits");
    return res.json();
  },
};
