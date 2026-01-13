
import { ethers } from 'ethers';
import { CTF_EXCHANGE_ABI } from '../abis/CTFExchangeABI';

// Initialize Interface once
const iface = new ethers.Interface(CTF_EXCHANGE_ABI);

export interface DecodedTrade {
  functionName: string;
  tokenId: string;
  makerAmount: bigint;
  takerAmount: bigint;
  side: 'BUY' | 'SELL';
}

/**
 * Decodes the input data of a transaction to see if it's a Polymarket trade.
 * @param inputData The '0x...' input string from a transaction
 */
export const decodeTransactionInput = (inputData: string): DecodedTrade | null => {
  try {
    const decoded = iface.parseTransaction({ data: inputData });

    if (!decoded) return null;

    // We are looking for fillOrders calls
    if (decoded.name === 'fillOrders') {
      const orders = decoded.args[0]; // Array of Order structs
      
      // For simplicity in this demo, we take the first order in the batch
      // Real bots iterate through all orders
      if (orders && orders.length > 0) {
        const order = orders[0];
        
        return {
          functionName: 'fillOrders',
          tokenId: order.tokenId.toString(),
          makerAmount: order.makerAmount,
          takerAmount: order.takerAmount,
          side: order.side === 0 ? 'BUY' : 'SELL' // 0 = Buy, 1 = Sell usually in CTF
        };
      }
    }
    
    return null;
  } catch (error) {
    // Fails silently if input data doesn't match ABI (not a CTF trade)
    return null;
  }
};
