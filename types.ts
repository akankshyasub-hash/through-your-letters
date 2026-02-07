
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
