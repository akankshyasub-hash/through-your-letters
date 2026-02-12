import { API_BASE_URL } from "../constants";
import {
  Lettering,
  RevisitLink,
  LeaderboardEntry,
  CollectionSummary,
  ChallengeData,
  Comment,
} from "../types";

const SESSION_KEY = "ttl_admin_token";

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
    }
    const text = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    if (text) {
      try {
        const json = JSON.parse(text);
        message = json.error || json.message || message;
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }
  return res.json();
}

export interface GalleryParams {
  limit?: number;
  offset?: number;
  cityId?: string | null;
  script?: string | null;
  style?: string | null;
  sortBy?: string | null;
}

export interface GalleryResponse {
  letterings: Lettering[];
  total: number;
}

export const api = {
  // Gallery
  async getGallery(params: GalleryParams = {}): Promise<GalleryResponse> {
    const { limit = 50, offset = 0, cityId, script, style, sortBy } = params;
    const url = new URL(`${API_BASE_URL}/api/v1/letterings`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    if (cityId) url.searchParams.set("city_id", cityId);
    if (script) url.searchParams.set("script", script);
    if (style) url.searchParams.set("style", style);
    if (sortBy) url.searchParams.set("sort_by", sortBy);
    return fetchJson<GalleryResponse>(url.toString());
  },

  // Single lettering
  async getLettering(id: string | number): Promise<Lettering> {
    return fetchJson<Lettering>(`${API_BASE_URL}/api/v1/letterings/${id}`);
  },

  // Upload
  async upload(formData: FormData) {
    const res = await fetch(`${API_BASE_URL}/api/v1/letterings/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Like
  async toggleLike(id: string | number) {
    return fetchJson<{ liked: boolean; likes_count: number }>(
      `${API_BASE_URL}/api/v1/letterings/${id}/like`,
      { method: "POST" },
    );
  },

  // Search
  async search(q: string) {
    return fetchJson<{ letterings: Lettering[] }>(
      `${API_BASE_URL}/api/v1/letterings/search?q=${encodeURIComponent(q)}`,
    );
  },

  // Contributor
  async getContributor(tag: string, limit = 50, offset = 0) {
    return fetchJson<{
      contributor_tag: string;
      total_count: number;
      letterings: Lettering[];
    }>(
      `${API_BASE_URL}/api/v1/contributors/${encodeURIComponent(tag)}?limit=${limit}&offset=${offset}`,
    );
  },

  // Revisits
  async getRevisits(id: string | number): Promise<{ revisits: RevisitLink[] }> {
    return fetchJson<{ revisits: RevisitLink[] }>(
      `${API_BASE_URL}/api/v1/letterings/${id}/revisits`,
    );
  },

  // Similar
  async getSimilar(id: string | number) {
    return fetchJson<{
      similar: Array<{
        id: string;
        thumbnail?: string;
        image_url: string;
        detected_text?: string;
        ml_style?: string;
        ml_script?: string;
      }>;
    }>(`${API_BASE_URL}/api/v1/letterings/${id}/similar`);
  },

  // Report
  async reportLettering(id: string | number, reason: string) {
    return fetchJson<{ message: string }>(
      `${API_BASE_URL}/api/v1/letterings/${id}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
  },

  // Comments
  async getComments(id: string | number): Promise<Comment[]> {
    return fetchJson<Comment[]>(
      `${API_BASE_URL}/api/v1/letterings/${id}/comments`,
    );
  },

  async addComment(id: string | number, content: string): Promise<Comment> {
    return fetchJson<Comment>(
      `${API_BASE_URL}/api/v1/letterings/${id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
  },

  // Cities
  async getCities() {
    return fetchJson<
      Array<{
        id: string;
        name: string;
        country_code: string;
        center_lat: number | null;
        center_lng: number | null;
        default_zoom: number | null;
        is_active: boolean | null;
      }>
    >(`${API_BASE_URL}/api/v1/cities`);
  },

  // Geo
  async getMarkers() {
    return fetchJson<
      Array<{ id: string; lat: number; lng: number; thumbnail: string }>
    >(`${API_BASE_URL}/api/v1/geo/markers`);
  },

  async getNeighborhoods() {
    return fetchJson<{
      neighborhoods: Array<{ pin_code: string; count: number }>;
    }>(`${API_BASE_URL}/api/v1/analytics/neighborhoods`);
  },

  // Community
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return fetchJson<LeaderboardEntry[]>(
      `${API_BASE_URL}/api/v1/community/leaderboard`,
    );
  },

  async getCollections(): Promise<CollectionSummary[]> {
    return fetchJson<CollectionSummary[]>(`${API_BASE_URL}/api/v1/collections`);
  },

  async getChallenges(): Promise<ChallengeData[]> {
    return fetchJson<ChallengeData[]>(`${API_BASE_URL}/api/v1/challenges`);
  },

  async createCollection(data: {
    name: string;
    description?: string;
    creator_tag: string;
  }) {
    return fetchJson<CollectionSummary>(`${API_BASE_URL}/api/v1/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Admin
  async adminLogin(email: string, password: string) {
    const data = await fetchJson<{ token: string }>(
      `${API_BASE_URL}/api/v1/admin/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    sessionStorage.setItem(SESSION_KEY, data.token);
    return data;
  },

  async adminGetQueue(status: string) {
    return fetchJson<{ items: Lettering[] }>(
      `${API_BASE_URL}/api/v1/admin/moderation?status=${status}`,
      { headers: getAuthHeaders() },
    );
  },

  async adminApprove(id: string) {
    return fetchJson<{ message: string }>(
      `${API_BASE_URL}/api/v1/admin/letterings/${id}/approve`,
      { method: "POST", headers: getAuthHeaders() },
    );
  },

  async adminReject(id: string, reason: string) {
    return fetchJson<{ message: string }>(
      `${API_BASE_URL}/api/v1/admin/letterings/${id}/reject`,
      {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
  },

  async adminDelete(id: string) {
    return fetchJson<{ message: string }>(
      `${API_BASE_URL}/api/v1/admin/letterings/${id}`,
      { method: "DELETE", headers: getAuthHeaders() },
    );
  },

  async adminClearReports(id: string) {
    return fetchJson<{ message: string }>(
      `${API_BASE_URL}/api/v1/admin/letterings/${id}/clear-reports`,
      { method: "POST", headers: getAuthHeaders() },
    );
  },

  async adminGetStats() {
    return fetchJson<{
      total_uploads: number;
      pending_approvals: number;
      approved: number;
      rejected: number;
      total_cities: number;
      total_likes: number;
      total_comments: number;
    }>(`${API_BASE_URL}/api/v1/admin/stats`, { headers: getAuthHeaders() });
  },
};
