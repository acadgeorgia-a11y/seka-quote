/// <reference types="@types/google.maps" />

/**
 * Maps a Google Places address_components array to a toll zone ID.
 * Returns '' if the address is outside known zones (agent can override via tolls field).
 */
export function detectZoneFromComponents(
  components: google.maps.GeocoderAddressComponent[],
): string {
  const get = (type: string, nameType: 'long_name' | 'short_name' = 'long_name') =>
    components.find((c) => c.types.includes(type))?.[nameType] ?? '';

  const state      = get('administrative_area_level_1', 'short_name'); // NY, NJ
  const county     = get('administrative_area_level_2');               // "Kings County"
  const sublocality = get('sublocality_level_1');                      // "Brooklyn"
  const locality   = get('locality');                                  // "Bronx", "New York"
  const zip        = get('postal_code', 'short_name');

  if (state === 'NY') {
    if (sublocality === 'Brooklyn'     || county === 'Kings County')    return 'BK';
    if (sublocality === 'Queens'       || county === 'Queens County')   return 'QN';
    if (sublocality === 'Bronx'        || county === 'Bronx County'
                                       || locality === 'Bronx')         return 'BX';
    if (sublocality === 'Staten Island'|| county === 'Richmond County') return 'SI';
    if (county === 'Nassau County'     || county === 'Suffolk County')  return 'LI';

    if (sublocality === 'Manhattan' || county === 'New York County') {
      // CRZ = below 60th St. ZIP-based boundary is the most reliable signal.
      const zipNum = parseInt(zip, 10);
      const MN_S = new Set([
        10001,10002,10003,10004,10005,10006,10007,10009,10010,
        10011,10012,10013,10014,10016,10017,10018,10019,10020,
        10021,10022,10036,10038,10041,10045,10048,10055,10060,
        10065,10069,
      ]);
      return MN_S.has(zipNum) ? 'MN_S' : 'MN_N';
    }
  }

  if (state === 'NJ') {
    const c = county.replace(' County', '');
    if (c === 'Hudson')                                    return 'JC';
    if (c === 'Bergen' || c === 'Passaic' || c === 'Essex') return 'NJ_NE';
    if (c === 'Sussex' || c === 'Warren'  || c === 'Morris' || c === 'Hunterdon') return 'NJ_NW';
    if (c === 'Union'  || c === 'Middlesex'|| c === 'Somerset') return 'NJ_C1';
    if (c === 'Monmouth'|| c === 'Ocean')                  return 'NJ_C2';
    if (c === 'Mercer' || c === 'Burlington')              return 'NJ_S1';
    if (c === 'Camden' || c === 'Gloucester')              return 'NJ_S2';
    if (c === 'Salem'  || c === 'Cumberland' || c === 'Atlantic' || c === 'Cape May') return 'NJ_S3';
  }

  return ''; // outside known zones — tolls field stays as override
}
