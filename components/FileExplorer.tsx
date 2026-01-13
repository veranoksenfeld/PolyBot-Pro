import React from 'react';
import { RepoNode } from '../types';
import { Folder, FileCode, File, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  nodes: RepoNode[];
  onSelect: (node: RepoNode) => void;
  selectedNode: RepoNode | null;
}

export const FileExplorer: React.FC<Props> = ({ nodes, onSelect, selectedNode }) => {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <FileNodeItem 
          key={node.sha} 
          node={node} 
          onSelect={onSelect} 
          isSelected={selectedNode?.sha === node.sha} 
        />
      ))}
    </ul>
  );
};

const FileNodeItem: React.FC<{ node: RepoNode; onSelect: (n: RepoNode) => void; isSelected: boolean }> = ({ node, onSelect, isSelected }) => {
  const isDir = node.type === 'dir';
  
  // Icon selection based on extension
  const getIcon = () => {
    if (isDir) return <Folder className="w-4 h-4 text-blue-400" />;
    if (node.name.endsWith('.ts') || node.name.endsWith('.js') || node.name.endsWith('.sol')) {
      return <FileCode className="w-4 h-4 text-yellow-400" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <li>
      <button
        onClick={() => onSelect(node)}
        className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
          isSelected 
            ? 'bg-primary/20 text-primary-dark font-medium' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`}
      >
        {getIcon()}
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
};