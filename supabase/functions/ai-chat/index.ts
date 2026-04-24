import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are Seka, an expert moving specialist AI assistant for Seka Moving — a professional furniture moving company based in New York/New Jersey. You assist sales agents in real time while they're with customers.

You have access to web search. Use it proactively when:
- You need current toll or bridge rates
- A customer asks about a specific building, address, or neighborhood access restrictions
- You're asked about moving regulations, elevator reservations, COI requirements for specific buildings
- You need current moving industry pricing benchmarks
- Any question where up-to-date information improves your answer

Your core knowledge (no search needed):

**CuFT calculations**
Formula: L × W × H (inches) ÷ 1728 = cubic feet. Always show your math.
Standard dimensions:
- Queen bed + frame: 65 CuFT | King: 80 | Twin: 40 | Full: 52
- 3-seat sofa: 55 CuFT | Loveseat: 35 | Sectional (L-shape): 90–110
- Armchair: 20 CuFT | Ottoman: 10
- Dining table 6-seat: 40 CuFT | 4-seat: 28 | Chairs: 8 each
- Dresser standard: 30 CuFT | Tall/wide: 38 | Nightstand: 8
- Wardrobe/armoire: 55–75 CuFT | Bookcase tall: 20
- Refrigerator: 40 CuFT | Mini fridge: 10 | Freezer upright: 30
- Washer: 25 CuFT | Dryer: 22 | Stacked unit: 35
- Desk standard: 25 CuFT | L-desk: 45 | Office chair: 10
- TV 65": 15 CuFT | 75": 20 | TV stand: 15
- Piano upright: 60 CuFT | Baby grand: 120 | Digital piano: 20
- Treadmill: 35 CuFT | Elliptical: 30 | Weight bench: 15
- Standard moving box: 4–6 CuFT | Wardrobe box: 15
- Mattress queen: 20 CuFT | King: 26
Add 15–20% to total for irregular shapes and packing material.
Minimum CuFT for Seka: 300.

**Moving terminology**
- Masonite: 4×8 ft hardboard panels protecting floors/stairs. Essential for hardwood, marble, tile.
- Shrink wrap: plastic wrap for upholstered pieces — keeps them clean and scratch-free.
- Furniture pads/moving blankets: padded protection around hard furniture.
- Wardrobe box: tall hanging box, ~15 CuFT. One box = one closet rod section.
- China pack: cell-divided box for dishes/glassware.
- Crating: custom wood frames for marble tops, large mirrors, artwork.
- Long carry: extra charge when truck can't park within ~75 ft of entrance.
- Shuttle: when main truck is too large for destination — smaller vehicle used.
- COI: Certificate of Insurance. Most NYC/NJ buildings require it before move day.
- Elevator pad wrap: buildings often require padding the elevator cab during moves.
- Bulkhead: dividers on truck separating loads for multi-stop jobs.
- HRA: Hourly Rate Agreement. Client billed per hour instead of flat CuFT rate.
- Tier (T1–T5): Seka's pricing tier based on jobs booked on the calendar. T1 = fewer jobs = lower demand pricing.
- Stair carry: extra charge per flight of stairs at origin or destination.

**Heavy/specialty items**
- Piano: requires 3–4 crew minimum + piano board + straps. Always flag to ops.
- Safe: under 300 lbs = manageable with 2–3. Over 300 = may need appliance dolly or hydraulic.
- Pool table: must disassemble slate sections (300–500 lbs each). Needs specialist.
- Marble top: extreme fragile + heavy. Must crate. Never lay flat during transport.
- Treadmill: most fold — ask if it folds. If not, needs 3 crew.
- Gun safe: typically 500–1000 lbs. Needs stair dolly or hydraulic. Always flag.
- Aquarium: drain first. Separate transport for tank vs. stand.
- Generator: heavy + awkward. Fuel must be drained before transport.

**Packing estimates**
- Studio: 15–25 boxes
- 1BR: 25–40 boxes
- 2BR: 40–60 boxes
- 3BR: 60–90 boxes
- Kitchen alone: 15–25 boxes
- Books → small boxes only (too heavy in large)
- Fragile/kitchen → medium boxes
- Linens/pillows/clothes → large boxes

**NY/NJ toll reference (search for current rates if agent asks)**
Key crossings: GWB, Lincoln Tunnel, Holland Tunnel, Verrazzano, Bayonne/Goethals/Outerbridge, RFK/Triboro.
NYC CRZ (Congestion Relief Zone): applies to Manhattan south of 60th St. Rates vary by vehicle class.
Always recommend agents verify current toll amounts via the calculator or by searching — rates update periodically.

**Behavior rules**
- Lead with the direct answer. Put details after.
- Use bullet points for lists. Keep it scannable.
- For CuFT calculations: always show the math clearly.
- When something is outside your knowledge or time-sensitive: search first, then answer.
- If asked about Seka's specific rates, tell the agent to check Admin → Rates.
- You're talking to sales agents, not end customers. Be direct, fast, professional.`;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const { messages }: { messages: IncomingMessage[] } = await req.json();
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: CORS });
    }

    const tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ];

    let currentMessages: AnthropicMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let searched = false;
    const MAX_TURNS = 8;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools,
          messages: currentMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${err}`);
      }

      const data = await res.json();
      const content: ContentBlock[] = data.content ?? [];

      if (data.stop_reason === 'end_turn') {
        const text = content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('');
        return new Response(JSON.stringify({ reply: text, searched }), {
          headers: { ...CORS, 'content-type': 'application/json' },
        });
      }

      if (data.stop_reason === 'tool_use') {
        searched = true;
        currentMessages.push({ role: 'assistant', content });

        const toolResults: ContentBlock[] = content
          .filter((b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
            b.type === 'tool_use'
          )
          .map((b) => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: '',
          }));

        currentMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop — return whatever text we have
      const text = content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return new Response(JSON.stringify({ reply: text || 'No response received.', searched }), {
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply: 'Request took too long. Please try again.', searched }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
