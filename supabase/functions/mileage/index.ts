import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MileageRequest {
  origin: string;
  destination: string;
  officeAddress: string;
  extraStops?: string[];
}

interface RouteResponse {
  routes?: { distanceMeters?: number }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

    const body: MileageRequest = await req.json();
    const { origin, destination, officeAddress, extraStops = [] } = body;

    if (!origin || !destination || !officeAddress) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Route: office → origin → [...extraStops] → destination → office
    const intermediates = [
      { address: origin },
      ...extraStops.map((s) => ({ address: s })),
      { address: destination },
    ];

    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { address: officeAddress },
        destination: { address: officeAddress },
        intermediates,
        travelMode: 'DRIVE',
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

    return new Response(JSON.stringify({ roundTripMiles }), {
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
