
import { PositionHistory, ActivePosition, OpenOrder } from '../types';
import { fetchBatchMarkets, fetchWithProxy, fetchOpenOrders as fetchRawOpenOrders, querySubgraph } from './polymarketApi';
import { GAMMA_API_URL, CLOB_API_URL } from '../utils/constants';
import { ethers } from 'ethers';

/**
 * Resolves a Polymarket input to the correct Proxy Wallet address.
 * Prioritizes fetching the Proxy Wallet from Gamma, even if input is a valid address.
 */
export const resolveTargetWallet = async (input: string): Promise<string | null> => {
    if (!input) return null;
    
    // 1. Strict Sanitization
    let cleanInput = input.split('?')[0].split('#')[0].trim();
    cleanInput = cleanInput.replace(/\/$/, '')
                          .replace('https://polymarket.com/profile/', '')
                          .replace('https://polymarket.com/@', '')
                          .replace('polymarket.com/@', '')
                          .replace(/^@/, '');

    // 2. Try to resolve via Gamma API (Handles Slug -> Address AND EOA -> Proxy)
    try {
         // Encoded to prevent injection
         const encodedInput = encodeURIComponent(cleanInput);
         // If it looks like an address, query by address. Otherwise query by slug.
         const queryParam = ethers.isAddress(cleanInput) ? `address=${encodedInput}` : `slug=${encodedInput}`;
         const url = `${GAMMA_API_URL}/users?${queryParam}`;
         
         const response = await fetchWithProxy(url);
         
         if (response.ok) {
             const data = await response.json();
             // Gamma returns array for query
             if (Array.isArray(data) && data.length > 0) {
                 const user = data[0];
                 // CRITICAL: Polymarket positions are held in the proxyWallet (Gnosis Safe).
                 // We must return the proxyWallet if it exists, otherwise fallback to address.
                 if (user.proxyWallet && user.proxyWallet !== "0x0000000000000000000000000000000000000000") {
                     return user.proxyWallet;
                 }
                 return user.address;
             }
         }
    } catch (e) {
        console.warn("User resolution failed for:", cleanInput);
    }
    
    // 3. Fallback: If it's a valid address and API failed, return it as-is
    if (ethers.isAddress(cleanInput)) return cleanInput;
    
    return null;
}

/**
 * Fetches Open Orders with Metadata enrichment and Multi-address support
 */
export const fetchOpenOrders = async (address: string, originalInput?: string): Promise<OpenOrder[]> => {
    const addressesToTry = new Set<string>();
    addressesToTry.add(address);
    if (originalInput && ethers.isAddress(originalInput)) {
        addressesToTry.add(originalInput);
    }
    
    // Attempt to find proxy if address is EOA
    try {
        const encodedAddr = encodeURIComponent(address);
        const proxyCheckUrl = `${GAMMA_API_URL}/users?address=${encodedAddr}`;
        const resp = await fetchWithProxy(proxyCheckUrl);
        if (resp.ok) {
            const users = await resp.json();
            if (Array.isArray(users) && users.length > 0 && users[0].proxyWallet) {
                addressesToTry.add(users[0].proxyWallet);
            }
        }
    } catch(e) {}

    let allOrders: OpenOrder[] = [];

    // Fetch from all candidate addresses
    for (const addr of addressesToTry) {
        try {
            const orders = await fetchRawOpenOrders(addr);
            if (orders && orders.length > 0) {
                allOrders = [...allOrders, ...orders];
            }
        } catch(e) {
            // ignore failure for one candidate
        }
    }

    // Deduplicate by ID
    const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());

    if (uniqueOrders.length === 0) return [];

    return uniqueOrders.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Fetches trade history from CLOB API (Data/Trades).
 */
export const fetchTradeHistory = async (address: string): Promise<PositionHistory[]> => {
  if (!address) return [];
  const normalizedAddress = address.toLowerCase();

  try {
      // Fetch from CLOB API (Data Endpoint)
      const url = `${CLOB_API_URL}/data/trades?maker_address=${normalizedAddress}&limit=50`;
      const response = await fetchWithProxy(url);
      
      if (!response.ok) return []; // Fail silently if no CLOB data

      const trades = await response.json();
      if (!Array.isArray(trades)) return [];

      // We need to fetch market details for these asset_ids
      const assetIds = trades.map((t: any) => String(t.asset_id)).filter((id: string) => !!id && id !== 'undefined');
      
      let marketMap = new Map();
      try {
        marketMap = await fetchBatchMarkets(assetIds, 'id');
      } catch(e) {
        console.warn("Failed to fetch market metadata, showing raw trades");
      }

      return trades.map((t: any) => {
          const marketData = marketMap.get(String(t.asset_id));
          const price = parseFloat(t.price || '0');
          const size = parseFloat(t.size || '0');
          const amount = size * price; 
          
          return {
              id: t.match_id || t.timestamp,
              market: marketData?.question || `Market ${t.asset_id.slice(0,6)}...`,
              outcome: t.side === 'BUY' ? 'YES' : 'NO', 
              amount: amount,
              pnl: 0,
              date: new Date(parseInt(t.timestamp || t.match_time) * 1000).toLocaleDateString(),
              roi: 0
          };
      });

  } catch (error) {
      console.warn("Trade History Fetch Error:", error);
      return [];
  }
};

/**
 * Fetches active positions from The Graph (Decentralized & Robust Fallback)
 * Returns NULL on error, [] on success but empty.
 */
const fetchActivePositionsFromGraph = async (address: string): Promise<ActivePosition[] | null> => {
    // Note: The Graph ID often needs to be lowercase
    const query = `
      query GetUserPositions($user: String!) {
        user(id: $user) {
          positionBalances(first: 25, where: { amount_gt: "0" }) {
            amount
            id
            position {
              condition {
                id
                question {
                  title
                  outcomes
                }
              }
              indexSet
            }
          }
        }
      }
    `;

    try {
        const data = await querySubgraph(query, { user: address.toLowerCase() });
        
        // Return null if request failed (data is undefined)
        if (!data) return null;
        
        // Return empty array if user not found or no positions (valid response)
        if (!data.user || !data.user.positionBalances) return [];

        return data.user.positionBalances.map((pb: any) => {
            const position = pb.position;
            const condition = position.condition;
            const question = condition.question;
            
            let outcome: 'YES' | 'NO' = 'YES';
            if (position.indexSet === "1") outcome = 'NO';
            if (position.indexSet === "2") outcome = 'YES';
            
            let outcomeLabel = outcome;
            if (question && question.outcomes) {
                 try {
                    const outcomesArr = JSON.parse(question.outcomes);
                    if (position.indexSet === "2" && outcomesArr.length > 1) outcomeLabel = 'YES';
                    else if (position.indexSet === "1" && outcomesArr.length > 0) outcomeLabel = 'NO';
                 } catch(e) {}
            }

            const size = parseFloat(pb.amount || '0');
            
            return {
                id: pb.id,
                market: question?.title || `Condition ${condition.id.slice(0,6)}...`,
                outcome: outcomeLabel as 'YES' | 'NO',
                entryPrice: 0,
                currentPrice: 50,
                amount: size,
                pnl: 0,
                change24h: 0,
                volume: 'N/A',
                conditionId: condition.id
            } as ActivePosition;
        });
    } catch(e) {
        console.warn("Graph query failed with exception", e);
        return null;
    }
};

// Internal helper to fetch from Gamma with specific address
const fetchActivePositionsFromGamma = async (address: string): Promise<ActivePosition[]> => {
    const normalizedAddress = address.toLowerCase();
    // Reduce limit to prevent timeouts with proxies
    const url = `${GAMMA_API_URL}/positions?user=${normalizedAddress}&limit=100`; 
    
    try {
        const response = await fetchWithProxy(url);
        // 404 is valid (no positions)
        if (response.status === 404) return []; 
        if (!response.ok) throw new Error(`Gamma fetch failed with status ${response.status}`);

        let data;
        try {
            data = await response.json();
        } catch(e) {
            return []; 
        }
        
        if (!Array.isArray(data)) {
            if (data && Array.isArray(data.data)) data = data.data;
            else if (data && Array.isArray(data.results)) data = data.results;
            else return []; 
        }

        return data.map((p: any): ActivePosition | null => {
           if (!p) return null;

           const market = p.market || {};
           let outcomes = ['YES', 'NO'];
           try {
               if (typeof market.outcomes === 'string') outcomes = JSON.parse(market.outcomes);
               else if (Array.isArray(market.outcomes)) outcomes = market.outcomes;
           } catch (e) { }

           const idx = typeof p.outcomeIndex === 'number' ? p.outcomeIndex : parseInt(p.outcomeIndex || '0');
           const outcome = (outcomes[idx] || 'YES') as 'YES' | 'NO';
           
           const size = parseFloat(p.size || '0');
           const currentValue = parseFloat(p.currentValue || '0');
           
           let currentPrice = 0;
           if (market.outcomePrices) {
               try {
                   const prices = JSON.parse(market.outcomePrices);
                   if (prices[idx]) currentPrice = parseFloat(prices[idx]) * 100;
               } catch(e) {}
           }
           if (currentPrice === 0 && size > 0) {
               currentPrice = (currentValue / size) * 100;
           }
           
           if (currentPrice > 100) currentPrice = 100;
           const pnl = parseFloat(p.pnl || '0');
           if (size < 0.000001) return null;

           return {
               id: p.asset_id ? String(p.asset_id) : `pos-${Math.random()}`,
               market: market.question || `Unknown Market (${p.asset_id?.slice(0,6)})`,
               outcome: outcome,
               entryPrice: Number(p.avgPrice || 0) * 100, 
               currentPrice: parseFloat(currentPrice.toFixed(1)),
               amount: size,
               pnl: pnl,
               change24h: 0, 
               volume: 'Unknown',
               conditionId: market.conditionId
           } as ActivePosition;
       }).filter((p): p is ActivePosition => p !== null);
    } catch (e) {
        console.warn("Gamma Fetch Error Details:", e);
        throw e;
    }
};

/**
 * Main Fetcher for Positions
 * Attempts to fetch positions from Gamma, falling back to or merging with The Graph.
 */
export const fetchActivePositions = async (address: string, originalInput?: string): Promise<ActivePosition[] | null> => {
    if (!address) return [];
    
    const addressesToTry = new Set<string>();
    addressesToTry.add(address);
    if (originalInput && ethers.isAddress(originalInput)) {
        addressesToTry.add(originalInput);
    }
    
    // Explicitly try to find the proxy for the given address again, just in case
    try {
        const encodedAddr = encodeURIComponent(address);
        const proxyCheckUrl = `${GAMMA_API_URL}/users?address=${encodedAddr}`;
        const resp = await fetchWithProxy(proxyCheckUrl);
        if (resp.ok) {
            const users = await resp.json();
            if (Array.isArray(users) && users.length > 0 && users[0].proxyWallet) {
                addressesToTry.add(users[0].proxyWallet);
            }
        }
    } catch(e) {}

    let allPositions: ActivePosition[] = [];
    let connectionMade = false;

    // Try all candidate addresses (EOA and Proxy)
    for (const addr of addressesToTry) {
        // STRATEGY 1: Gamma API (Preferred for metadata)
        try {
            const gammaPos = await fetchActivePositionsFromGamma(addr);
            // If Gamma returns valid array (empty or not), we have a connection
            connectionMade = true;
            if (gammaPos.length > 0) {
                allPositions = [...allPositions, ...gammaPos];
            }
        } catch (e) {
            console.warn(`Gamma Fetch Failed for ${addr}`, e);
        }

        // STRATEGY 2: The Graph (Fallback/Robustness)
        try {
            const graphPos = await fetchActivePositionsFromGraph(addr);
            
            // If Graph returns a valid array (null means error), mark connection as successful
            if (graphPos !== null) {
                connectionMade = true;
                if (graphPos.length > 0) {
                    // Merge Graph positions. prefer Gamma for price data.
                    const existingIds = new Set(allPositions.map(p => p.conditionId || p.id));
                    const newGraphPos = graphPos.filter(p => !existingIds.has(p.conditionId || p.id));
                    allPositions = [...allPositions, ...newGraphPos];
                }
            }
        } catch (e) {
            console.warn(`Graph Fetch Failed for ${addr}`, e);
        }
    }

    // Deduplicate based on unique asset IDs or Condition IDs
    const uniquePositions = Array.from(new Map(allPositions.map(p => [p.id, p])).values());
    
    // CRITICAL FIX: If no connection was made to ANY endpoint (total network failure or CORS block),
    // return NULL to signal "Error" state to UI, rather than empty array.
    if (!connectionMade && uniquePositions.length === 0) {
        return null; 
    }
    
    // If connectionMade is true, it means we successfully checked at least one source.
    // So empty array is a valid "No Positions" result.
    return uniquePositions.sort((a, b) => (b.amount * b.currentPrice) - (a.amount * a.currentPrice));
};

/**
 * Polls recent trades via CLOB API.
 */
export const pollRecentTrades = async (address: string, sinceTimestamp: number): Promise<any[]> => {
    // ... existing pollRecentTrades code ...
    if (!address) return [];
    const normalizedAddress = address.toLowerCase();

    try {
        const url = `${CLOB_API_URL}/data/trades?maker_address=${normalizedAddress}&limit=10`;
        const response = await fetchWithProxy(url);
        
        if (!response.ok) return [];

        const trades = await response.json();
        if (!Array.isArray(trades)) return [];

        const newTrades = trades.filter((t: any) => {
            const txTime = parseInt(t.timestamp || t.match_time);
            return txTime > sinceTimestamp;
        });

        if (newTrades.length === 0) return [];

        const assetIds = newTrades.map((t: any) => String(t.asset_id)).filter(id => id && id !== 'undefined');
        let marketMap = new Map();
        try {
            marketMap = await fetchBatchMarkets(assetIds, 'id');
        } catch(e) {}

        return newTrades.map((t: any) => {
            const marketData = marketMap.get(String(t.asset_id));
            const size = parseFloat(t.size || '0');
            
            return {
                hash: t.match_id || `tx-${t.timestamp}`,
                timestamp: parseInt(t.timestamp || t.match_time),
                market: marketData?.question || `Market ${t.asset_id.slice(0,6)}...`,
                outcome: t.side === 'BUY' ? 'YES' : 'NO',
                amount: size,
                tokenId: t.asset_id,
                side: t.side
            };
        });

    } catch (error) {
        return [];
    }
};
