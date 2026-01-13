
import React, { useState, useMemo } from 'react';
import { ActivePosition, PositionHistory, WalletInfo, MarketInsight, OpenOrder } from '../types';
import { TrendingUp, History, Target, Globe, Sigma, Wallet, FileText, BrainCircuit, Sparkles, Loader2, RefreshCw, List, Clock, AlertTriangle, LayoutTemplate, Database, WifiOff } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  positions: ActivePosition[];
  history: PositionHistory[]; 
  openOrders?: OpenOrder[]; 
  simulationMode: boolean;
  targetWallet: string;
  walletInfo: WalletInfo | null;
  insight: MarketInsight | null;
  isAnalyzing: boolean;
  isLoading?: boolean;
  fetchError?: boolean;
  onRefresh?: () => void;
  onSimulateData?: () => void; // New prop for manual demo data
}

export const StatsCard: React.FC<Props> = ({ positions, history, openOrders = [], simulationMode, targetWallet, walletInfo, insight, isAnalyzing, isLoading = false, fetchError = false, onRefresh, onSimulateData }) => {
  const [view, setView] = useState<'active' | 'history' | 'orders' | 'raw'>('active');
  
  // Use passed history directly
  const historyData = history;
  
  // --- QUANTITATIVE STRATEGY ENGINE (FALLBACK MATH) ---
  const metrics = useMemo(() => {
     if (historyData.length === 0) return null;

     const wins = historyData.filter(h => h.pnl > 0).length;
     const total = historyData.length;
     const winRate = (wins / total) * 100;
     const avgPnl = historyData.reduce((acc, h) => acc + h.pnl, 0) / total;
     
     return { winRate, avgPnl };
  }, [historyData]);

  // Calculate Total Active Value (Approximate based on current price)
  const totalActiveValue = positions.reduce((acc, curr) => acc + (curr.amount * (curr.currentPrice / 100)), 0);
  const totalHistoryPnL = historyData.reduce((acc, curr) => acc + curr.pnl, 0);

  const chartData = useMemo(() => {
    return historyData.slice(0, 100).reverse().map((h, i) => ({
      name: i + 1, 
      pnl: h.pnl,
      market: h.market,
      outcome: h.outcome,
      date: h.date
    }));
  }, [historyData]);

  // Find USDC balance - Prioritize Bridged USDC.e which is used on Polymarket
  const usdcToken = walletInfo?.tokens.find(t => t.symbol === 'USDC.e') || walletInfo?.tokens.find(t => t.symbol.includes('USDC'));
  const usdcBalance = usdcToken?.balance || "0.00";
  const usdcSymbol = usdcToken?.symbol || "USDC";

  return (
    <div className="h-full flex flex-col gap-4">
      
      {/* Wallet Balance Card - High Priority */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
             <Wallet className="w-16 h-16 text-white" />
         </div>
         <div className="relative z-10">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
               Your Wallet Balance
            </h3>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold text-white font-mono">
                 ${usdcBalance}
               </span>
               <span className="text-xs text-gray-500 font-bold">{usdcSymbol}</span>
            </div>
            {walletInfo ? (
               <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-950 rounded border border-gray-700">
                     <span className="text-[10px] text-gray-300 font-mono">
                        Native: {walletInfo.nativeBalance} {walletInfo.nativeSymbol}
                     </span>
                  </div>
               </div>
            ) : (
               <div className="mt-2 text-[10px] text-yellow-500 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-900/20 inline-block">
                  ⚠ No private key connected
               </div>
            )}
         </div>
      </div>

      {/* Target Info Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between shadow-sm relative overflow-hidden group">
         <div className="flex flex-col z-10 w-full">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
               <Target className="w-3 h-3 text-poly-accent" />
               Target Master
            </span>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-200 font-medium" title={targetWallet}>
                  {targetWallet ? `${targetWallet.slice(0, 6)}...${targetWallet.slice(-6)}` : 'Not Set'}
                </span>
                {targetWallet && (
                    <a 
                    href={`https://predictfolio.com/${targetWallet}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-gray-500 hover:text-poly-accent transition-colors flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded text-[10px]"
                    >
                    <Globe className="w-2.5 h-2.5" /> Verify
                    </a>
                )}
              </div>
              {onRefresh && (
                  <button 
                    onClick={onRefresh}
                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-colors"
                    title="Refresh Data"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
              )}
            </div>
         </div>
      </div>

      {/* AI STRATEGY ANALYSIS */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
         {insight && (
            <div className="absolute top-0 right-0 p-2 opacity-10">
               <BrainCircuit className="w-12 h-12 text-poly-accent" />
            </div>
         )}
         <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">
            <Sparkles className="w-3 h-3 text-poly-accent" /> AI Strategy Analysis
         </div>
         
         {isAnalyzing ? (
             <div className="flex flex-col items-center justify-center py-6 gap-2">
                 <Loader2 className="w-5 h-5 text-poly-accent animate-spin" />
                 <span className="text-[10px] text-gray-500">Processing trade patterns...</span>
             </div>
         ) : insight ? (
            <div className="space-y-2 relative z-10">
               {/* Strategy Badge */}
               <div className="flex items-center justify-between text-xs bg-gray-950 p-2 rounded border border-gray-800">
                  <span className="text-gray-400">Strategy</span>
                  <span className="font-bold text-gray-200 font-mono bg-gray-800 px-2 py-0.5 rounded text-[10px]">
                    {insight.strategyGuess}
                  </span>
               </div>
               
               {/* Risk Meter */}
               <div className="flex items-center justify-between text-xs bg-gray-950 p-2 rounded border border-gray-800">
                  <span className="text-gray-400">Risk Profile</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${insight.riskLevel === 'HIGH' ? 'bg-red-900/30 text-red-500' : insight.riskLevel === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>
                    {insight.riskLevel}
                  </span>
               </div>

               {/* AI Summary */}
               <div className="text-[10px] text-gray-400 leading-relaxed bg-gray-950/50 p-2 rounded border border-gray-800/50 italic">
                  "{insight.summary}"
               </div>
            </div>
         ) : (
            <div className="text-center py-4 text-gray-600 text-[10px]">
               {metrics ? "Waiting for AI analysis..." : "No history data for analysis."}
            </div>
         )}
      </div>

      {/* Portfolio Section */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-3 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('active')}
              className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${view === 'active' ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${view === 'active' ? 'text-poly-accent' : ''}`} />
              Active
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono transition-colors ${view === 'active' ? 'bg-poly-accent/20 text-poly-accent' : 'bg-gray-800 text-gray-500'}`}>
                {positions.length}
              </span>
            </button>
            <div className="w-[1px] h-3 bg-gray-700"></div>
            <button 
              onClick={() => setView('orders')}
              className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${view === 'orders' ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <List className={`w-3.5 h-3.5 ${view === 'orders' ? 'text-orange-400' : ''}`} />
              Orders
              {openOrders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded-full text-[9px] font-mono">
                  {openOrders.length}
                </span>
              )}
            </button>
            <div className="w-[1px] h-3 bg-gray-700"></div>
            <button 
              onClick={() => setView('history')}
              className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${view === 'history' ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <History className={`w-3.5 h-3.5 ${view === 'history' ? 'text-purple-400' : ''}`} />
              History
            </button>
            <div className="w-[1px] h-3 bg-gray-700"></div>
            <button 
              onClick={() => setView('raw')}
              className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${view === 'raw' ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Database className={`w-3.5 h-3.5 ${view === 'raw' ? 'text-cyan-400' : ''}`} />
              Raw
            </button>
          </div>
          
          <span className={`text-xs font-mono font-bold ${view === 'active' ? 'text-blue-400' : (totalHistoryPnL >= 0 ? 'text-green-400' : 'text-red-400')}`}>
            {view === 'active' ? `$${totalActiveValue.toFixed(2)}` : `${totalHistoryPnL >= 0 ? '+' : ''}${totalHistoryPnL.toFixed(2)}`}
          </span>
        </div>
        
        {view === 'history' && chartData.length > 0 && (
          <div className="h-28 w-full bg-gray-900/50 border-b border-gray-800 p-2 relative shrink-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        )}
        
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
          {isLoading && positions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 gap-2">
                 <Loader2 className="w-5 h-5 text-poly-accent animate-spin" />
                 <span className="text-[10px] text-gray-500">Syncing with Subgraph...</span>
             </div>
          ) : view === 'active' && positions.length === 0 ? (
               // Explicitly handle empty active positions (fallback for Error state included)
               <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-3">
                   {fetchError ? (
                       <>
                           <WifiOff className="w-8 h-8 text-red-500 opacity-50" />
                           <div className="text-center">
                               <p className="text-sm font-medium text-red-400">Sync Error</p>
                               <p className="text-[10px] max-w-[200px] mb-3">Could not fetch data from Polymarket APIs. Rate limited or blocked.</p>
                               {onRefresh && (
                                   <button 
                                     onClick={onRefresh}
                                     className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 flex items-center gap-2 mx-auto transition-colors"
                                   >
                                      <RefreshCw className="w-3 h-3" /> Retry Connection
                                   </button>
                               )}
                           </div>
                       </>
                   ) : (
                       <>
                           <Globe className="w-8 h-8 text-blue-500 opacity-20" />
                           <div className="text-center">
                               <p className="text-sm font-medium text-gray-400">No Active Positions</p>
                               <p className="text-[10px] text-gray-600 max-w-[200px] mt-1">
                                   Wallet {targetWallet.slice(0,6)}... has no open positions on-chain.
                               </p>
                           </div>
                       </>
                   )}
                   
                   {/* Move Demo Button to bottom, smaller */}
                   {onSimulateData && !fetchError && (
                     <button 
                       onClick={onSimulateData} 
                       className="mt-4 text-[10px] text-gray-600 hover:text-gray-300 flex items-center gap-1 transition-colors"
                     >
                         <LayoutTemplate className="w-3 h-3" /> Load Demo Data
                     </button>
                   )}
               </div>
          ) : view === 'active' && (
             positions.map(pos => {
                const value = pos.amount * (pos.currentPrice / 100);
                const isYes = pos.outcome === 'YES';
                
                return (
                  <div key={pos.id} className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-2.5 hover:bg-gray-800/60 transition-colors animate-in slide-in-from-right-2 fade-in duration-300">
                      <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-gray-200 font-medium truncate w-32" title={pos.market}>
                              {pos.market}
                          </span>
                          <span className="text-xs font-mono font-bold text-gray-200">
                              ${value.toFixed(2)}
                          </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded font-bold tracking-wider ${isYes ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {pos.outcome}
                              </span>
                              <span className="font-mono">{pos.amount.toFixed(1)} Shares</span>
                          </div>
                          <span className="text-gray-400">
                              @ {pos.currentPrice.toFixed(1)}¢
                          </span>
                      </div>
                  </div>
                );
            })
          )}
          
          {view === 'orders' && openOrders.length === 0 && !isLoading && (
              <div className="text-center text-gray-600 text-[10px] mt-10 flex flex-col items-center gap-2">
                 <List className="w-6 h-6 opacity-20" />
                 No open limit orders found.
              </div>
          )}
          
          {view === 'orders' && openOrders.map(order => (
              <div key={order.id} className="bg-gray-800/20 rounded-lg border border-gray-700/30 p-2.5 hover:border-orange-500/30 transition-colors">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-300 font-medium truncate w-32" title={order.market}>
                        Token: {order.market.slice(0,8)}...
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">
                        {order.size.toFixed(0)} Sz
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                     <span className={`px-1.5 py-0.5 rounded font-bold ${order.side === 'BUY' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                        {order.side} {order.outcome}
                     </span>
                     <span>@ {order.price.toFixed(2)}</span>
                  </div>
              </div>
          ))}

          {view === 'history' && historyData.length === 0 && !isLoading && !fetchError && (
              <div className="text-center text-gray-600 text-[10px] mt-10 flex flex-col items-center gap-2">
                 <History className="w-6 h-6 opacity-20" />
                 No trade history found.
              </div>
          )}
          
          {view === 'history' && historyData.slice(0, 50).map(hist => (
              <div key={hist.id} className="bg-gray-800/20 rounded-lg border border-gray-700/30 p-3 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-300 font-medium truncate w-32" title={hist.market}>
                        {hist.market}
                    </span>
                    <span className={`text-xs font-mono font-bold ${hist.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {hist.pnl >= 0 ? '+' : ''}{hist.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                     <span className={hist.outcome === 'YES' ? 'text-green-500/70' : 'text-red-500/70'}>{hist.outcome}</span>
                     <span>{hist.date}</span>
                  </div>
              </div>
          ))}
          
          {/* RAW DATA INSPECTOR */}
          {view === 'raw' && (
              <div className="bg-gray-950 p-2 rounded border border-gray-800 h-full overflow-hidden flex flex-col">
                  <div className="text-[10px] text-gray-500 mb-2 font-mono flex justify-between">
                      <span>DATA INSPECTOR</span>
                      <span>{positions.length + historyData.length + openOrders.length} Objects</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                     <pre className="text-[10px] text-cyan-500 font-mono whitespace-pre-wrap break-all">
{JSON.stringify({ 
  meta: {
      target: targetWallet,
      timestamp: new Date().toISOString()
  },
  positions: positions,
  orders: openOrders,
  recentHistory: historyData.slice(0, 5)
}, null, 2)}
                     </pre>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
