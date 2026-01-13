import { TradeLog, ActivePosition, TradeConfig } from '../types';

const MARKETS = [
  "Will Trump win 2024 Election?",
  "Fed Interest Rate Cut in March?",
  "Bitcoin > $100k by Dec 2024?",
  "SpaceX Starship launch successful?",
  "Taylor Swift Album of the Year?",
  "Will GPT-5 release in 2024?",
  "ETH ETF Approval by May?",
  "Solana > $200 in Q3?"
];

const ACTIONS = ['BUY', 'SELL'];
const OUTCOMES = ['YES', 'NO'];

// State to manage pending transactions for the simulation
let pendingTransactions: Array<{
  id: string;
  timestamp: number;
  market: string;
  action: string;
  outcome: string;
  amount: number;
  retryCount: number;
}> = [];

export const generateEngineLogs = (config: TradeConfig): TradeLog[] => {
  const logs: TradeLog[] = [];
  const now = Date.now();
  
  // 1. Randomly clear old pending transactions (simulate network drop or timeout)
  pendingTransactions = pendingTransactions.filter(tx => now - tx.timestamp < 10000);

  // 2. Chance to detect NEW activity
  if (Math.random() > 0.85) { // 15% chance per tick
    const market = MARKETS[Math.floor(Math.random() * MARKETS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const outcome = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
    const amount = Math.floor(Math.random() * 500) + 50;
    
    const txId = Math.random().toString(36).substr(2, 9);
    
    // Add to state
    pendingTransactions.push({
      id: txId,
      timestamp: now,
      market,
      action,
      outcome,
      amount,
      retryCount: 0
    });

    // Log based on Monitoring Mode
    if (config.monitoringMode === 'MEMPOOL' || config.monitoringMode === 'HYBRID') {
      logs.push({
        id: `detect-${txId}`,
        timestamp: new Date(),
        type: 'PENDING',
        message: `Mempool: Pending ${action} detected from target. Hash: 0x${Math.random().toString(16).substr(2, 6)}...`
      });
      
      if (config.gasPriority === 'INSTANT') {
         logs.push({
            id: `frontrun-${txId}`,
            timestamp: new Date(),
            type: 'FRONTRUN',
            message: `Frontrunning: Boosting gas to ${300 + Math.floor(Math.random() * 50)} Gwei. Multiplier: ${config.copyMultiplier}x`
         });
      }
    } else if (config.monitoringMode === 'POLLING') {
      logs.push({
        id: `poll-${txId}`,
        timestamp: new Date(),
        type: 'PENDING',
        message: `Polling: New position change detected on Chain. Syncing...`
      });
    }
  }

  // 3. Process Pending Transactions (Execution Phase)
  // We'll process one pending transaction per tick if available
  const txToProcess = pendingTransactions.find(tx => now - tx.timestamp > 2000); // 2 seconds "confirmation time"
  
  if (txToProcess) {
    // Remove from pending
    pendingTransactions = pendingTransactions.filter(t => t.id !== txToProcess.id);
    
    // Error Injection Logic (Robust Error Handling)
    const shouldFail = Math.random() > 0.9; // 10% failure rate
    
    if (shouldFail) {
      logs.push({
        id: `err-${txToProcess.id}`,
        timestamp: new Date(),
        type: 'ERROR',
        message: `Execution Failed: Slippage exceeded or Node Timeout.`
      });
      
      // Retry Logic
      if (txToProcess.retryCount < config.retryAttempts) {
        txToProcess.retryCount++;
        txToProcess.timestamp = now; // Reset timer
        pendingTransactions.push(txToProcess); // Re-queue
        logs.push({
          id: `retry-${txToProcess.id}`,
          timestamp: new Date(),
          type: 'RETRY',
          message: `Retrying transaction (${txToProcess.retryCount}/${config.retryAttempts})...`
        });
      }
    } else {
      // Success
      const finalAmount = Math.floor(txToProcess.amount * config.copyMultiplier);
      logs.push({
        id: `success-${txToProcess.id}`,
        timestamp: new Date(),
        type: 'SUCCESS',
        message: `Confirmed: ${txToProcess.action} ${finalAmount} USDC on "${txToProcess.market}"`,
        hash: '0x' + Math.random().toString(16).substr(2, 40),
        amount: finalAmount,
        asset: txToProcess.market,
        outcome: txToProcess.outcome as 'YES' | 'NO'
      });
    }
  }

  // 4. Idle / Polling logs (Heartbeat)
  // Increased frequency to ensure user sees activity
  if (logs.length === 0 && Math.random() > 0.6) {
    const gas = 30 + Math.floor(Math.random() * 5);
    const latency = 120 + Math.floor(Math.random() * 50);

    if (config.monitoringMode === 'HYBRID') {
       // Alternate between Mempool and Polling messages for Hybrid
       if (Math.random() > 0.5) {
         logs.push({
           id: Math.random().toString(),
           timestamp: new Date(),
           type: 'INFO',
           message: `Mempool (WSS): Scanning block pending... Gas: ${gas} Gwei`
         });
       } else {
         logs.push({
           id: Math.random().toString(),
           timestamp: new Date(),
           type: 'INFO',
           message: `Polling (Gamma): Syncing orderbook... Latency: ${latency}ms`
         });
       }
    } else if (config.monitoringMode === 'MEMPOOL') {
       logs.push({
         id: Math.random().toString(),
         timestamp: new Date(),
         type: 'INFO',
         message: `Mempool (WSS): Scanning block pending... Gas: ${gas} Gwei`
       });
    } else {
       logs.push({
         id: Math.random().toString(),
         timestamp: new Date(),
         type: 'INFO',
         message: `Polling (Gamma): Checking target positions... Latency: ${latency}ms`
       });
    }
  }

  return logs;
};

// Return empty to ensure clean state by default
export const generateMockPositions = (): ActivePosition[] => {
  return [];
};