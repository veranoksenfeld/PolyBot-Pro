
import { VaultState, VaultTransaction } from '../types';

export const INITIAL_VAULT_STATE: VaultState = {
  totalAssets: 1000000, // $1M initial TVL
  totalSupply: 1000000, // 1:1 initial peg
  sharePrice: 1.0,
  apy: 12.5, // 12.5% APY
  userShares: 0,
  userBalanceUSDC: 5000 // Initial simulated wallet balance
};

// Simulate random yield generation
export const calculateNewYield = (currentState: VaultState): VaultState => {
  // Simulate a small profit from trading (0.01% - 0.05%)
  const profitPercent = (Math.random() * 0.04 + 0.01) / 100; 
  const profitAmount = currentState.totalAssets * profitPercent;
  
  const newAssets = currentState.totalAssets + profitAmount;
  // Supply stays same, price increases
  const newSharePrice = newAssets / currentState.totalSupply;
  
  // Recalculate APY based on this tick (extrapolated) - smoothed
  const instantApy = profitPercent * 365 * 100; // rough annualized
  const newApy = (currentState.apy * 0.95) + (instantApy * 0.05); // Moving average

  return {
    ...currentState,
    totalAssets: newAssets,
    sharePrice: newSharePrice,
    apy: newApy
  };
};

export const simulateDeposit = (state: VaultState, amount: number): { newState: VaultState, tx: VaultTransaction } => {
  if (amount > state.userBalanceUSDC) throw new Error("Insufficient Funds");
  if (amount <= 0) throw new Error("Invalid Amount");

  // Calculate shares to mint
  // shares = (amount * totalSupply) / totalAssets
  // If totalSupply is 0, shares = amount
  const sharesToMint = state.totalSupply === 0 
    ? amount 
    : (amount * state.totalSupply) / state.totalAssets;

  const newState: VaultState = {
    ...state,
    totalAssets: state.totalAssets + amount,
    totalSupply: state.totalSupply + sharesToMint,
    userShares: state.userShares + sharesToMint,
    userBalanceUSDC: state.userBalanceUSDC - amount,
    // Share price remains constant during deposit (value matches)
  };

  const tx: VaultTransaction = {
    id: `tx-${Date.now()}`,
    type: 'DEPOSIT',
    amount: amount,
    shares: sharesToMint,
    timestamp: new Date(),
    status: 'CONFIRMED',
    hash: '0x' + Math.random().toString(16).substr(2, 40)
  };

  return { newState, tx };
};

export const simulateWithdraw = (state: VaultState, shares: number): { newState: VaultState, tx: VaultTransaction } => {
  if (shares > state.userShares) throw new Error("Insufficient Shares");
  if (shares <= 0) throw new Error("Invalid Share Amount");

  // Calculate assets to return
  // assets = (shares * totalAssets) / totalSupply
  const assetsToReturn = (shares * state.totalAssets) / state.totalSupply;

  const newState: VaultState = {
    ...state,
    totalAssets: state.totalAssets - assetsToReturn,
    totalSupply: state.totalSupply - shares,
    userShares: state.userShares - shares,
    userBalanceUSDC: state.userBalanceUSDC + assetsToReturn,
  };

  const tx: VaultTransaction = {
    id: `tx-${Date.now()}`,
    type: 'WITHDRAW',
    amount: assetsToReturn,
    shares: shares,
    timestamp: new Date(),
    status: 'CONFIRMED',
    hash: '0x' + Math.random().toString(16).substr(2, 40)
  };

  return { newState, tx };
};
