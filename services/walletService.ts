import { ethers } from 'ethers';
import { WalletInfo } from '../types';

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Polygon Token Addresses
const TOKENS: Record<number, Record<string, string>> = {
  137: {
    'POL': "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6",
    'USDC': "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",    // Native USDC
    'USDC.e': "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // Bridged USDC
  },
  80001: {
    'MATIC': "0x0000000000000000000000000000000000001010", // Precompile
    'USDC': "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97"  // Mumbai USDC (Legacy)
  },
  80002: {
    'POL': "0x0000000000000000000000000000000000001010",
    'USDC': "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"  // Amoy USDC (Standard)
  }
};

// Helper: robust timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackValue?: T): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Timed out after ${ms}ms`));
        }, ms);
    });
    
    return Promise.race([
        promise,
        timeout
    ]).catch(err => {
        if (fallbackValue !== undefined) return fallbackValue;
        throw err;
    });
};

/**
 * Fetches native balance and relevant token balances based on chain ID.
 * Uses granular timeouts to prevent total failure if one token hangs.
 */
export const fetchWalletInfo = async (rpcUrl: string, address: string): Promise<WalletInfo | null> => {
  if (!address || !ethers.isAddress(address)) return null;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 1. Fetch Critical Data (Network + Native Balance)
    // We give this 8 seconds. If this fails, we cannot proceed.
    const [network, balanceWei] = await withTimeout(
        Promise.all([
            provider.getNetwork(),
            provider.getBalance(address)
        ]), 
        8000 
    );

    const chainId = Number(network.chainId);
    const nativeBalance = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);

    let nativeSymbol = 'ETH';
    if (chainId === 137) nativeSymbol = 'POL'; // Polygon PoS
    else if (chainId === 56) nativeSymbol = 'BNB';
    else if (chainId === 43114) nativeSymbol = 'AVAX';
    else if (chainId === 80001 || chainId === 80002) nativeSymbol = 'POL';

    const tokens: Array<{ symbol: string, balance: string }> = [];

    // 2. Fetch Token Balances (Non-Critical)
    const chainTokens = TOKENS[chainId];
    if (chainTokens) {
        const tokenPromises = Object.entries(chainTokens).map(async ([symbol, tokenAddress]) => {
            // Skip Native Token addresses in ERC20 logic
            if (tokenAddress === "0x0000000000000000000000000000000000001010" || tokenAddress === ethers.ZeroAddress) return null;
            
            try {
                const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
                
                // Fetch individually with short 4s timeout.
                // If this fails, we return a placeholder rather than failing the whole wallet load.
                const [rawBalance, decimals] = await withTimeout(
                    Promise.all([
                        contract.balanceOf(address),
                        contract.decimals().catch(() => 18n) // Fallback to 18 if decimals() fails
                    ]),
                    4000
                );

                const formatted = parseFloat(ethers.formatUnits(rawBalance, decimals)).toFixed(2);
                return { symbol, balance: formatted };
            } catch (e) {
                // Return a placeholder indicating error for this specific token
                return { symbol, balance: "..." };
            }
        });

        const results = await Promise.all(tokenPromises);
        results.forEach(res => {
            if (res) tokens.push(res);
        });
    }

    return {
        address,
        nativeBalance,
        nativeSymbol,
        tokens
    };

  } catch (error) {
    // Only log if it's NOT a timeout to reduce noise, or if it's a critical error
    const msg = (error as Error).message;
    if (!msg.includes('Timed out')) {
        console.warn("Wallet Fetch Error:", error);
    }
    return null;
  }
};

/**
 * Validates the RPC connection status.
 */
export const validateRpcConnection = async (rpcUrl: string): Promise<{ success: boolean; chainId?: number; name?: string; error?: string }> => {
  if (!rpcUrl) return { success: false, error: "URL is empty" };
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Strict 10s timeout for validation
    const network = await withTimeout(provider.getNetwork(), 10000) as any;
    
    return {
      success: true,
      chainId: Number(network.chainId),
      name: network.name
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Connection failed"
    };
  }
};
