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
}

export enum AppMode {
  EXPLORE = 'EXPLORE',
  CONTRIBUTE = 'CONTRIBUTE',
  ABOUT = 'ABOUT',
  GUIDEBOOK = 'GUIDEBOOK',
  MAP = 'MAP'
}

export interface LetteringUploadRequest {
  contributorTag: string;
  pinCode: string;
  latitude?: number;
  longitude?: number;
}

export interface LetteringResponse {
  id: string;
  imageUrl: string;
  thumbnailUrls: {
    small: string;
    medium: string;
    large: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  pinCode: string;
  contributorTag: string;
  detectedText?: string;
  mlMetadata?: {
    style?: string;
    script?: string;
    confidence?: number;
    colorPalette?: string[];
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}
