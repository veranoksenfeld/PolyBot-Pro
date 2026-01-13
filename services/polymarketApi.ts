
import { GAMMA_API_URL, CLOB_API_URL, THE_GRAPH_URL } from '../utils/constants';
import { OpenOrder } from '../types';

interface ProxyConfig {
    base: string;
    encode: boolean;
    supportsPost: boolean;
    isWrapper: boolean;
    name: string;
}

// Proxy Definitions - Prioritized List
const PROXY_LIST: ProxyConfig[] = [
    // CorsProxy.io is fast and supports POST/GET
    { name: "CorsProxy", base: "https://corsproxy.io/?", encode: true, supportsPost: true, isWrapper: false },
    // CodeTabs is reliable for POST but sometimes stricter
    { name: "CodeTabs", base: "https://api.codetabs.com/v1/proxy?quest=", encode: true, supportsPost: true, isWrapper: false },
    // AllOrigins Raw is excellent for GET, fails POST
    { name: "AllOrigins Raw", base: "https://api.allorigins.win/raw?url=", encode: true, supportsPost: false, isWrapper: false },
    // Backup
    { name: "ThingProxy", base: "https://thingproxy.freeboard.io/fetch/", encode: false, supportsPost: true, isWrapper: false },
    // Wrapper based (last resort)
    { name: "AllOrigins JSON", base: "https://api.allorigins.win/get?url=", encode: true, supportsPost: false, isWrapper: true },
];

/**
 * Returns sorted proxies based on request method.
 * GET: AllOrigins Raw is prioritized for reliability.
 * POST: CorsProxy/CodeTabs are prioritized.
 */
const getPrioritizedProxies = (method: string): ProxyConfig[] => {
    if (method === 'POST') {
        return PROXY_LIST.filter(p => p.supportsPost);
    }
    // For GET, prioritize AllOrigins Raw as it handles query params well
    return [...PROXY_LIST].sort((a, b) => {
        if (a.name === 'AllOrigins Raw') return -1;
        if (b.name === 'AllOrigins Raw') return 1;
        return 0;
    });
};

/**
 * Executes a GraphQL query against The Graph using Proxy Fallback.
 * Crucially implements a GET fallback for the Legacy endpoint if POST fails.
 */
export const querySubgraph = async (query: string, variables: any = {}) => {
  // Endpoints to try in order
  const endpoints = [
      { url: THE_GRAPH_URL, method: 'POST' }, // Main Gateway
      { url: "https://subgraph-matic.poly.market/subgraphs/name/polymarket/matic-markets-6", method: 'POST' }, // Polymarket Direct
      { url: "https://api.thegraph.com/subgraphs/name/tokenunion/polymarket-matic", method: 'GET' } // Legacy (GET Fallback)
  ];
  
  for (const ep of endpoints) {
      try {
        let options: RequestInit = {};
        let fetchUrl = ep.url;

        if (ep.method === 'POST') {
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables })
            };
        } else {
            // GET construction for GraphQL
            // Aggressively minified query to ensure it fits in URL limits
            const cleanQuery = query.replace(/#.*$/gm, '').replace(/\s+/g, ' ').trim();
            const params = new URLSearchParams();
            params.append('query', cleanQuery);
            if (variables && Object.keys(variables).length > 0) {
                params.append('variables', JSON.stringify(variables));
            }
            fetchUrl = `${ep.url}?${params.toString()}`;
            options = { method: 'GET' };
        }

        const response = await fetchWithProxy(fetchUrl, options);
        
        if (response.ok) {
             const data = await response.json();
             // Validate that it looks like a Graph response
             if (data && (data.data || data.errors)) {
                 if (data.errors) console.warn(`Graph errors from ${ep.url}:`, data.errors);
                 return data.data;
             }
        }
      } catch (e) {
         // console.warn(`Subgraph try failed for ${ep.url}`, e);
         continue; // Try next endpoint
      }
  }
  
  return null;
};

/**
 * Helper to fetch with Proxy Fallback and Timeouts
 */
export async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
    const method = options?.method || 'GET';
    const proxies = getPrioritizedProxies(method);

    // 1. Try Direct first (Optimistic)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Direct Timeout
        
        const response = await fetch(url, { 
            ...options, 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const clone = response.clone();
            const text = await clone.text();
            if (isValidResponse(text)) return response;
        }
        // If direct returns 404, it's a valid "Not Found" result, not a network error
        if (response.status === 404) return response;

    } catch (e) {
        // Direct fetch failed (likely CORS), proceed to proxies
    }

    // 2. Try Proxies
    for (const proxy of proxies) {
        try {
            let finalUrl = '';
            const timestamp = Date.now();
            // Cache busting
            const separator = url.includes('?') ? '&' : '?';
            const urlWithCache = `${url}${separator}_cb=${timestamp}`;
            const encodedUrl = encodeURIComponent(urlWithCache);

            if (proxy.base.includes('allorigins')) {
                 finalUrl = `${proxy.base}${encodeURIComponent(url)}&disableCache=${timestamp}`;
            } else if (proxy.base.includes('corsproxy.io')) {
                 finalUrl = `${proxy.base}${encodedUrl}`;
            } else {
                if (proxy.encode) {
                    finalUrl = `${proxy.base}${encodedUrl}`;
                } else {
                    finalUrl = `${proxy.base}${urlWithCache}`;
                }
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s Proxy Timeout

            const response = await fetch(finalUrl, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                let text = await response.text();
                
                // AllOrigins Wrapper Handling
                if (proxy.isWrapper) {
                    try {
                        const wrapper = JSON.parse(text);
                        text = wrapper.contents; 
                        if (wrapper.status?.http_code) {
                             if (wrapper.status.http_code === 404) {
                                 return new Response("[]", { status: 404, statusText: "Not Found" });
                             }
                             if (wrapper.status.http_code !== 200) continue;
                        }
                    } catch (e) { continue; }
                }

                if (isValidResponse(text)) {
                    return new Response(text, {
                        status: 200,
                        statusText: "OK",
                        headers: new Headers({ "Content-Type": "application/json" }) 
                    });
                }
            }
        } catch (e) {
            continue;
        }
    }
    
    // Fallback error
    return new Response(JSON.stringify({ error: "All proxies failed" }), { status: 503, statusText: "Service Unavailable" });
}

// Validator to ensure we aren't getting HTML error pages
function isValidResponse(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    if (trimmed.startsWith('<')) return false; 
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

interface MarketData {
  id: string;
  question: string;
  outcomes: string[];
  slug: string;
  outcomePrices?: string; 
  volume?: string;
  active?: boolean;
  groupItemTitle?: string;
  conditionId?: string;
}

const MARKET_CACHE = new Map<string, MarketData>();

export const fetchMarketDetails = async (tokenId: string): Promise<MarketData | null> => {
  if (MARKET_CACHE.has(tokenId)) return MARKET_CACHE.get(tokenId)!;

  try {
    const url = `${GAMMA_API_URL}/events?id=${tokenId}`;
    const response = await fetchWithProxy(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
       const market = data[0];
       const result = {
         id: market.id,
         question: market.title,
         outcomes: JSON.parse(market.outcomes || '["YES", "NO"]'),
         slug: market.slug,
         active: market.active,
         groupItemTitle: market.groupItemTitle,
         conditionId: market.conditionId
       };
       MARKET_CACHE.set(tokenId, result);
       return result;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export const fetchBatchMarkets = async (identifiers: string[], paramType: 'id' | 'condition_id' = 'condition_id'): Promise<Map<string, MarketData>> => {
  if (identifiers.length === 0) return new Map();

  const uniqueIds = Array.from(new Set(identifiers));
  const resultMap = new Map<string, MarketData>();
  const batchSize = 10; 
  
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
     const batch = uniqueIds.slice(i, i + batchSize);
     const queryParams = batch.map(id => `${paramType}=${id}`).join('&');
     const url = `${GAMMA_API_URL}/markets?${queryParams}`;

     try {
        const response = await fetchWithProxy(url);
        if (response.ok) {
           const data = await response.json();
           if (Array.isArray(data)) {
              data.forEach((m: any) => {
                 const entry = {
                        id: m.id,
                        question: m.question,
                        outcomes: JSON.parse(m.outcomes || '["YES", "NO"]'),
                        slug: m.slug,
                        outcomePrices: m.outcomePrices, 
                        volume: m.volume,
                        active: m.active,
                        groupItemTitle: m.groupItemTitle,
                        conditionId: m.conditionId
                 };
                 if (m.conditionId) resultMap.set(m.conditionId, entry);
                 resultMap.set(m.id, entry);
              });
           }
        }
     } catch (e) {
        console.warn("Gamma Batch Fetch Error:", e);
     }
  }
  return resultMap;
};

export const fetchOpenOrders = async (makerAddress: string): Promise<OpenOrder[]> => {
    if (!makerAddress) return [];
    try {
        const safeAddress = makerAddress.toLowerCase();
        const url = `${CLOB_API_URL}/orders?maker_address=${safeAddress}&limit=100`;
        const response = await fetchWithProxy(url);
        
        if (response.status === 401 || response.status === 403) return [];
        if (!response.ok) return [];
        
        const data = await response.json();
        const orders = Array.isArray(data) ? data : (data.orders || []);
        
        return orders.map((o: any) => ({
            id: o.order_id || o.id,
            market: o.asset_id, 
            outcome: o.side === 'BUY' ? 'YES' : 'NO', 
            side: o.side,
            price: parseFloat(o.price || '0'),
            size: parseFloat(o.size || o.original_size || '0'),
            filled: parseFloat(o.filled_size || '0'),
            status: 'OPEN',
            timestamp: parseInt(o.timestamp || Date.now().toString())
        }));
    } catch (e) {
        return [];
    }
}
