import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MileageRequest {
  origin: string;
  destination: string;
  officeAddress: string;
}

interface RouteResponse {
  routes?: {
    distanceMeters?: number;
    travelAdvisory?: {
      tollInfo?: {
        estimatedPrice?: { currencyCode: string; units: string; nanos: number }[];
      };
    };
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const body: MileageRequest = await req.json();
    const { origin, destination, officeAddress } = body;

    if (!origin || !destination || !officeAddress) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Single Routes API call: office → origin → destination → office
    // Returns both distance and toll cost in one request.
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.travelAdvisory.tollInfo',
      },
      body: JSON.stringify({
        origin: { address: officeAddress },
        destination: { address: officeAddress },
        intermediates: [
          { address: origin },
          { address: destination },
        ],
        travelMode: 'DRIVE',
        extraComputations: ['TOLLS'],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Routes API error ${res.status}: ${text}`);
    }

    const data: RouteResponse = await res.json();
    const route = data.routes?.[0];

    if (!route) throw new Error('No route returned');

    const meters = route.distanceMeters ?? 0;
    const roundTripMiles = Math.round((meters / 1609.344) * 10) / 10;

    // Toll: units (whole dollars) + nanos (billionths of a dollar)
    const price = route.travelAdvisory?.tollInfo?.estimatedPrice?.[0];
    const tolls = price
      ? Math.round((Number(price.units) + price.nanos / 1e9) * 100) / 100
      : 0;

    return new Response(JSON.stringify({ roundTripMiles, tolls }), {
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
