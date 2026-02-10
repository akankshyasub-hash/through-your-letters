export interface ZinePageData {
  id: string | number;
  title: string;
  location: string;
  culturalContext: string;
  historicalNote: string;
  image: string;
  imageSource: string;
  sourceUrl: string;
  vibe: string;
  readMoreUrl: string;
  isUserContribution?: boolean;
  contributorName?: string;
  description?: string;
}

export enum AppMode {
  EXPLORE = "EXPLORE",
  CONTRIBUTE = "CONTRIBUTE",
  ABOUT = "ABOUT",
  GUIDEBOOK = "GUIDEBOOK",
  MAP = "MAP",
  ADMIN = "ADMIN",
}

export interface LetteringUploadRequest {
  contributor_tag: string;
  pin_code: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}

export interface LetteringResponse {
  id: string;
  image_url: string;
  thumbnail_urls: {
    small: string;
    medium: string;
    large: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  pin_code: string;
  contributor_tag: string;
  detected_text?: string;
  description?: string;
  ml_metadata?: {
    style?: string;
    script?: string;
    confidence?: number;
    color_palette?: string[];
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
}

export type Lettering = LetteringResponse;