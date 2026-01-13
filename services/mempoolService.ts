
import { TradeLog } from '../types';
import { decodeTransactionInput } from './decoderService';
import { fetchMarketDetails } from './polymarketApi';
import { CTF_EXCHANGE_ADDR } from '../utils/constants';

const SEEN_HASHES = new Set<string>();
const MAX_HISTORY = 1000;

interface RPCTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  gasPrice: string;
}

export const scanMempool = async (rpcUrl: string, targetWallet: string): Promise<TradeLog[]> => {
  const logs: TradeLog[] = [];
  const target = targetWallet.toLowerCase();

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['pending', true],
        id: Date.now()
      })
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "RPC Error");
    if (!data.result || !data.result.transactions) return [];

    const transactions: RPCTransaction[] = data.result.transactions;

    for (const tx of transactions) {
      if (!tx.to || !tx.from) continue;
      
      const isTarget = tx.from.toLowerCase() === target;

      // Filter: Must be from target AND interacting with Polymarket Exchange
      if (isTarget && tx.to.toLowerCase() === CTF_EXCHANGE_ADDR.toLowerCase()) {
         if (!SEEN_HASHES.has(tx.hash)) {
            SEEN_HASHES.add(tx.hash);
            if (SEEN_HASHES.size > MAX_HISTORY) SEEN_HASHES.delete(SEEN_HASHES.values().next().value);

            // DECODE THE TRANSACTION
            const decoded = decodeTransactionInput(tx.input);
            
            let message = "Mempool: Polymarket interaction detected";
            let outcome: 'YES' | 'NO' = 'YES';
            let amount = 0;
            let marketName = "Unknown Market";

            if (decoded) {
               // Try to fetch market details (Real Logic)
               try {
                  const marketData = await fetchMarketDetails(decoded.tokenId);
                  if (marketData) {
                    marketName = marketData.question;
                  }
               } catch(e) {
                 // ignore fetch error to not block execution
               }
               
               outcome = decoded.side === 'BUY' ? 'YES' : 'NO';
               amount = Number(decoded.takerAmount) / 1e6; // USDC decimals
               message = `Signal: ${decoded.side} ${outcome} on "${marketName.slice(0, 30)}..."`;

               logs.push({
                 id: tx.hash,
                 timestamp: new Date(),
                 type: 'PENDING', // It's in mempool
                 message: message,
                 hash: tx.hash,
                 amount: amount > 0 ? amount : undefined,
                 outcome: outcome,
                 tokenId: decoded.tokenId, // Pass the real Token ID
                 side: decoded.side
               });
            } else {
               // Fallback if not decoded (raw interaction)
               logs.push({
                 id: tx.hash,
                 timestamp: new Date(),
                 type: 'INFO',
                 message: "Mempool: Undecoded Polymarket Interaction",
                 hash: tx.hash
               });
            }
         }
      }
    }

  } catch (e: any) {
    throw new Error(e.message || "Network Error");
  }

  return logs;
};