import React, { useState, useEffect } from 'react';
import { AnalysisStatus, AuditResult } from '../types';
import { analyzeCodeSecurity } from '../services/geminiService';
import { Play, AlertTriangle, CheckCircle, Shield, Bug, RefreshCw, Copy, ExternalLink, Code } from 'lucide-react';
import { VulnerabilityReport } from './VulnerabilityReport';

interface Props {
  fileName: string;
  content: string;
  repoUrl: string;
}

export const CodeAnalysis: React.FC<Props> = ({ fileName, content, repoUrl }) => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'remediation'>('code');

  // Reset state when file changes
  useEffect(() => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setActiveTab('code');
  }, [fileName]);

  const handleAnalyze = async () => {
    if (!content) return;
    setStatus(AnalysisStatus.ANALYZING);
    try {
      const auditResult = await analyzeCodeSecurity(content, fileName);
      setResult(auditResult);
      setStatus(AnalysisStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center space-x-4">
          <span className="font-mono text-sm text-gray-300 font-semibold flex items-center gap-2">
            <Code className="w-4 h-4" />
            {fileName}
          </span>
          <div className="h-4 w-[1px] bg-gray-700"></div>
          <button 
            onClick={() => setActiveTab('code')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${activeTab === 'code' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Source
          </button>
          {result?.remediatedCode && (
             <button 
             onClick={() => setActiveTab('remediation')}
             className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${activeTab === 'remediation' ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-gray-300'}`}
           >
             <Shield className="w-3 h-3" />
             Fix
           </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
           {status === AnalysisStatus.IDLE && (
              <button
                onClick={handleAnalyze}
                className="flex items-center space-x-2 px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded shadow-lg shadow-primary/20 transition-all transform active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Run Audit</span>
              </button>
           )}
           {status === AnalysisStatus.ANALYZING && (
              <div className="flex items-center space-x-2 px-4 py-1.5 bg-gray-800 text-gray-300 text-sm rounded border border-gray-700 cursor-wait">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Auditing...</span>
              </div>
           )}
           {status === AnalysisStatus.COMPLETED && result && (
              <div className="flex items-center space-x-4">
                 <div className={`flex items-center space-x-2 px-3 py-1 rounded border border-gray-800 bg-gray-900 ${result.isScam ? 'border-red-500/50 bg-red-900/10' : ''}`}>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Score</span>
                    <span className={`text-lg font-bold ${getStatusColor(result.score)}`}>{result.score}</span>
                 </div>
                 {result.isScam && (
                   <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                     SCAM DETECTED
                   </span>
                 )}
              </div>
           )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor View */}
        <div className={`flex-1 overflow-auto bg-[#0d1117] p-4 font-mono text-sm leading-relaxed text-gray-300 ${status === AnalysisStatus.COMPLETED ? 'w-1/2 border-r border-gray-800' : 'w-full'}`}>
            <pre className="whitespace-pre-wrap break-all">
                {activeTab === 'code' ? content : result?.remediatedCode}
            </pre>
        </div>

        {/* Report Panel (Visible only after analysis) */}
        {status === AnalysisStatus.COMPLETED && result && (
          <div className="w-1/2 overflow-y-auto bg-gray-900 border-l border-gray-800">
             <VulnerabilityReport result={result} />
          </div>
        )}
      </div>
    </div>
  );
};