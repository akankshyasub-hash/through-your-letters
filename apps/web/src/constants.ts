export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AREA_PIN_MAP: Record<string, string> = {
  "MG Road / GPO": "560001",
  "Basavanagudi": "560004",
  "Malleshwaram": "560003",
  "Indiranagar": "560038",
  "Koramangala": "560034",
  "Jayanagar": "560011",
  "Whitefield": "560066",
  "Frazer Town": "560005",
  "Ulsoor": "560008",
  "HSR Layout": "560102",
};

export const PIN_AREA_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(AREA_PIN_MAP).map(([area, pin]) => [pin, area])
);