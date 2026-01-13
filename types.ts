
export interface TradeConfig {
  targetWallet: string;
  
  // Execution Credentials
  executionMethod: 'PRIVATE_KEY' | 'POLYMARKET_API';
  privateKey: string; 
  polymarketApiKey?: string;
  polymarketApiSecret?: string;
  polymarketApiPassphrase?: string;
  
  // Trading Parameters
  maxBetAmount: number; 
  minOrderAmount: number; // Minimum amount to trigger a copy
  stopLossPercentage: number;
  isEnabled: boolean;
  simulationMode: boolean;
  rpcUrl: string;
  
  // Advanced Features
  monitoringMode: 'MEMPOOL' | 'POLLING' | 'HYBRID';
  gasPriority: 'STANDARD' | 'FAST' | 'INSTANT' | 'CUSTOM';
  customGasGwei: number;
  copyMultiplier: number;
  retryAttempts: number;
  slippage: number;
}

export interface TradeLog {
  id: string;
  timestamp: Date;
  type: 'INFO' | 'PENDING' | 'FRONTRUN' | 'BUY' | 'SELL' | 'ERROR' | 'SUCCESS' | 'RETRY' | 'ALERT';
  message: string;
  hash?: string;
  amount?: number;
  asset?: string;
  outcome?: 'YES' | 'NO';
  tokenId?: string; // Critical for execution
  side?: 'BUY' | 'SELL'; // Explicit side
}

export interface ActivePosition {
  id: string;
  market: string;
  outcome: 'YES' | 'NO';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  change24h: number;
  volume: string;
  conditionId?: string;
}

export interface OpenOrder {
  id: string;
  market: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  price: number;
  size: number; // Original size
  filled: number;
  status: string;
  timestamp: number;
}

export interface PositionHistory {
  id: string;
  market: string;
  outcome: 'YES' | 'NO';
  amount: number;
  pnl: number;
  date: string;
  roi: number;
}

export interface WalletInfo {
    address: string;
    nativeBalance: string;
    nativeSymbol: string;
    tokens: Array<{ symbol: string, balance: string }>;
}

// --- CLOB API TYPES ---
export interface ClobApiCreds {
  key: string;
  secret: string;
  passphrase: string;
}

export interface SignedOrder {
  salt: number;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: number;
  nonce: number;
  feeRate: number;
  side: number; // 0 = BUY, 1 = SELL
  signatureType: number;
  signature: string;
}

export interface MarketInsight {
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  strategyGuess: string;
}

// --- REPO / ANALYSIS TYPES ---

export interface RepoNode {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Vulnerability {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  line?: number;
}

export interface AuditResult {
  score: number;
  isScam: boolean;
  summary: string;
  vulnerabilities: Vulnerability[];
  remediatedCode?: string;
}

// --- VAULT TYPES ---
export interface VaultState {
  totalAssets: number;
  totalSupply: number; // Total Shares
  sharePrice: number;
  apy: number;
  userShares: number;
  userBalanceUSDC: number; // Mock balance for simulation
}

export interface VaultTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'YIELD';
  amount: number; // USDC Amount
  shares: number; // Shares minted/burned
  timestamp: Date;
  hash?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}
