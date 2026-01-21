/**
 * Monaco Diff Editor组件 - 增强版
 * 
 * 提供完整的差异对比功能:
 * - 网络配置专用语法高亮
 * - 并排对比视图
 * - 差异导航工具栏(首/尾/上/下)
 * - 折叠/展开未变更区域
 * - 色弱友好配色(固定)
 */

import React, { useRef, useState, useEffect } from 'react';
import { DiffEditor, useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { networkConfigLanguage, networkConfigThemeColorblind, networkConfigTheme, networkConfigThemeLight } from '../lib/monaco-network-config';
import {
    ChevronUp, ChevronDown, X, ArrowUp, ArrowDown, FileText, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { EditorStatusBar } from './EditorStatusBar';

interface MonacoDiffEditorProps {
    original: string;
    modified: string;
    originalLabel?: string;
    modifiedLabel?: string;
    readOnly?: boolean;
    height?: string;
    theme?: 'vs-dark' | 'light' | 'colorblind';
    onMount?: (editor: any, monaco: any) => void;
    onClose?: () => void;
    showMessage?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    leftAction?: React.ReactNode;
}

export const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({
    original,
    modified,
    originalLabel = '原始版本',
    modifiedLabel = '新版本',
    readOnly = true,
    height = '100%',
    onMount,
    onClose,
    showMessage,
    leftAction,
    theme = 'light'
}) => {
    const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
    const monacoInstance = useMonaco();
    const [hideUnchanged, setHideUnchanged] = useState(false); // 默认展开所有内容

    // Status Bar State
    const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
    const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });
    const [selection, setSelection] = useState<string | undefined>(undefined);

    // 注册自定义语言和主题
    useEffect(() => {
        if (monacoInstance) {
            // 注册语言
            if (!monacoInstance.languages.getLanguages().some((lang: any) => lang.id === networkConfigLanguage.id)) {
                monacoInstance.languages.register({ id: networkConfigLanguage.id });
                monacoInstance.languages.setMonarchTokensProvider(networkConfigLanguage.id, networkConfigLanguage.monarchTokensProvider as any);
                monacoInstance.languages.setLanguageConfiguration(networkConfigLanguage.id, networkConfigLanguage.config as any);
            }

            // 定义带有橙蓝色 diff 的浅色主题 (匹配文件名颜色)
            const customLightTheme = {
                ...networkConfigThemeLight,
                colors: {
                    ...networkConfigThemeLight.colors,
                    // 删除/原始 (左侧) - 橙色 (匹配 text-orange-700 文件名)
                    'diffEditor.removedTextBackground': '#fed7aa',       // orange-200 文字背景
                    'diffEditor.removedLineBackground': '#ffedd5',       // orange-100 行背景
                    'diffEditorGutter.removedLineBackground': '#ffedd5', // orange-100 行号栏 (与行背景一致)
                    'diffEditorOverview.removedForeground': '#ea580c',   // orange-600 小地图
                    // 新增/修改 (右侧) - 蓝色 (匹配 text-blue-700 文件名)
                    'diffEditor.insertedTextBackground': '#bfdbfe',      // blue-200 文字背景
                    'diffEditor.insertedLineBackground': '#dbeafe',      // blue-100 行背景
                    'diffEditorGutter.insertedLineBackground': '#dbeafe',// blue-100 行号栏 (与行背景一致)
                    'diffEditorOverview.insertedForeground': '#2563eb',  // blue-600 小地图
                }
            };

            // 注册主题
            monacoInstance.editor.defineTheme('network-config-dark', networkConfigTheme as any);
            monacoInstance.editor.defineTheme('network-config-light', customLightTheme as any);
            monacoInstance.editor.defineTheme('network-config-colorblind', networkConfigThemeColorblind as any);

            // 强制应用主题 (使用内联逻辑)
            const themeName = theme === 'vs-dark' ? 'network-config-dark'
                : theme === 'colorblind' ? 'network-config-colorblind'
                    : 'network-config-light';
            monacoInstance.editor.setTheme(themeName);
        }
    }, [monacoInstance, theme]);

    // 切换折叠状态
    const toggleHideUnchanged = () => {
        const newState = !hideUnchanged;
        setHideUnchanged(newState);

        if (diffEditorRef.current) {
            diffEditorRef.current.updateOptions({
                hideUnchangedRegions: {
                    enabled: newState,
                    revealLineCount: 5,
                    minimumLineCount: 5
                }
            });
        }
    };

    // 跳转到首行
    const goToFirstLine = () => {
        if (diffEditorRef.current) {
            const editor = diffEditorRef.current.getModifiedEditor();
            editor.setPosition({ lineNumber: 1, column: 1 });
            editor.revealLine(1);
            editor.focus();
        }
    };

    // 跳转到尾行
    const goToLastLine = () => {
        if (diffEditorRef.current) {
            const editor = diffEditorRef.current.getModifiedEditor();
            const model = editor.getModel();
            if (model) {
                const lastLine = model.getLineCount();
                editor.setPosition({ lineNumber: lastLine, column: 1 });
                editor.revealLine(lastLine);
                editor.focus();
            }
        }
    };

    // 导航到上一个/下一个差异
    const navigateDiff = (next: boolean) => {
        if (diffEditorRef.current) {
            const editor = diffEditorRef.current;
            const lineChanges = editor.getLineChanges();
            if (!lineChanges || lineChanges.length === 0) {
                if (showMessage) showMessage("提示", "没有发现差异", "info");
                return;
            }

            const modifiedEditor = editor.getModifiedEditor();
            const currentPosition = modifiedEditor.getPosition();
            if (!currentPosition) return;

            let targetChange: monaco.editor.ILineChange | null = null;

            if (next) {
                // 找下一个
                targetChange = lineChanges.find(change => change.modifiedStartLineNumber > currentPosition.lineNumber) || lineChanges[0];
            } else {
                // 找上一个
                // 倒序查找比当前行小的
                for (let i = lineChanges.length - 1; i >= 0; i--) {
                    if (lineChanges[i].modifiedEndLineNumber < currentPosition.lineNumber) {
                        targetChange = lineChanges[i];
                        break;
                    }
                }
                // 如果没找到，跳到最后一个（循环）
                if (!targetChange) targetChange = lineChanges[lineChanges.length - 1];
            }

            if (targetChange) {
                modifiedEditor.setPosition({ lineNumber: targetChange.modifiedStartLineNumber, column: 1 });
                modifiedEditor.revealLineInCenter(targetChange.modifiedStartLineNumber);
                modifiedEditor.focus();
            }
        }
    };

    const handleEditorDidMount = (editor: monaco.editor.IStandaloneDiffEditor, monaco: any) => {
        diffEditorRef.current = editor;
        if (onMount) onMount(editor, monaco);

        const modifiedEditor = editor.getModifiedEditor();

        // 监听光标位置
        modifiedEditor.onDidChangeCursorPosition((e) => {
            setCursorPosition({ lineNumber: e.position.lineNumber, column: e.position.column });
        });

        // 监听选择
        modifiedEditor.onDidChangeCursorSelection((e) => {
            const selection = e.selection;
            if (!selection.isEmpty()) {
                const selectedText = modifiedEditor.getModel()?.getValueInRange(selection);
                if (selectedText) {
                    const chars = selectedText.length;
                    const lines = selection.endLineNumber - selection.startLineNumber + 1;
                    setSelection(lines > 1 ? `${lines} lines, ${chars} chars` : `${chars} chars`);
                }
            } else {
                setSelection(undefined);
            }
        });

        // 监听差异更新以计算统计
        const updateStats = () => {
            const changes = editor.getLineChanges();
            if (changes) {
                let totalAdded = 0;
                let totalRemoved = 0;

                changes.forEach(c => {
                    if (c.originalEndLineNumber === 0) {
                        // 纯新增
                        totalAdded += (c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1);
                    } else if (c.modifiedEndLineNumber === 0) {
                        // 纯删除
                        totalRemoved += (c.originalEndLineNumber - c.originalStartLineNumber + 1);
                    } else {
                        // 修改
                        const mLines = c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1;
                        const oLines = c.originalEndLineNumber - c.originalStartLineNumber + 1;
                        totalAdded += mLines;
                        totalRemoved += oLines;
                    }
                });

                setDiffStats({ added: totalAdded, removed: totalRemoved });
            }
        };

        editor.onDidUpdateDiff(updateStats);
        // 初始计算
        setTimeout(updateStats, 500);
    };

    // 动态获取主题名称 - 默认为浅色以匹配整体风格
    const getThemeName = () => {
        switch (theme) {
            case 'vs-dark': return 'network-config-dark';
            case 'colorblind': return 'network-config-colorblind';
            default: return 'network-config-light'; // 默认使用浅色主题
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* Toolbar - VS Code Style */}
            <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-3 shrink-0 select-none">
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-4">
                    {leftAction}
                    <div className="flex items-center text-xs font-medium ml-1 flex-1 min-w-0">
                        <div className="flex items-center min-w-0 flex-1">
                            <FileText className="h-4 w-4 mr-2 text-orange-600 shrink-0" />
                            <span className="text-orange-700 font-bold truncate" title={originalLabel}>{originalLabel}</span>
                        </div>
                        <span className="mx-2 text-slate-400 font-bold">↔</span>
                        <div className="flex items-center min-w-0 flex-1 justify-end">
                            <span className="text-blue-700 font-bold truncate text-right" title={modifiedLabel}>{modifiedLabel}</span>
                            <FileText className="h-4 w-4 ml-2 text-blue-600 shrink-0" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Navigation Group */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
                        <button
                            onClick={goToFirstLine}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                            title="跳转到首行"
                        >
                            <ChevronsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => navigateDiff(false)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                            title="上一个差异"
                        >
                            <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => navigateDiff(true)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                            title="下一个差异"
                        >
                            <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={goToLastLine}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                            title="跳转到尾行"
                        >
                            <ChevronsDown className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* 折叠/展开按钮 */}
                    <button
                        onClick={toggleHideUnchanged}
                        className={cn(
                            "p-1.5 rounded transition-all flex items-center gap-1 text-xs font-medium ml-2",
                            hideUnchanged ? "bg-slate-100 text-slate-700 shadow-inner" : "text-slate-600 hover:bg-slate-100"
                        )}
                        title={hideUnchanged ? "展开所有内容" : "折叠未变更区域"}
                    >
                        {hideUnchanged ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{hideUnchanged ? "展开" : "折叠"}</span>
                    </button>

                    {/* 关闭按钮 */}
                    {onClose && (
                        <div className="pl-2 ml-2 border-l border-[#444]">
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-[#c42b1c] hover:text-white rounded transition-colors text-[#cccccc]"
                                title="关闭"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative min-h-0 bg-white">
                <DiffEditor
                    height="100%"
                    language={networkConfigLanguage.id}
                    original={original}
                    modified={modified}
                    theme={getThemeName()}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly: readOnly,
                        minimap: { enabled: true, scale: 0.75 },
                        scrollBeyondLastLine: false,
                        fontSize: 15,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        lineHeight: 24,
                        renderSideBySide: true,
                        ignoreTrimWhitespace: true,

                        // 启用 Sticky Scroll (吸顶效果)
                        stickyScroll: {
                            enabled: true,
                            maxLineCount: 5
                        },

                        // 折叠配置 - 增加上下文行数
                        hideUnchangedRegions: {
                            enabled: hideUnchanged,
                            revealLineCount: 5,
                            minimumLineCount: 5
                        },

                        // UI 优化
                        renderOverviewRuler: true,
                        diffWordWrap: 'off',
                        originalEditable: false,
                        automaticLayout: true
                    }}
                />
            </div>

            {/* Status Bar */}
            <EditorStatusBar
                cursorPosition={cursorPosition}
                selection={selection}
                diffStats={diffStats}
                language="Network Config"
                className="bg-slate-50 text-slate-600 border-t border-slate-200"
            />
        </div>
    );
};

export default MonacoDiffEditor;
