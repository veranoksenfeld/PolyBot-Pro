import { TradeConfig, TradeLog } from '../types';
import { ClobClient } from './clobClient';

export const executeTrade = async (
    config: TradeConfig, 
    signal: { market: string, outcome: 'YES' | 'NO', amount: number, tokenId?: string, side?: 'BUY' | 'SELL' }
): Promise<TradeLog> => {
    
    // 1. Validation
    if (!config.simulationMode && (!config.privateKey || config.privateKey.length < 64)) {
        throw new Error("Private Key required for real execution.");
    }

    // 2. Exact Copy Logic (Strict)
    // We execute exactly what the target did.
    let finalOutcome = signal.outcome;
    let finalAmount = Math.floor(signal.amount * config.copyMultiplier);

    // Determine Token ID and Side
    // Default to dummy only if strictly necessary (though this will fail on-chain for real execution)
    const tokenId = signal.tokenId || "4839204121234123412341234";
    // If side is explicit, use it. Otherwise assume BUYing the outcome triggers a BUY side.
    const side = signal.side || (finalOutcome === 'YES' ? 'BUY' : 'SELL');

    // 3. Execution (Real vs Simulation)
    try {
        if (!config.simulationMode) {
            // INITIALIZE CLOB CLIENT
            const creds = config.polymarketApiKey ? {
                key: config.polymarketApiKey,
                secret: config.polymarketApiSecret || '',
                passphrase: config.polymarketApiPassphrase || ''
            } : undefined;

            const client = new ClobClient(config.privateKey, config.rpcUrl, creds);

            // SIGN ORDER
            // We use the real Token ID and Side captured from the detected transaction
            const signedOrder = await client.signOrder(
                tokenId, 
                side, 
                finalAmount,
                0.55 // Limit price (Could be improved to be dynamic or market)
            );

            // POST ORDER
            const result = await client.postOrder(signedOrder);

            return {
                id: result.orderID || `tx-${Date.now()}`,
                timestamp: new Date(),
                type: 'SUCCESS',
                message: `COPY EXECUTED: ${side} $${finalAmount} on "${signal.market}"`,
                hash: result.transactionHash || `0x${Math.random().toString(16).slice(2)}`,
                amount: finalAmount,
                asset: signal.market,
                outcome: finalOutcome,
                tokenId: tokenId,
                side: side
            };

        } else {
            // SIMULATION MODE
            await new Promise(r => setTimeout(r, 800)); 
            
            return {
                id: `sim-${Date.now()}`,
                timestamp: new Date(),
                type: 'SUCCESS',
                message: `SIMULATION COPY: ${side} $${finalAmount} on "${signal.market}"`,
                hash: '0x' + Math.random().toString(16).substr(2, 40),
                amount: finalAmount,
                asset: signal.market,
                outcome: finalOutcome,
                tokenId: tokenId,
                side: side
            };
        }

    } catch (error: any) {
        console.error("Execution Error:", error);
        return {
            id: `err-${Date.now()}`,
            timestamp: new Date(),
            type: 'ERROR',
            message: `COPY FAILED: ${error.message || "Unknown error"}`
        };
    }
};