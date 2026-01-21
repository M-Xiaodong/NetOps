import React from 'react';
import { cn } from "@/lib/utils";
import { GitCommit, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface EditorStatusBarProps {
    cursorPosition: { lineNumber: number; column: number };
    selection?: string;
    encoding?: string;
    lineEnding?: string;
    language?: string;
    diffStats?: { added: number; removed: number };
    className?: string;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
    cursorPosition,
    selection,
    encoding = "UTF-8",
    lineEnding = "CRLF",
    language = "Network Config",
    diffStats,
    className
}) => {
    return (
        <div className={cn("h-6 bg-[#007acc] text-white flex items-center px-2 text-xs select-none justify-between shrink-0", className)}>
            <div className="flex items-center gap-4">
                {/* Diff Stats */}
                {diffStats && (diffStats.added > 0 || diffStats.removed > 0) && (
                    <div className="flex items-center gap-2 mr-2 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors" title="差异统计">
                        <GitCommit className="h-3 w-3" />
                        <span className="flex items-center gap-1">
                            {diffStats.added > 0 && <span>+{diffStats.added}</span>}
                            {diffStats.removed > 0 && <span>-{diffStats.removed}</span>}
                        </span>
                    </div>
                )}

                {/* Errors/Warnings Placeholder (Can be connected to markers later) */}
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer transition-colors">
                    <XCircle className="h-3 w-3" /> 0
                    <AlertCircle className="h-3 w-3 ml-1" /> 0
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Cursor Position */}
                <div className="hover:bg-white/10 px-1 rounded cursor-pointer transition-colors min-w-[80px] text-center">
                    Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
                    {selection && <span className="ml-1">({selection})</span>}
                </div>

                {/* Encoding & Line Ending */}
                <div className="hover:bg-white/10 px-1 rounded cursor-pointer transition-colors hidden sm:block">
                    {encoding}
                </div>
                <div className="hover:bg-white/10 px-1 rounded cursor-pointer transition-colors hidden sm:block">
                    {lineEnding}
                </div>

                {/* Language Mode */}
                <div className="hover:bg-white/10 px-1 rounded cursor-pointer transition-colors font-medium">
                    {language}
                </div>

                <div className="hover:bg-white/10 px-1 rounded cursor-pointer transition-colors">
                    <CheckCircle2 className="h-3 w-3" />
                </div>
            </div>
        </div>
    );
};
