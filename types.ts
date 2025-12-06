export interface Trial {
  Year: string | number;
  Location: string;
  Country: string;
  State: string;
  Crop: string;
  Treatment: string;
  NC_Yield: number;
  Check_Yield: number;
  Advantage_bu: number;
  Significant: string;
  Unit: string;
  Advantage_pct: number;
  Notes: string;
  Variety: string;
  Product: string;
}

export type SortField = 'Crop' | 'Year' | 'Location' | 'Advantage_pct';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  search: string;
  crop: string;
  country: string;
  product: string;
}
