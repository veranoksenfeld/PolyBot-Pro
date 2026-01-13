import React, { useRef, useEffect } from 'react';
import { TradeLog } from '../types';
import { Terminal, ExternalLink, Zap, RefreshCw, AlertTriangle, Loader2, Wifi, WifiOff, Copy, CheckCircle2 } from 'lucide-react';

interface Props {
  logs: TradeLog[];
  status?: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  rpcUrl?: string;
}

export const LiveFeed: React.FC<Props> = ({ logs, status = 'IDLE', rpcUrl }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'SUCCESS': return { color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-900/50', icon: CheckCircle2 };
      case 'ERROR': return { color: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-900/50', icon: AlertTriangle };
      case 'RETRY': return { color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-900/50', icon: RefreshCw };
      case 'FRONTRUN': return { color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-900/50', icon: Zap };
      case 'PENDING': return { color: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-900/50', icon: Loader2 };
      default: return { color: 'text-gray-400', bg: 'bg-gray-900/40', border: 'border-gray-800', icon: Terminal };
    }
  };

  const getStatusDisplay = () => {
      switch(status) {
          case 'CONNECTED': return <span className="flex items-center gap-1 text-green-500"><Wifi className="w-3 h-3" /> Connected</span>;
          case 'CONNECTING': return <span className="flex items-center gap-1 text-yellow-500"><Loader2 className="w-3 h-3 animate-spin" /> Connecting</span>;
          case 'ERROR': return <span className="flex items-center gap-1 text-red-500"><WifiOff className="w-3 h-3" /> Error</span>;
          default: return <span className="text-gray-600">Idle</span>;
      }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] rounded-lg border border-gray-800 overflow-hidden font-mono text-sm shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-500" />
          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Live Activity Feed</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-gray-500 truncate max-w-[150px]" title={rpcUrl}>
             {rpcUrl ? new URL(rpcUrl).hostname : ''}
          </div>
          <div className="pl-3 border-l border-gray-700">
            {getStatusDisplay()}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
            {status === 'CONNECTING' ? (
                <>
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-poly-accent/20 animate-ping absolute"></div>
                        <div className="w-12 h-12 rounded-full bg-poly-accent/10 flex items-center justify-center border border-poly-accent/20 relative z-10">
                            <Loader2 className="w-6 h-6 text-poly-accent animate-spin" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-poly-accent">Connecting to Chain...</span>
                </>
            ) : status === 'ERROR' ? (
                <>
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                         <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-red-500">Connection Failed</span>
                </>
            ) : (
                <>
                    <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
                        <Terminal className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-medium text-gray-500">Engine Ready</p>
                        <p className="text-[10px] text-gray-600">Waiting for signals...</p>
                    </div>
                </>
            )}
          </div>
        ) : (
          logs.map((log) => {
            const style = getLogStyle(log.type);
            const Icon = style.icon;
            
            // Check if this log has trade details
            const hasDetails = log.amount !== undefined || log.outcome !== undefined;

            return (
              <div key={log.id} className="flex gap-3 p-2 rounded-md border border-transparent hover:border-gray-800 hover:bg-gray-900/30 transition-all group">
                
                {/* Left Column: Time & Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 w-14 pt-0.5">
                    <span className="text-gray-600 text-[10px] leading-none">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </span>
                    {log.tokenId && (
                        <button 
                            onClick={() => copyToClipboard(log.tokenId!)}
                            className="text-[9px] text-gray-700 hover:text-poly-accent flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Token ID"
                        >
                            ID <Copy className="w-2 h-2" />
                        </button>
                    )}
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 min-w-0">
                   {/* Badge & Title Line */}
                   <div className="flex items-center gap-2 mb-1.5">
                     <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${style.bg} ${style.border} ${style.color}`}>
                       {Icon && <Icon className={`w-3 h-3 ${log.type === 'PENDING' || log.type === 'RETRY' ? 'animate-spin' : ''}`} />}
                       {log.type}
                     </span>
                     
                     {/* If it's a trade log, show summary inline */}
                     {hasDetails && (
                         <div className="flex items-center gap-2 text-xs">
                            {log.side && (
                                <span className={log.side === 'BUY' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                    {log.side}
                                </span>
                            )}
                            {log.amount && (
                                <span className="text-gray-200">
                                    ${log.amount.toFixed(2)}
                                </span>
                            )}
                            {log.outcome && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${log.outcome === 'YES' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {log.outcome}
                                </span>
                            )}
                         </div>
                     )}
                   </div>

                   {/* Message / Market Name */}
                   <div className="text-gray-400 text-xs leading-relaxed pl-1">
                      {log.asset ? (
                          <span>
                            <span className="text-gray-600 mr-1">Market:</span> 
                            <span className="text-gray-300 hover:text-white transition-colors">{log.asset}</span>
                          </span>
                      ) : (
                          // Attempt to extract market from message if structured logic used quotes
                          hasDetails && log.message.includes('"') ? (
                              <span>
                                <span className="text-gray-600 mr-1">Market:</span> 
                                <span className="text-gray-300 hover:text-white transition-colors">
                                    {log.message.match(/"([^"]+)"/)?.[1] || log.message}
                                </span>
                              </span>
                          ) : (
                              log.message
                          )
                      )}
                   </div>

                   {/* Transaction Hash Link */}
                   {log.hash && (
                     <div className="mt-1.5 pl-1">
                        <a 
                          href={`https://polygonscan.com/tx/${log.hash}`} 
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-poly-accent transition-colors border-b border-transparent hover:border-poly-accent/30 pb-0.5"
                        >
                           {log.hash.slice(0, 10)}...{log.hash.slice(-4)} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                     </div>
                   )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};