export const TIER_1_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DK', 'FI', 'NO', 'SE', 'CH', 'DE', 'NL'];
export const TIER_2_COUNTRIES = ['FR', 'IT', 'ES', 'JP', 'KR', 'SG', 'AE', 'AT', 'BE', 'LU', 'IS'];
export const TIER_3_COUNTRIES = ['BR', 'MX', 'IN', 'ZA', 'PL', 'CZ', 'HU', 'RO', 'GR', 'PT', 'TR', 'AR', 'CL', 'CO', 'PE', 'MY', 'TH', 'VN', 'PH', 'ID', 'SA', 'IL', 'QA', 'KW'];

export function getCountryTier(countryCode: string | null): number {
  if (!countryCode) return 4;
  const code = countryCode.toUpperCase();
  if (TIER_1_COUNTRIES.includes(code)) return 1;
  if (TIER_2_COUNTRIES.includes(code)) return 2;
  if (TIER_3_COUNTRIES.includes(code)) return 3;
  return 4;
}

export function getTierMultiplier(tier: number): number {
  switch (tier) {
    case 1: return 5; 
    case 2: return 3;
    case 3: return 2;
    case 4: 
    default: return 1;
  }
}
