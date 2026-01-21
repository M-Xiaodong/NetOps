import React, { useState } from 'react';
import {
    Folder,
    FolderOpen,
    FileText,
    ChevronRight,
    ChevronDown,
    AlertCircle,
    Router
} from 'lucide-react';
import { cn } from '../lib/utils';
import { FileNode } from '../lib/api';

interface FileTreeProps {
    data: FileNode[];
    onSelect: (node: FileNode) => void;
    selectedPath?: string;
}

const TreeNode: React.FC<{
    node: FileNode;
    level: number;
    onSelect: (node: FileNode) => void;
    selectedPath?: string;
}> = ({ node, level, onSelect, selectedPath }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children && node.children.length > 0;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === 'directory') {
            setIsOpen(!isOpen);
        } else {
            onSelect(node);
        }
    };

    // Icon selection logic
    const getIcon = () => {
        if (node.type === 'directory') {
            return isOpen ? FolderOpen : Folder;
        }
        if (node.metadata?.error) return AlertCircle;
        if (node.metadata?.device_name) return Router;
        return FileText;
    };

    const Icon = getIcon();

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200 select-none text-sm border border-transparent",
                    isSelected
                        ? "bg-primary/10 text-primary font-bold border-primary/10 shadow-sm"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:border-border/50",
                    level > 0 && "ml-4"
                )}
                onClick={handleClick}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                <span className="opacity-50 w-4 flex justify-center shrink-0">
                    {hasChildren && (
                        isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </span>

                <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    node.type === 'directory' ? "text-blue-500 fill-blue-500/20" : "text-slate-400",
                    node.metadata?.error && "text-red-500",
                    isSelected && "text-primary fill-primary/20"
                )} />

                <span className="truncate font-medium">
                    {node.metadata?.device_name || node.name}
                </span>
            </div>

            {isOpen && hasChildren && (
                <div className="animate-slide-up">
                    {node.children!.map((child) => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedPath={selectedPath}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({ data, onSelect, selectedPath }) => {
    return (
        <div className="h-full overflow-y-auto py-2">
            {data.map((node) => (
                <TreeNode
                    key={node.path}
                    node={node}
                    level={0}
                    onSelect={onSelect}
                    selectedPath={selectedPath}
                />
            ))}
        </div>
    );
};
