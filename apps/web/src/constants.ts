import { ZinePageData } from './types';

export const ZINE_PAGES: ZinePageData[] = [
  // {
  //   id: 1,
  //   title: "Malleshwaram Stencil",
  //   location: "8th Cross, Malleshwaram",
  //   culturalContext: "Classic Bengaluru residential signage",
  //   historicalNote: "Hand-painted street name stencils from the 1970s, now endangered by digital replacements",
  //   image: "https://images.unsplash.com/photo-1562155618-e1a8bc2eb04f?w=800&auto=format&fit=crop",
  //   imageSource: "Community Archive",
  //   sourceUrl: "",
  //   vibe: "Vintage",
  //   readMoreUrl: "",
  // },
  // {
  //   id: 2,
  //   title: "Commercial Street Typography",
  //   location: "Brigade Road Junction",
  //   culturalContext: "Multi-lingual commercial signage",
  //   historicalNote: "Triple-script shop boards (Kannada-English-Hindi) representing Bengaluru's linguistic diversity",
  //   image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&auto=format&fit=crop",
  //   imageSource: "Community Archive",
  //   sourceUrl: "",
  //   vibe: "Multilingual",
  //   readMoreUrl: "",
  // },
];

export const BENGALURU_REGIONS = [
  { name: "Malleshwaram", slug: "malleshwaram", pinPrefix: "560003" },
  { name: "Indiranagar", slug: "indiranagar", pinPrefix: "560038" },
  { name: "Jayanagar", slug: "jayanagar", pinPrefix: "560041" },
  { name: "Koramangala", slug: "koramangala", pinPrefix: "560034" },
  { name: "Whitefield", slug: "whitefield", pinPrefix: "560066" },
  { name: "Yeshwanthpur", slug: "yeshwanthpur", pinPrefix: "560022" },
];

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
