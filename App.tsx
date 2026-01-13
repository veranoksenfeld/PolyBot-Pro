
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/Layout';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveFeed } from './components/LiveFeed';
import { StatsCard } from './components/StatsCard';
import { RepositoryInput } from './components/RepositoryInput';
import { FileExplorer } from './components/FileExplorer';
import { CodeAnalysis } from './components/CodeAnalysis';
import { VaultDashboard } from './components/VaultDashboard';
import { TradeConfig, TradeLog, ActivePosition, PositionHistory, WalletInfo, MarketInsight, OpenOrder, RepoNode, VaultState, VaultTransaction } from './types';
import { generateEngineLogs } from './services/simulationService';
import { scanMempool } from './services/mempoolService';
import { executeTrade } from './services/executionService';
import { fetchTradeHistory, fetchActivePositions, pollRecentTrades, resolveTargetWallet, fetchOpenOrders } from './services/polymarketService';
import { fetchWalletInfo } from './services/walletService';
import { analyzeStrategy } from './services/geminiService';
import { fetchRepoContents, fetchFileContent } from './services/githubService';
import { INITIAL_VAULT_STATE, calculateNewYield, simulateDeposit, simulateWithdraw } from './services/vaultService';
import { Zap, Activity, Cpu, ShieldCheck, LayoutDashboard, FolderOpen, ChevronLeft, AlertCircle, Lock } from 'lucide-react';
import { RPC_URL_FALLBACK } from './utils/constants';
import { ethers } from 'ethers';

const DEFAULT_CONFIG: TradeConfig = {
  targetWallet: '0x63ce342161250d705dc0b16df89036c8e5f9ba9a', 
  executionMethod: 'PRIVATE_KEY',
  privateKey: '', // SECURITY FIX: Removed hardcoded private key
  maxBetAmount: 100,
  minOrderAmount: 5, 
  stopLossPercentage: 15,
  isEnabled: false,
  simulationMode: false, 
  rpcUrl: RPC_URL_FALLBACK,
  monitoringMode: 'POLLING', // Default to Polling for better stability
  gasPriority: 'FAST',
  customGasGwei: 30,
  copyMultiplier: 1.0,
  retryAttempts: 3,
  slippage: 1.0
};

type ViewMode = 'TRADER' | 'AUDITOR' | 'VAULT';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<ViewMode>('TRADER');

  // Trading State
  const [config, setConfig] = useState<TradeConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [history, setHistory] = useState<PositionHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false); 
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  
  // Vault State
  const [vaultState, setVaultState] = useState<VaultState>(INITIAL_VAULT_STATE);
  const [vaultTransactions, setVaultTransactions] = useState<VaultTransaction[]>([]);

  // Demo Data State
  const [isDemoData, setIsDemoData] = useState(false);
  
  // Resolved Address State (for when users type "0x8dxd" or "slug")
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  
  // AI Insight State
  const [marketInsight, setMarketInsight] = useState<MarketInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Auditor State
  const [repoUrl, setRepoUrl] = useState('https://github.com/ApeMoonSpin/polymarket-copy-trading-bot-v1');
  const [repoNodes, setRepoNodes] = useState<RepoNode[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<RepoNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  
  // Refs
  const timerRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);
  const lastStatusRef = useRef<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const errorCountRef = useRef(0);
  
  // Polling Logic Refs
  const lastPollTimeRef = useRef<number>(Math.floor(Date.now() / 1000));
  const processedTxHashes = useRef<Set<string>>(new Set());
  const lastHeartbeatRef = useRef<number>(0);
  
  // Logging Prevention Refs
  const hasLoggedExtraction = useRef<string | null>(null);
  const hasLoggedResolution = useRef<string | null>(null);

  // --- WALLET FETCHING LOGIC ---
  useEffect(() => {
    const loadWallet = async () => {
      // LIVE MODE - PRIVATE KEY
      if (config.executionMethod === 'PRIVATE_KEY' && config.privateKey && config.privateKey.length >= 64) {
        try {
          const pk = config.privateKey.startsWith('0x') ? config.privateKey : `0x${config.privateKey}`;
          const wallet = new ethers.Wallet(pk);
          const info = await fetchWalletInfo(config.rpcUrl, wallet.address);
          setWalletInfo(info);
        } catch (e) {
          console.error("Failed to load wallet", e);
          setWalletInfo(null);
        }
      } else {
        setWalletInfo(null);
      }
    };

    const debounce = setTimeout(loadWallet, 800);
    return () => clearTimeout(debounce);
  }, [config.executionMethod, config.privateKey, config.rpcUrl]);

  // Helper to add log
  const addLog = useCallback((type: TradeLog['type'], message: string) => {
    const log: TradeLog = {
      id: Math.random().toString(),
      timestamp: new Date(),
      type,
      message
    };
    setLogs(prev => [...prev, log]);
  }, []);

  // --- VAULT LOGIC HANDLERS ---
  const handleDeposit = (amount: number) => {
    try {
      const { newState, tx } = simulateDeposit(vaultState, amount);
      setVaultState(newState);
      setVaultTransactions(prev => [...prev, tx]);
      addLog('SUCCESS', `Vault Deposit: $${amount.toFixed(2)} USDC`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleWithdraw = (shares: number) => {
    try {
      const { newState, tx } = simulateWithdraw(vaultState, shares);
      setVaultState(newState);
      setVaultTransactions(prev => [...prev, tx]);
      addLog('SUCCESS', `Vault Withdraw: ${shares.toFixed(4)} Shares burned`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // --- TRADING LOGIC & AI ANALYSIS ---
  const loadHistory = useCallback(async () => {
    // If we are in demo mode, don't overwrite with empty live data unless user changed wallet
    if (isDemoData) return;

    const inputWallet = config.targetWallet;
    if (!inputWallet || inputWallet.length < 3) return;

    let targetAddress = inputWallet;

    // Attempt Resolution (Handles both Slugs and Addresses -> Proxy)
    try {
        const resolved = await resolveTargetWallet(inputWallet);
        if (resolved) {
            targetAddress = resolved;
            setResolvedAddress(resolved);
            
            const resKey = `res-${inputWallet}-${resolved}`;
            if (hasLoggedResolution.current !== resKey) {
                if (ethers.isAddress(inputWallet) && resolved.toLowerCase() !== inputWallet.toLowerCase()) {
                     addLog('INFO', `Resolved EOA ${inputWallet.slice(0,6)} to Proxy ${resolved.slice(0,6)}`);
                } else if (!ethers.isAddress(inputWallet)) {
                     addLog('INFO', `Resolved user "${inputWallet}" to ${resolved.slice(0,6)}...`);
                }
                hasLoggedResolution.current = resKey;
            }
        }
    } catch(e) {
        if (!ethers.isAddress(inputWallet)) return;
    }

    if (targetAddress) {
      setIsHistoryLoading(true);
      setFetchError(false);
      
      try {
        console.log(`Fetching data for ${targetAddress}...`);
        const results = await Promise.allSettled([
            fetchTradeHistory(targetAddress),
            fetchActivePositions(targetAddress, inputWallet),
            fetchOpenOrders(targetAddress, inputWallet)
        ]);
        
        const historyData = results[0].status === 'fulfilled' ? results[0].value : [];
        const activeData = results[1].status === 'fulfilled' ? results[1].value : null;
        const openOrdersData = results[2].status === 'fulfilled' ? results[2].value : [];
        
        if (results[1].status === 'rejected' || activeData === null) {
             console.error("Positions Fetch Failed completely.");
             setFetchError(true);
             setPositions([]);
             addLog('ERROR', 'Failed to extract positions. API/Proxy issue.');
        } else {
             setPositions(activeData);
             
             // Log extraction success with details
             const logKey = `ext-${targetAddress}-${activeData.length}`;
             if (hasLoggedExtraction.current !== logKey) {
                 if (activeData.length > 0) {
                     // Create a nice summary string of top assets
                     const topMarkets = activeData.slice(0, 2).map(p => `"${p.market.slice(0, 15)}..."`).join(', ');
                     addLog('SUCCESS', `Fetched: ${topMarkets}${activeData.length > 2 ? ` +${activeData.length - 2} more` : ''}`);
                 } else {
                     addLog('INFO', `Scan complete. No active positions found.`);
                 }
                 hasLoggedExtraction.current = logKey;
             }
        }

        if (results[0].status === 'fulfilled') {
             setHistory(historyData);
        }
        
        if (results[2].status === 'fulfilled') {
             setOpenOrders(openOrdersData);
        }

        if (historyData.length > 0) {
            setIsAnalyzing(true);
            analyzeStrategy(historyData, targetAddress)
            .then(res => setMarketInsight(res))
            .catch(err => console.error(err))
            .finally(() => setIsAnalyzing(false));
        } else {
            setMarketInsight(null);
        }

      } catch (e) {
        console.error("Failed to fetch wallet data", e);
        addLog('ERROR', 'Critical Failure in Data Sync.');
        setFetchError(true);
      } finally {
        setIsHistoryLoading(false);
      }
    }
  }, [config.targetWallet, addLog, isDemoData]);

  // Reset demo mode if wallet changes
  useEffect(() => {
      setIsDemoData(false);
  }, [config.targetWallet]);

  // Debounced load on config change
  useEffect(() => {
    const debounce = setTimeout(loadHistory, 1500); 
    return () => clearTimeout(debounce);
  }, [loadHistory]);

  // Force load on initial mount
  useEffect(() => {
     loadHistory();
  }, []);

  const handleSimulateData = () => {
      setIsDemoData(true);
      setFetchError(false);
      
      // Mock Positions
      const mockPositions: ActivePosition[] = [
          {
             id: 'sim-1',
             market: 'Trump vs Biden 2024 Election Winner',
             outcome: 'YES',
             entryPrice: 48.2,
             currentPrice: 52.5,
             amount: 1500,
             pnl: 64.5,
             change24h: 4.3,
             volume: '12M'
          },
          {
             id: 'sim-2',
             market: 'Bitcoin > $100k by Q4 2024',
             outcome: 'NO',
             entryPrice: 65.0,
             currentPrice: 42.0,
             amount: 500,
             pnl: 115.0,
             change24h: -12.0,
             volume: '5M'
          },
          {
             id: 'sim-3',
             market: 'Fed Interest Rate Cut in May',
             outcome: 'YES',
             entryPrice: 22.0,
             currentPrice: 18.5,
             amount: 2000,
             pnl: -70.0,
             change24h: -3.5,
             volume: '2M'
          }
      ];
      setPositions(mockPositions);
      
      // Mock History
      setHistory([
          { id: 'h-1', market: 'Super Bowl LVIII Winner', outcome: 'YES', amount: 500, pnl: 250, date: '2/12/2024', roi: 50 },
          { id: 'h-2', market: 'ETH ETF Approval', outcome: 'YES', amount: 1000, pnl: -1000, date: '1/15/2024', roi: -100 },
          { id: 'h-3', market: 'Oscars: Best Picture', outcome: 'NO', amount: 300, pnl: 45, date: '3/10/2024', roi: 15 }
      ]);
      
      setIsAnalyzing(true);
      setTimeout(() => {
          setMarketInsight({
              summary: "Trader shows high conviction in political events but poor risk management in crypto derivatives. Recent profitability driven by sports betting.",
              riskLevel: "HIGH",
              strategyGuess: "Event-Driven Speculator"
          });
          setIsAnalyzing(false);
      }, 1000);
      
      addLog('INFO', 'Loaded Demo Data for visualization.');
  };

  const createPositionFromLog = (log: TradeLog): ActivePosition => {
    return {
      id: `pos-${log.id}`,
      market: log.asset || 'Detected Market Position',
      outcome: log.outcome || 'YES',
      entryPrice: 0,
      currentPrice: 0,
      amount: log.amount || config.maxBetAmount,
      pnl: 0,
      change24h: 0,
      volume: 'Unknown'
    };
  };

  const toggleBot = () => {
    if (isRunning) {
      setIsRunning(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      isScanningRef.current = false;
      addLog('INFO', 'Bot engine stopped.');
      setConnectionStatus('IDLE');
      lastStatusRef.current = 'IDLE';
    } else {
      if (!config.targetWallet) {
        alert("Configuration Error: Please enter a target wallet address.");
        return;
      }
      
      if (!config.simulationMode && config.executionMethod === 'PRIVATE_KEY' && !config.privateKey) {
          alert("Error: Private Key required for live execution.");
          return;
      }
      
      setIsRunning(true);
      if (!config.simulationMode) {
        setLogs([]);
        setConnectionStatus('CONNECTING');
        lastStatusRef.current = 'CONNECTING';
        errorCountRef.current = 0;
        
        lastPollTimeRef.current = Math.floor(Date.now() / 1000) - 30; 
        processedTxHashes.current.clear();
      }

      addLog('INFO', `Initializing ${config.monitoringMode} engine...`);
      addLog('INFO', `Endpoint: ${config.rpcUrl.slice(0, 25)}...`);
      
      if (config.simulationMode) {
        addLog('INFO', 'Simulation Mode Active: Generating traffic patterns...');
      } else {
        addLog('INFO', 'LIVE MODE: Connecting to CLOB & Mempool...');
      }
      
      const effectiveTarget = resolvedAddress || config.targetWallet;

      timerRef.current = window.setInterval(async () => {
        // --- VAULT SIMULATION HOOK ---
        // Occasionally generate yield for the vault based on trading activity
        if (Math.random() > 0.8) {
           setVaultState(prev => calculateNewYield(prev));
        }

        if (config.simulationMode) {
          const newLogs = generateEngineLogs(config);
          if (newLogs.length > 0) {
            setLogs(prev => [...prev.slice(-150), ...newLogs]); 
            
            const successfulTrades = newLogs.filter(l => l.type === 'SUCCESS');
            if (successfulTrades.length > 0) {
              const newPositions = successfulTrades.map(createPositionFromLog);
              setPositions(prev => [...newPositions, ...prev]);
            }
          }
        } else {
          // LIVE SCANNING LOGIC
          if (isScanningRef.current) return;
          isScanningRef.current = true;
          
          try {
             const signalsToExecute: any[] = [];
             const now = Date.now();
             if (now - lastHeartbeatRef.current > 4000) { 
                 lastHeartbeatRef.current = now;
                 let hbMsg = config.monitoringMode === 'MEMPOOL' 
                    ? `Mempool: Scanning active block candidates...` 
                    : `Polling: Verifying recent on-chain events...`;
                 addLog('INFO', hbMsg);
             }

             if (config.monitoringMode === 'MEMPOOL' || config.monitoringMode === 'HYBRID') {
                 const mempoolLogs = await scanMempool(config.rpcUrl, config.targetWallet);
                 
                 for (const log of mempoolLogs) {
                    if (!processedTxHashes.current.has(log.hash!)) {
                        processedTxHashes.current.add(log.hash!);
                        setLogs(prev => [...prev, log]); 
                        
                        if (log.type === 'PENDING' || log.type === 'BUY') {
                            signalsToExecute.push({ ...log, source: 'Mempool' });
                        }
                    }
                 }
             }

             if (config.monitoringMode === 'POLLING' || config.monitoringMode === 'HYBRID') {
                 const polledTrades = await pollRecentTrades(effectiveTarget, lastPollTimeRef.current);
                 const nowSec = Math.floor(Date.now() / 1000);
                 lastPollTimeRef.current = nowSec;

                 if (polledTrades.length > 0) {
                     for (const trade of polledTrades) {
                         const simpleHash = trade.hash.split('-')[0]; 
                         
                         if (!processedTxHashes.current.has(simpleHash) && !processedTxHashes.current.has(trade.hash)) {
                             processedTxHashes.current.add(trade.hash);
                             processedTxHashes.current.add(simpleHash);
                             
                             const logMsg = `Polling: Found confirmed trade on "${trade.market.slice(0, 20)}..."`;
                             addLog('PENDING', logMsg);

                             signalsToExecute.push({
                                 message: logMsg,
                                 outcome: trade.outcome,
                                 amount: trade.amount,
                                 tokenId: trade.tokenId,
                                 side: trade.side,
                                 source: 'Polling'
                             });
                         }
                     }
                 }
             }
             
             if (lastStatusRef.current !== 'CONNECTED') {
                 addLog('SUCCESS', 'Network Connection Established');
                 setConnectionStatus('CONNECTED');
                 lastStatusRef.current = 'CONNECTED';
                 errorCountRef.current = 0;
             }

             for (const signal of signalsToExecute) {
                  const signalAmount = signal.amount || 0;
                  if (signalAmount < config.minOrderAmount) {
                      addLog('INFO', `FILTER: ${signal.source} signal amount $${signalAmount.toFixed(2)} below min ($${config.minOrderAmount})`);
                      continue;
                  }

                  addLog('FRONTRUN', `${signal.source}: Copying Trade...`);
                  
                  const executionLog = await executeTrade(config, {
                      market: signal.message || "Unknown Market",
                      outcome: signal.outcome || 'YES',
                      amount: signal.amount || 10,
                      tokenId: signal.tokenId,
                      side: signal.side
                  });
                  
                  setLogs(prev => [...prev, executionLog]);

                  if (executionLog.type === 'SUCCESS') {
                      setPositions(prev => [createPositionFromLog(executionLog), ...prev]);
                  }
             }

          } catch (e: any) {
             errorCountRef.current++;
             const errMsg = e.message || "Unknown Error";
             
             if (lastStatusRef.current !== 'ERROR') {
                 addLog('ERROR', `Connection Failed: ${errMsg}`);
                 setConnectionStatus('ERROR');
                 lastStatusRef.current = 'ERROR';
             }
          } finally {
             isScanningRef.current = false;
          }
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- REPO AUDITOR LOGIC ---
  const loadRepoFiles = async (url: string, path: string = '') => {
      setIsRepoLoading(true);
      setRepoError(null);
      try {
          const nodes = await fetchRepoContents(url, path);
          setRepoNodes(nodes);
          setCurrentPath(path);
          if (!path) setSelectedFile(null);
      } catch (e: any) {
          setRepoError(e.message || "Failed to fetch repository");
      } finally {
          setIsRepoLoading(false);
      }
  };

  const handleNodeSelect = async (node: RepoNode) => {
      if (node.type === 'dir') {
          await loadRepoFiles(repoUrl, node.path);
      } else {
          setSelectedFile(node);
          try {
              const content = await fetchFileContent(node.download_url);
              setFileContent(content);
          } catch (e) {
              setFileContent("// Failed to load file content.");
          }
      }
  };

  const handleNavigateUp = () => {
      if (!currentPath) return;
      const parts = currentPath.split('/');
      parts.pop();
      const newPath = parts.join('/');
      loadRepoFiles(repoUrl, newPath);
  };

  useEffect(() => {
      if (activeView === 'AUDITOR' && repoNodes.length === 0 && !isRepoLoading) {
          loadRepoFiles(repoUrl);
      }
  }, [activeView]);


  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* HEADER */}
        <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
           <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
                 <div className="bg-poly p-1 rounded">
                   <Zap className="w-5 h-5 text-white" />
                 </div>
                 PolyBot <span className="text-gray-500 font-mono text-sm font-normal">PRO</span>
              </h1>
              
              <div className="flex bg-gray-950 rounded p-1 border border-gray-800">
                 <button 
                   onClick={() => setActiveView('TRADER')}
                   className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-all ${activeView === 'TRADER' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Trader
                 </button>
                 <button 
                   onClick={() => setActiveView('VAULT')}
                   className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-all ${activeView === 'VAULT' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <Lock className="w-3.5 h-3.5" /> Vault
                 </button>
                 <button 
                   onClick={() => setActiveView('AUDITOR')}
                   className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-all ${activeView === 'AUDITOR' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <ShieldCheck className="w-3.5 h-3.5" /> Auditor
                 </button>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
             {activeView === 'TRADER' && (
               <>
                 <div className="flex items-center gap-2 px-3 py-1 bg-gray-950 rounded border border-gray-800 text-xs text-gray-400">
                    <Cpu className="w-3 h-3" />
                    <span>ENGINE: {config.simulationMode ? 'SIMULATION' : 'ACTIVE'}</span>
                 </div>
                 {isRunning && <span className="flex h-3 w-3 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                 </span>}
                 <div className="text-xs text-gray-500 font-mono bg-gray-950 px-2 py-1 rounded border border-gray-800">
                   {isRunning ? 'STATUS: RUNNING' : 'STATUS: STOPPED'}
                 </div>
               </>
             )}
           </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-hidden relative">
            {activeView === 'TRADER' ? (
                <div className="absolute inset-0 flex z-10">
                  <ConfigPanel 
                    config={config} 
                    setConfig={setConfig} 
                    isRunning={isRunning}
                    onToggle={toggleBot}
                    walletInfo={walletInfo}
                  />
                  <main className="flex-1 flex flex-col min-w-0 bg-gray-950 p-4 gap-4">
                    <div className="flex-1 flex gap-4 min-h-0">
                      <div className="flex-1 min-w-0 flex flex-col">
                        <LiveFeed 
                          logs={logs} 
                          status={connectionStatus} 
                          rpcUrl={config.rpcUrl} 
                        />
                      </div>
                      <div className="w-80 shrink-0 flex flex-col min-h-0">
                        <StatsCard 
                          positions={positions} 
                          openOrders={openOrders}
                          history={history} 
                          simulationMode={config.simulationMode}
                          targetWallet={resolvedAddress || config.targetWallet}
                          walletInfo={walletInfo}
                          insight={marketInsight}
                          isAnalyzing={isAnalyzing}
                          isLoading={isHistoryLoading}
                          fetchError={fetchError}
                          onRefresh={() => { setIsDemoData(false); loadHistory(); }}
                          onSimulateData={handleSimulateData}
                        />
                      </div>
                    </div>
                  </main>
                </div>
            ) : activeView === 'VAULT' ? (
                <VaultDashboard 
                  state={vaultState}
                  transactions={vaultTransactions}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                />
            ) : (
                <div className="absolute inset-0 flex z-10 bg-gray-950 p-4 gap-4">
                   {/* AUDITOR LEFT PANEL */}
                   <div className="w-80 flex flex-col bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shrink-0">
                      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                         <RepositoryInput 
                           initialUrl={repoUrl} 
                           onFetch={(url) => { setRepoUrl(url); loadRepoFiles(url); }} 
                           isLoading={isRepoLoading} 
                         />
                         {repoError && (
                            <div className="mt-2 text-xs text-red-400 flex items-center gap-1 bg-red-950/20 p-2 rounded">
                               <AlertCircle className="w-3 h-3" /> {repoError}
                            </div>
                         )}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-2">
                         {currentPath && (
                             <button 
                               onClick={handleNavigateUp}
                               className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-2 px-2 py-1 rounded hover:bg-gray-800 w-full text-left"
                             >
                                <ChevronLeft className="w-3 h-3" /> Back to parent
                             </button>
                         )}
                         
                         <div className="px-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <FolderOpen className="w-3 h-3" /> Explorer
                         </div>
                         <FileExplorer 
                            nodes={repoNodes} 
                            onSelect={handleNodeSelect} 
                            selectedNode={selectedFile} 
                         />
                      </div>
                   </div>

                   {/* AUDITOR MAIN PANEL */}
                   <div className="flex-1 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
                      {selectedFile ? (
                          <CodeAnalysis 
                            fileName={selectedFile.name} 
                            content={fileContent} 
                            repoUrl={repoUrl}
                          />
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                              <ShieldCheck className="w-16 h-16 opacity-20" />
                              <div className="text-center">
                                  <h3 className="text-lg font-medium text-gray-300">Security Auditor</h3>
                                  <p className="text-sm">Select a file from the explorer to run AI vulnerability analysis.</p>
                              </div>
                          </div>
                      )}
                   </div>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
}
