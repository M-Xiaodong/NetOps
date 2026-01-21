/**
 * 版本历史时间轴组件
 * 
 * 显示配置文件的版本历史，支持：
 * - 时间轴视图
 * - 版本选择for对比
 * - 变更统计显示
 */

import React from 'react';
import { Clock, GitCommit, Plus, Minus, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface VersionInfo {
    commit_hash: string;
    short_hash: string;
    message: string;
    timestamp: string;
    date: string;
    insertions: number;
    deletions: number;
    changed_files: number;
}

interface VersionTimelineProps {
    versions: VersionInfo[];
    selectedVersions: string[];  // 最多2个
    onSelectVersion: (commitHash: string) => void;
    onCompare?: () => void;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
    versions,
    selectedVersions,
    onSelectVersion,
    onCompare
}) => {
    const handleVersionClick = (commitHash: string) => {
        onSelectVersion(commitHash);
    };

    const canCompare = selectedVersions.length === 2;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 头部 */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    版本历史 ({versions.length})
                </h3>
                {canCompare && (
                    <button
                        onClick={onCompare}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 font-medium"
                    >
                        <GitCommit className="h-3.5 w-3.5" />
                        对比选中版本
                    </button>
                )}
            </div>

            {/* 时间轴 */}
            <div className="flex-1 overflow-y-auto p-4">
                {versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Clock className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm">暂无版本历史</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* 时间轴线 */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-blue-300 to-gray-200"></div>

                        <div className="space-y-3">
                            {versions.map((version) => {
                                const isSelected = selectedVersions.includes(version.commit_hash);
                                const selectionOrder = selectedVersions.indexOf(version.commit_hash) + 1;

                                return (
                                    <div
                                        key={version.commit_hash}
                                        className={cn(
                                            "relative pl-10 pr-3 py-3 rounded-lg cursor-pointer transition-all",
                                            "hover:bg-slate-50 hover:shadow-sm",
                                            isSelected && "bg-blue-50 border border-blue-200 shadow-md"
                                        )}
                                        onClick={() => handleVersionClick(version.commit_hash)}
                                    >
                                        {/* 时间轴节点 */}
                                        <div className={cn(
                                            "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white transition-all z-10",
                                            isSelected ? "border-blue-600 bg-blue-600" : "border-blue-400"
                                        )}>
                                            {isSelected && (
                                                <Check className="h-2 w-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            )}
                                        </div>

                                        {/* 选择序号标签 */}
                                        {isSelected && (
                                            <div className="absolute left-0 top-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r">
                                                {selectionOrder === 1 ? '旧' : '新'}
                                            </div>
                                        )}

                                        {/* 版本信息 */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <code className={cn(
                                                    "text-xs font-mono px-2 py-0.5 rounded",
                                                    isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                                )}>
                                                    {version.short_hash}
                                                </code>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(version.timestamp).toLocaleString('zh-CN', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-700 font-medium line-clamp-2">
                                                {version.message}
                                            </p>

                                            {/* 变更统计 */}
                                            {(version.insertions > 0 || version.deletions > 0) && (
                                                <div className="flex items-center gap-3 text-xs">
                                                    {version.insertions > 0 && (
                                                        <span className="flex items-center gap-1 text-green-600">
                                                            <Plus className="h-3 w-3" />
                                                            {version.insertions}
                                                        </span>
                                                    )}
                                                    {version.deletions > 0 && (
                                                        <span className="flex items-center gap-1 text-red-600">
                                                            <Minus className="h-3 w-3" />
                                                            {version.deletions}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 底部提示 */}
            {versions.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 bg-slate-50">
                    <p className="text-xs text-slate-500">
                        {selectedVersions.length === 0 && "点击版本进行选择"}
                        {selectedVersions.length === 1 && "再选择一个版本进行对比"}
                        {selectedVersions.length === 2 && "已选择2个版本，点击\"对比\"按钮"}
                    </p>
                </div>
            )}
        </div>
    );
};

export default VersionTimeline;
