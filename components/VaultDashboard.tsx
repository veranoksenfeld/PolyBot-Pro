
import React, { useState } from 'react';
import { VaultState, VaultTransaction } from '../types';
import { TrendingUp, ArrowDown, ArrowUp, Wallet, Activity, Clock, ShieldCheck, Info, PieChart, Coins } from 'lucide-react';

interface Props {
  state: VaultState;
  transactions: VaultTransaction[];
  onDeposit: (amount: number) => void;
  onWithdraw: (shares: number) => void;
}

export const VaultDashboard: React.FC<Props> = ({ state, transactions, onDeposit, onWithdraw }) => {
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [amount, setAmount] = useState<string>('');
  
  const handleAction = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if (activeTab === 'DEPOSIT') {
      onDeposit(val);
    } else {
      // Input for withdraw is usually in shares or assets? 
      // Simplified: Input is Shares for withdraw
      onWithdraw(val);
    }
    setAmount('');
  };

  const estimatedShares = activeTab === 'DEPOSIT' && amount 
    ? (parseFloat(amount) / state.sharePrice).toFixed(4)
    : '0.0000';

  const estimatedAssets = activeTab === 'WITHDRAW' && amount 
    ? (parseFloat(amount) * state.sharePrice).toFixed(2)
    : '0.00';

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 p-4 gap-4 overflow-y-auto">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-800 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><TrendingUp className="w-16 h-16 text-white" /></div>
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">APY (Variable)</h3>
          <div className="text-3xl font-bold text-white flex items-baseline gap-1">
             {state.apy.toFixed(2)}%
          </div>
          <span className="text-[10px] text-indigo-400">Based on recent bot performance</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Share Price</h3>
          <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
             1.00 <span className="text-gray-600 text-sm">→</span> {state.sharePrice.toFixed(4)}
          </div>
          <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1">
            <ArrowUp className="w-3 h-3" /> All time profit
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">TVL</h3>
          <div className="text-2xl font-bold text-white font-mono">
             ${(state.totalAssets / 1000000).toFixed(2)}M
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
             Total Value Locked
          </span>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        
        {/* ACTION PANEL */}
        <div className="w-96 flex flex-col gap-4 bg-gray-900 border border-gray-800 rounded-xl p-6 shrink-0 h-fit">
           <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <h2 className="font-bold text-lg">Vault Operations</h2>
           </div>

           <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
             <button 
               onClick={() => { setActiveTab('DEPOSIT'); setAmount(''); }}
               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'DEPOSIT' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
             >
               DEPOSIT
             </button>
             <button 
               onClick={() => { setActiveTab('WITHDRAW'); setAmount(''); }}
               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'WITHDRAW' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
             >
               WITHDRAW
             </button>
           </div>

           <div className="space-y-4">
              <div className="bg-gray-950/50 p-3 rounded border border-gray-800">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Available Balance</span>
                  <span>{activeTab === 'DEPOSIT' ? `$${state.userBalanceUSDC.toFixed(2)}` : `${state.userShares.toFixed(4)} Shares`}</span>
                </div>
                <div className="relative">
                   <input 
                     type="number" 
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                     className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder-gray-700"
                     placeholder="0.00"
                   />
                   <button 
                     onClick={() => setAmount(activeTab === 'DEPOSIT' ? state.userBalanceUSDC.toString() : state.userShares.toString())}
                     className="absolute right-0 top-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                   >
                     MAX
                   </button>
                </div>
              </div>

              {/* Estimation Area */}
              <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{activeTab === 'DEPOSIT' ? 'Receive (Est.)' : 'Receive (Est.)'}</span>
                    <span className="font-mono font-bold">
                       {activeTab === 'DEPOSIT' ? `${estimatedShares} Shares` : `$${estimatedAssets}`}
                    </span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Exchange Rate</span>
                    <span className="text-gray-400">1 Share = ${state.sharePrice.toFixed(4)}</span>
                 </div>
              </div>

              <button 
                onClick={handleAction}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                {activeTab}
              </button>
           </div>
        </div>

        {/* INFO & TRANSACTIONS */}
        <div className="flex-1 flex flex-col gap-4">
           
           {/* Info Card */}
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2">
                 <Info className="w-4 h-4 text-gray-500" /> Strategy Overview
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                 The PolyBot Vault (ERC-4626) automates capital allocation across high-confidence prediction markets.
                 Deposited USDC is utilized by the bot engine to execute copy-trading and front-running strategies.
                 Profits are compounded back into the vault, increasing the Share Price.
              </p>
           </div>

           {/* User Stats */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                 <div className="bg-purple-900/20 p-2 rounded-lg border border-purple-900/50">
                    <PieChart className="w-6 h-6 text-purple-400" />
                 </div>
                 <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Your Shares</div>
                    <div className="text-xl font-bold text-white font-mono">{state.userShares.toFixed(4)}</div>
                 </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                 <div className="bg-green-900/20 p-2 rounded-lg border border-green-900/50">
                    <Coins className="w-6 h-6 text-green-400" />
                 </div>
                 <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Value (USDC)</div>
                    <div className="text-xl font-bold text-white font-mono">${(state.userShares * state.sharePrice).toFixed(2)}</div>
                 </div>
              </div>
           </div>

           {/* Transactions */}
           <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-hidden flex flex-col">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Transactions</h3>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                 {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs italic">No transactions yet</div>
                 ) : (
                    transactions.slice().reverse().map(tx => (
                       <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-gray-950/50 border border-gray-800/50">
                          <div className="flex items-center gap-3">
                             <div className={`p-1.5 rounded-full ${tx.type === 'DEPOSIT' ? 'bg-green-500/10 text-green-500' : tx.type === 'WITHDRAW' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {tx.type === 'DEPOSIT' ? <ArrowDown className="w-3 h-3" /> : tx.type === 'WITHDRAW' ? <ArrowUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                             </div>
                             <div>
                                <div className="text-xs font-bold text-gray-300">{tx.type}</div>
                                <div className="text-[9px] text-gray-500 flex items-center gap-1">
                                   <Clock className="w-2.5 h-2.5" />
                                   {tx.timestamp.toLocaleTimeString()}
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-bold text-white font-mono">
                                {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amount.toFixed(2)} USDC
                             </div>
                             {tx.type !== 'YIELD' && (
                                <div className="text-[9px] text-gray-500 font-mono">
                                    {tx.shares.toFixed(4)} Shares
                                </div>
                             )}
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
