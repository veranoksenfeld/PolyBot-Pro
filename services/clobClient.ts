import { ethers } from 'ethers';
import { TradeConfig, ClobApiCreds, SignedOrder } from '../types';
import { CLOB_API_URL, POLYGON_CHAIN_ID, CTF_EXCHANGE_ADDR } from '../utils/constants';

// EIP-712 Domain Separator for Polymarket
const DOMAIN = {
  name: "Polymarket CTF Exchange",
  version: "1",
  chainId: POLYGON_CHAIN_ID,
  verifyingContract: CTF_EXCHANGE_ADDR
};

const TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "taker", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiration", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "feeRate", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" }
  ]
};

// Robust Base64 decoder that handles standard and URL-safe base64
function base64ToBytes(base64: string): Uint8Array {
    const binString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
}

// Helper for HMAC-SHA256 signature in browser
async function signHeader(secret: string, timestamp: string, method: string, path: string, body?: string): Promise<string> {
    const message = `${timestamp}${method}${path}${body || ''}`;
    const enc = new TextEncoder();
    const algorithm = { name: "HMAC", hash: "SHA-256" };
    
    let keyBytes: Uint8Array;
    try {
        // Try decoding as base64 first (Standard for Poly keys)
        keyBytes = base64ToBytes(secret);
    } catch {
        // If not valid base64, assume raw string
        keyBytes = enc.encode(secret);
    }
    
    const key = await window.crypto.subtle.importKey(
        "raw", 
        keyBytes, 
        algorithm, 
        false, 
        ["sign"]
    );
    
    const signature = await window.crypto.subtle.sign(
        algorithm, 
        key, 
        enc.encode(message)
    );
    
    // Convert signature back to base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export class ClobClient {
  private wallet: ethers.Wallet;
  private creds?: ClobApiCreds;

  constructor(privateKey: string, rpcUrl: string, creds?: ClobApiCreds) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.creds = creds;
  }

  // Generate headers for authentication
  private async getHeaders(method: string, path: string, body?: string): Promise<HeadersInit> {
    if (!this.creds) {
        throw new Error("API Credentials missing. Cannot sign request.");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const signature = await signHeader(
        this.creds.secret, 
        timestamp, 
        method, 
        path, 
        body
    );

    return {
      'Content-Type': 'application/json',
      'Poly-Api-Key': this.creds.key,
      'Poly-Api-Signature': signature,
      'Poly-Timestamp': timestamp,
      'Poly-Api-Passphrase': this.creds.passphrase
    };
  }

  public async signOrder(
    tokenId: string,
    side: 'BUY' | 'SELL',
    amount: number, // in USDC
    price: number   // 0.0 to 1.0
  ): Promise<SignedOrder> {
    const salt = Math.floor(Math.random() * 1000000);
    const nonce = 0; 
    
    const sideInt = side === 'BUY' ? 0 : 1;
    const makerAmount = ethers.parseUnits(amount.toString(), 6);
    const takerAmount = 0; 
    
    const order = {
      salt,
      maker: this.wallet.address,
      signer: this.wallet.address,
      taker: "0x0000000000000000000000000000000000000000",
      tokenId,
      makerAmount: makerAmount.toString(),
      takerAmount: takerAmount.toString(),
      expiration: Math.floor(Date.now() / 1000) + 300, 
      nonce,
      feeRate: 0,
      side: sideInt,
      signatureType: 0 
    };

    const signature = await this.wallet.signTypedData(DOMAIN, TYPES, order);

    return {
      ...order,
      signature
    };
  }

  public async postOrder(signedOrder: SignedOrder): Promise<any> {
    if (!this.creds) {
       console.warn("No API Keys for CLOB. Skipping HTTP Post.");
       return { orderID: "0x_mock_clob_id_" + Date.now() };
    }

    const path = "/order";
    const body = JSON.stringify(signedOrder);
    const headers = await this.getHeaders("POST", path, body);

    const response = await fetch(`${CLOB_API_URL}${path}`, {
      method: "POST",
      headers,
      body
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`CLOB Error: ${err}`);
    }

    return await response.json();
  }

  public async cancelAll(): Promise<void> {
    if (!this.creds) return;
    const path = "/orders";
    const headers = await this.getHeaders("DELETE", path);
    await fetch(`${CLOB_API_URL}${path}`, { method: "DELETE", headers });
  }
}