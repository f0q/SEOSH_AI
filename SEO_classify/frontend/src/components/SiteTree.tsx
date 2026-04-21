import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Globe } from 'lucide-react';

interface SiteNode {
  name: string;
  url?: string;
  children?: SiteNode[];
}

interface NodeProps {
  node: SiteNode;
  level: number;
  onSelect?: (url: string) => void;
  selectedUrl?: string;
}

const TreeNode: React.FC<NodeProps> = ({ node, level, onSelect, selectedUrl }) => {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.url === selectedUrl;
  const isSelectable = !!node.url;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer group ${
          isSelected ? 'bg-brand-500/20 border-l-2 border-brand-500' : 'hover:bg-surface-800/50'
        }`}
        onClick={(e) => {
          if (hasChildren) setIsOpen(!isOpen);
          else if (isSelectable && onSelect) onSelect(node.url!);
        }}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <span className="flex items-center gap-2">
          {hasChildren ? (
            <span className="text-surface-500 group-hover:text-surface-300">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          ) : (
            <span className="w-4" />
          )}
          
          {hasChildren ? (
            <Folder className={`w-4 h-4 ${isOpen ? 'text-brand-400' : 'text-surface-500'}`} />
          ) : (
            <FileText className={`w-4 h-4 ${isSelected ? 'text-brand-400' : 'text-surface-500'}`} />
          )}
        </span>

        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-medium truncate ${
            isSelected ? 'text-brand-300' : hasChildren ? 'text-surface-200' : 'text-surface-300'
          }`}>
            {node.name}
          </span>
          {node.url && (
            <span className="text-[10px] text-surface-500 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {node.url}
            </span>
          )}
        </div>
        
        {isSelectable && onSelect && !isSelected && (
          <button 
            className="ml-auto opacity-0 group-hover:opacity-100 btn-ghost py-0.5 px-1.5 text-[10px] h-auto"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.url!);
            }}
          >
            Выбрать
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="mt-0.5">
          {node.children!.map((child, idx) => (
            <TreeNode 
              key={`${child.url}-${idx}`} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect}
              selectedUrl={selectedUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function SiteTree({ 
  structure, 
  onSelect, 
  selectedUrl,
  className = ""
}: { 
  structure: SiteNode;
  onSelect?: (url: string) => void;
  selectedUrl?: string;
  className?: string;
}) {
  if (!structure) return null;

  return (
    <div className={`bg-surface-900/50 rounded-xl border border-surface-800/50 p-4 max-h-[500px] overflow-y-auto custom-scrollbar ${className}`}>
      <div className="flex items-center gap-2 mb-4 px-2">
        <Globe className="w-4 h-4 text-brand-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">
          Логическая структура сайта (AI)
        </h4>
      </div>
      <TreeNode 
        node={structure} 
        level={0} 
        onSelect={onSelect} 
        selectedUrl={selectedUrl}
      />
    </div>
  );
}
