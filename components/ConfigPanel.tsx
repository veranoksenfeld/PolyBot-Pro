import React, { useState, useEffect } from 'react';
import { Settings, Wallet, DollarSign, Activity, Zap, Server, Gauge, Layers, CheckCircle2, Loader2, Globe, XCircle, ExternalLink, Key, Eye, EyeOff, AlertTriangle, CreditCard, RefreshCw, Ban, ShieldAlert, Flame, Network } from 'lucide-react';
import { TradeConfig, WalletInfo } from '../types';
import { validateRpcConnection, fetchWalletInfo } from '../services/walletService';

interface Props {
  config: TradeConfig;
  setConfig: (c: TradeConfig) => void;
  isRunning: boolean;
  onToggle: () => void;
  walletInfo: WalletInfo | null;
}

export const ConfigPanel: React.FC<Props> = ({ config, setConfig, isRunning, onToggle, walletInfo }) => {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ADVANCED'>('GENERAL');
  
  // RPC Status State
  const [rpcStatus, setRpcStatus] = useState<'IDLE' | 'CHECKING' | 'VALID' | 'INVALID'>('IDLE');
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [rpcChainId, setRpcChainId] = useState<number | null>(null);

  // Target Balance State
  const [targetBalances, setTargetBalances] = useState<{native: string, symbol: string, usdc: string, usdcSymbol: string} | null>(null);
  const [isFetchingTarget, setIsFetchingTarget] = useState(false);
  const [targetFetchError, setTargetFetchError] = useState(false);
  
  const handleChange = (field: keyof TradeConfig, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  // Relaxed validation: Allow any string > 2 chars to support slugs/names
  const isTargetValid = config.targetWallet && config.targetWallet.length > 2;

  // Private Key Validation
  const validatePrivateKey = (key: string) => {
    if (!key) return false;
    // Checks for 64 hex characters, with optional 0x prefix
    return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
  };

  const isPrivateKeyValid = validatePrivateKey(config.privateKey);
  const showPrivateKeyError = config.privateKey.length > 0 && !isPrivateKeyValid;
  
  // Disable start if using Private Key mode, Simulation is OFF, and Key is Invalid
  const isStartDisabled = !isRunning && !config.simulationMode && config.executionMethod === 'PRIVATE_KEY' && !isPrivateKeyValid;

  // RPC Connection Validator Effect
  useEffect(() => {
    const checkRpc = async () => {
        if (!config.rpcUrl) {
            setRpcStatus('IDLE');
            setRpcError(null);
            return;
        }

        setRpcStatus('CHECKING');
        setRpcError(null);

        const result = await validateRpcConnection(config.rpcUrl);
        
        if (result.success) {
            setRpcStatus('VALID');
            setRpcChainId(result.chainId || null);
            setRpcError(null);
        } else {
            setRpcStatus('INVALID');
            setRpcChainId(null);
            setRpcError(result.error || "Connection Failed");
        }
    };

    const debounce = setTimeout(checkRpc, 800);
    return () => clearTimeout(debounce);
  }, [config.rpcUrl]);

  // Target Wallet Balance Fetcher
  useEffect(() => {
    // Only fetch balances if it LOOKS like a real address (42 chars), otherwise skip balance check
    if (!config.targetWallet || config.targetWallet.length !== 42 || !config.targetWallet.startsWith('0x')) {
        setTargetBalances(null);
        setTargetFetchError(false);
        return;
    }

    const fetchTarget = async () => {
        setIsFetchingTarget(true);
        setTargetFetchError(false);
        try {
            const info = await fetchWalletInfo(config.rpcUrl, config.targetWallet);
            if (info) {
                 // Polymarket logic: Prioritize Bridged USDC (USDC.e) over Native USDC
                 const usdcBridged = info.tokens.find(t => t.symbol === 'USDC.e');
                 const usdcNative = info.tokens.find(t => t.symbol === 'USDC');
                 
                 // Use Bridged if available and has balance, otherwise fallback to Native
                 const preferredToken = usdcBridged || usdcNative;

                 setTargetBalances({
                     native: info.nativeBalance,
                     symbol: info.nativeSymbol,
                     usdc: preferredToken ? preferredToken.balance : 'N/A',
                     usdcSymbol: preferredToken ? preferredToken.symbol : 'USDC'
                 });
            } else {
                 setTargetBalances(null);
                 setTargetFetchError(true);
            }
        } catch (e) {
             console.error(e);
             setTargetBalances(null);
             setTargetFetchError(true);
        } finally {
            setIsFetchingTarget(false);
        }
    };

    const debounce = setTimeout(fetchTarget, 1000);
    return () => clearTimeout(debounce);
  }, [config.targetWallet, config.rpcUrl]);

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-poly-accent" /> Config
            </h2>
            <div className="flex bg-gray-950 rounded p-0.5 border border-gray-800">
                <button 
                  onClick={() => setActiveTab('GENERAL')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${activeTab === 'GENERAL' ? 'bg-gray-800 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  MAIN
                </button>
                <button 
                  onClick={() => setActiveTab('ADVANCED')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${activeTab === 'ADVANCED' ? 'bg-gray-800 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  TOOLS
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {activeTab === 'GENERAL' ? (
                <>
                {/* TARGET WALLET SECTION */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Wallet</label>
                        {isFetchingTarget && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                    </div>
                    <div className="space-y-2">
                        <input 
                            type="text" 
                            value={config.targetWallet}
                            onChange={(e) => handleChange('targetWallet', e.target.value)}
                            placeholder="Address (0x...) or Username" 
                            className={`w-full bg-gray-950 border text-xs p-2.5 rounded font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-poly-accent ${isTargetValid ? 'border-green-900 focus:border-green-500 text-green-400' : 'border-gray-800 text-gray-300 focus:border-gray-600'}`}
                        />
                        
                        {/* Dynamic Balance Display */}
                        {isTargetValid && targetBalances && (
                            <div className="text-[10px] bg-gray-950 border border-gray-800 rounded p-2 flex items-center justify-between min-h-[30px] animate-in fade-in">
                               {isFetchingTarget ? (
                                   <span className="text-gray-500 flex items-center gap-2"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Fetching assets...</span>
                               ) : targetFetchError ? (
                                   <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed to load balances</span>
                               ) : (
                                   <>
                                       <span className="text-gray-400 flex items-center gap-1">
                                           <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                           {targetBalances.native} {targetBalances.symbol}
                                       </span>
                                       <span className="text-gray-200 font-mono font-bold flex items-center gap-1">
                                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                           ${targetBalances.usdc} {targetBalances.usdcSymbol}
                                       </span>
                                   </>
                               )}
                            </div>
                        )}
                    </div>
                </section>

                {/* EXECUTION METHOD */}
                <section className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Execution Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => handleChange('executionMethod', 'PRIVATE_KEY')}
                            className={`p-2 rounded border text-xs font-medium transition-all ${config.executionMethod === 'PRIVATE_KEY' ? 'bg-poly-accent/10 border-poly-accent text-poly-accent' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                        >
                            Private Key
                        </button>
                        <button 
                            onClick={() => handleChange('executionMethod', 'POLYMARKET_API')}
                            className={`p-2 rounded border text-xs font-medium transition-all ${config.executionMethod === 'POLYMARKET_API' ? 'bg-poly-accent/10 border-poly-accent text-poly-accent' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                        >
                            CLOB API
                        </button>
                    </div>
                    
                    {config.executionMethod === 'PRIVATE_KEY' && (
                        <div className="relative group animate-in fade-in slide-in-from-top-1 duration-200">
                            <input 
                                type={showPrivateKey ? "text" : "password"}
                                value={config.privateKey}
                                onChange={(e) => handleChange('privateKey', e.target.value)}
                                placeholder="Your Wallet Private Key (for execution)"
                                className={`w-full bg-gray-950 border text-xs p-2.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-poly-accent ${
                                    isPrivateKeyValid 
                                        ? 'border-green-900 focus:border-green-500 text-green-400' 
                                        : showPrivateKeyError 
                                            ? 'border-red-900 focus:border-red-500 text-red-400' 
                                            : 'border-gray-800 text-gray-300'
                                }`}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                            >
                                {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            
                            {/* Validation Error Message */}
                            {showPrivateKeyError && (
                                <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Invalid Private Key format (must be 64 hex characters)</span>
                                </div>
                            )}
                            
                            <div className="mt-1 text-[10px] text-gray-500">
                            Executes trades via direct smart contract interaction.
                            </div>
                        </div>
                    )}

                    {config.executionMethod === 'POLYMARKET_API' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                                <input 
                                    type="text"
                                    value={config.polymarketApiKey || ''}
                                    onChange={(e) => handleChange('polymarketApiKey', e.target.value)}
                                    placeholder="Polymarket API Key"
                                    className="w-full bg-gray-950 border border-gray-800 text-xs p-2.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-poly-accent text-gray-300 mb-2"
                                />
                                <div className="relative">
                                    <input 
                                        type={showApiSecret ? "text" : "password"}
                                        value={config.polymarketApiSecret || ''}
                                        onChange={(e) => handleChange('polymarketApiSecret', e.target.value)}
                                        placeholder="API Secret"
                                        className="w-full bg-gray-950 border border-gray-800 text-xs p-2.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-poly-accent text-gray-300 mb-2"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowApiSecret(!showApiSecret)}
                                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                                    >
                                        {showApiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <input 
                                    type="password"
                                    value={config.polymarketApiPassphrase || ''}
                                    onChange={(e) => handleChange('polymarketApiPassphrase', e.target.value)}
                                    placeholder="Passphrase"
                                    className="w-full bg-gray-950 border border-gray-800 text-xs p-2.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-poly-accent text-gray-300"
                                />
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-start gap-1.5 p-1.5 bg-blue-900/10 border border-blue-900/30 rounded">
                                <Key className="w-3 h-3 text-blue-400 mt-0.5" />
                                <span>CLOB Credentials required for high-frequency trading via the Order Book.</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* NETWORK & RPC */}
                <section className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Server className="w-3 h-3" /> RPC Connection
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={config.rpcUrl}
                            onChange={(e) => handleChange('rpcUrl', e.target.value)}
                            className={`w-full bg-gray-950 border text-xs p-2.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-poly-accent ${rpcStatus === 'VALID' ? 'border-green-900 text-green-400' : rpcStatus === 'INVALID' ? 'border-red-900 text-red-400' : 'border-gray-800 text-gray-300'}`}
                        />
                        <div className="absolute right-2 top-2.5">
                            {rpcStatus === 'CHECKING' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
                            {rpcStatus === 'VALID' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                            {rpcStatus === 'INVALID' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                    </div>
                    {rpcStatus === 'VALID' && rpcChainId && (
                         <div className="text-[10px] text-green-500/80 px-1 animate-in slide-in-from-top-1">
                            Chain ID: {rpcChainId} • Connected
                         </div>
                    )}
                    {rpcStatus === 'INVALID' && rpcError && (
                         <div className="text-[10px] text-red-500/80 px-1 animate-in slide-in-from-top-1">
                            Error: {rpcError}
                         </div>
                    )}
                </section>

                {/* PARAMETERS */}
                <section className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Gauge className="w-3 h-3" /> Trading Params
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Max Bet (USDC)</span>
                            <div className="relative">
                                <DollarSign className="w-3 h-3 text-gray-500 absolute left-2 top-2" />
                                <input 
                                    type="number" 
                                    value={config.maxBetAmount}
                                    onChange={(e) => handleChange('maxBetAmount', parseFloat(e.target.value))}
                                    className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-1.5 pl-6 rounded focus:border-poly-accent focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Min Order ($)</span>
                            <div className="relative">
                                <DollarSign className="w-3 h-3 text-gray-500 absolute left-2 top-2" />
                                <input 
                                    type="number" 
                                    value={config.minOrderAmount}
                                    onChange={(e) => handleChange('minOrderAmount', parseFloat(e.target.value))}
                                    className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-1.5 pl-6 rounded focus:border-poly-accent focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Multiplier</span>
                            <input 
                                type="number" 
                                step="0.1"
                                value={config.copyMultiplier}
                                onChange={(e) => handleChange('copyMultiplier', parseFloat(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-1.5 rounded focus:border-poly-accent focus:outline-none"
                            />
                        </div>
                    </div>
                </section>
                </>
            ) : (
                <>
                {/* GAS MANAGEMENT */}
                <section className="space-y-3">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Flame className="w-3 h-3 text-orange-500" /> Gas Management
                    </label>
                    
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            {['STANDARD', 'FAST', 'INSTANT', 'CUSTOM'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleChange('gasPriority', mode)}
                                    className={`text-[10px] py-2 px-1 rounded border font-medium transition-all ${config.gasPriority === mode 
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        
                        {config.gasPriority === 'CUSTOM' && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Max Priority Fee (Gwei)</span>
                                </div>
                                <input 
                                    type="number" 
                                    value={config.customGasGwei}
                                    onChange={(e) => handleChange('customGasGwei', parseFloat(e.target.value))}
                                    className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-2 rounded focus:border-orange-500 focus:outline-none font-mono"
                                    placeholder="50"
                                />
                            </div>
                        )}
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                             <Activity className="w-3 h-3" />
                             Current Base Fee: <span className="text-gray-300 font-mono">~35 Gwei</span>
                        </div>
                    </div>
                </section>

                {/* RISK CONTROLS */}
                <section className="space-y-3">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3 text-red-400" /> Risk Controls
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Stop Loss (%)</span>
                             <input 
                                type="number" 
                                value={config.stopLossPercentage}
                                onChange={(e) => handleChange('stopLossPercentage', parseFloat(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-2 rounded focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Slippage (%)</span>
                             <input 
                                type="number" 
                                value={config.slippage}
                                onChange={(e) => handleChange('slippage', parseFloat(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-2 rounded focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* SYSTEM SETTINGS */}
                <section className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Network className="w-3 h-3 text-blue-400" /> Engine Settings
                    </label>
                    
                    <div className="space-y-2">
                        <span className="text-[10px] text-gray-500 block">Monitoring Mode</span>
                        <select 
                            value={config.monitoringMode}
                            onChange={(e) => handleChange('monitoringMode', e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs p-2 rounded focus:border-blue-500 focus:outline-none"
                        >
                            <option value="HYBRID">Hybrid (Mempool + Polling)</option>
                            <option value="MEMPOOL">Mempool Only (Fastest)</option>
                            <option value="POLLING">Polling Only (Stable)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-800">
                        <span className="text-[10px] text-gray-400">Retry Attempts</span>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handleChange('retryAttempts', Math.max(0, config.retryAttempts - 1))}
                                className="w-5 h-5 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-gray-400"
                             >-</button>
                             <span className="text-xs font-mono w-4 text-center">{config.retryAttempts}</span>
                             <button 
                                onClick={() => handleChange('retryAttempts', config.retryAttempts + 1)}
                                className="w-5 h-5 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-gray-400"
                             >+</button>
                        </div>
                    </div>
                </section>
                </>
            )}
            
            {/* COMMON SETTINGS (Like Simulation) */}
            <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between p-2 bg-gray-950 rounded border border-gray-800">
                    <span className="text-xs text-gray-400">Simulation Mode</span>
                    <button 
                        onClick={() => handleChange('simulationMode', !config.simulationMode)}
                        className={`w-9 h-5 rounded-full relative transition-colors ${config.simulationMode ? 'bg-poly-accent' : 'bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.simulationMode ? 'left-5' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 mt-auto">
            <button
                onClick={onToggle}
                disabled={isStartDisabled}
                className={`w-full py-3 rounded font-bold text-sm tracking-wide shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                    isRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                    : isStartDisabled
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-70'
                        : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'
                }`}
            >
                {isRunning ? (
                    <>
                     <Activity className="w-4 h-4 animate-pulse" /> STOP ENGINE
                    </>
                ) : (
                    <>
                     {isStartDisabled ? <Ban className="w-4 h-4" /> : <Zap className="w-4 h-4" />} START ENGINE
                    </>
                )}
            </button>
        </div>
    </div>
  );
};