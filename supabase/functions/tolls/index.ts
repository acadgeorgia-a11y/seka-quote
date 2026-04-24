import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TollsRequest {
  origin: string;
  destination: string;
  officeAddress: string;
}

// TollGuru v1 route-based toll calculation.
// We build a simple A→B→C→D waypoint route and query for tolls.
async function geocode(address: string, mapsKey: string): Promise<{ lat: number; lng: number }> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', mapsKey);
  const res = await fetch(url.toString());
  const json = await res.json() as {
    results: { geometry: { location: { lat: number; lng: number } } }[];
    status: string;
  };
  if (json.status !== 'OK' || !json.results[0]) {
    throw new Error(`Geocode failed for "${address}": ${json.status}`);
  }
  const loc = json.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const tollGuruKey = Deno.env.get('TOLLGURU_API_KEY');
    const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!tollGuruKey) throw new Error('TOLLGURU_API_KEY not configured');
    if (!mapsKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const body: TollsRequest = await req.json();
    const { origin, destination, officeAddress } = body;

    if (!origin || !destination || !officeAddress) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Geocode all three addresses in parallel
    const [office, orig, dest] = await Promise.all([
      geocode(officeAddress, mapsKey),
      geocode(origin, mapsKey),
      geocode(destination, mapsKey),
    ]);

    // TollGuru polyline API: office→origin→destination→office
    const tollRes = await fetch('https://apis.tollguru.com/toll/v2/gps-tracks-from-mapping-service', {
      method: 'POST',
      headers: {
        'x-api-key': tollGuruKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'google',
        polyline: encodePolylineFromPoints([office, orig, dest, office]),
        vehicleType: 'SUT', // straight truck / moving truck
      }),
    });

    if (!tollRes.ok) {
      // TollGuru unavailable — return 0 tolls so quote can still be built
      return new Response(JSON.stringify({ tolls: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const tollData = await tollRes.json() as {
      summary?: { totalToll?: number };
    };
    const tolls = tollData.summary?.totalToll ?? 0;

    return new Response(JSON.stringify({ tolls: Math.round(tolls * 100) / 100 }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

// Minimal polyline encoder for lat/lng points
function encodePolyline(value: number): string {
  let result = '';
  let encoded = Math.round(value * 1e5);
  encoded = encoded < 0 ? ~(encoded << 1) : encoded << 1;
  while (encoded >= 0x20) {
    result += String.fromCharCode((0x20 | (encoded & 0x1f)) + 63);
    encoded >>= 5;
  }
  result += String.fromCharCode(encoded + 63);
  return result;
}

function encodePolylineFromPoints(points: { lat: number; lng: number }[]): string {
  let output = '';
  let prevLat = 0, prevLng = 0;
  for (const pt of points) {
    output += encodePolyline(pt.lat - prevLat);
    output += encodePolyline(pt.lng - prevLng);
    prevLat = pt.lat;
    prevLng = pt.lng;
  }
  return output;
}
