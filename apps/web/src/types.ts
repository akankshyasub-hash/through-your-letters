export interface ZinePageData {
  id: string | number;
  title: string;
  location: string;
  culturalContext: string;
  historicalNote: string;
  image: string;
  thumbnail?: string;
  imageSource: string;
  sourceUrl: string;
  vibe: string;
  readMoreUrl: string;
  isUserContribution?: boolean;
  contributorName?: string;
  description?: string;
  report_count?: number;
  report_reasons?: string[];
}

export enum AppMode {
  EXPLORE = "EXPLORE",
  CONTRIBUTE = "CONTRIBUTE",
  ABOUT = "ABOUT",
  GUIDEBOOK = "GUIDEBOOK",
  MAP = "MAP",
  ADMIN = "ADMIN",
}

export interface Lettering {
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
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  report_count?: number;
  report_reasons?: string[];
}
