import { useState, useEffect } from 'react';
import {
    Folder, FileText, Server, ChevronRight, ChevronDown, Upload, RefreshCw,
    Trash2, FileDiff, Check, X, Edit2, FolderOpen,
    Globe, FolderInput, PanelLeftClose, PanelLeftOpen, ListChecks, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { DeviceIcon } from '../components/business';
import { MessageContainer } from '../components/common';
import { useMessage } from '../hooks';
import MonacoDiffEditor from '../components/MonacoDiffEditor';
import Editor from '@monaco-editor/react';
import { networkConfigLanguage, networkConfigThemeLight } from '../lib/monaco-network-config';

// --- Types ---
interface TreeNode {
    id: string;
    name: string;
    type: 'region' | 'device' | 'file';
    device_type?: 'switch' | 'firewall' | 'wireless_ac' | 'router' | 'server' | 'unknown';
    region_type?: string;
    vendor?: string;
    model?: string;
    version?: string;
    children?: TreeNode[];
    device_count?: number;
    file_count?: number;
    path?: string;
    mtime?: number;
}

interface FileItem {
    id: string;
    name: string;
    path: string;
    mtime: number;
    selected?: boolean;
}

interface ImportItem {
    path: string;
    filename: string;
    size: number;
    mtime: string;
    timestamp?: number;
    detected_sysname: string | null;
    suggested_region: string | null;
    selected: boolean;
    target_region: string;
    target_device: string;
    status?: 'pending' | 'success' | 'failed';
    error?: string;
    region_type?: string;
    device_type?: string;
    model?: string;
    version?: string;
}const ImportDialog = ({ isOpen, onClose, onImportComplete, showMessage }: any) => {
    const [step, setStep] = useState<'scan' | 'preview' | 'importing' | 'result'>('scan');
    const [scanPath, setScanPath] = useState('e:/NetOps/配置备份');
    const [candidates, setCandidates] = useState<ImportItem[]>([]);
    const [importResults, setImportResults] = useState<any>(null);

    const handleScan = async () => {
        try {
            const items = await api.files.scan(scanPath);
            setCandidates(items.map((i: any) => ({
                ...i,
                selected: true,
                target_region: i.suggested_region || 'Default_Region',
                target_device: i.detected_sysname || 'Unknown_Device',
                // Map new fields
                region_type: i.region_type || '办公区',
                device_type: i.device_type || '交换机',
                model: i.model || '',
                version: i.version || ''
            })));
            setStep('preview');
        } catch (e: any) {
            showMessage("扫描失败", e.message, "error");
        }
    };

    const handleImport = async () => {
        setStep('importing');
        const toImport = candidates.filter(c => c.selected).map(c => ({
            path: c.path,
            region: c.target_region,
            device_name: c.target_device,
            mtime: c.mtime,
            timestamp: c.timestamp
        }));

        try {
            const res = await api.files.import(toImport);
            setImportResults(res);
            setStep('result');
            onImportComplete();
        } catch (e: any) {
            showMessage("导入失败", e.message, "error");
            setStep('preview');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-border/50 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-600" /> 导入配置文件
                    </h2>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {step === 'scan' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">扫描文件夹</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={scanPath}
                                        onChange={e => setScanPath(e.target.value)}
                                        className="flex-1 border border-border/50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <button onClick={handleScan} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700">扫描</button>
                                </div>
                                <p className="text-xs text-slate-400">支持 .zip (含 vrpcfg.cfg 解析), .cfg, .txt, .conf</p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600">发现 {candidates.length} 个文件</span>
                                <button onClick={handleImport} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20">确认导入 ({candidates.filter(c => c.selected).length})</button>
                            </div>
                            <div className="border border-border/50 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-border/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-10"><input type="checkbox" checked={candidates.every(c => c.selected)} onChange={(e) => setCandidates(candidates.map(c => ({ ...c, selected: e.target.checked })))} /></th>
                                            <th className="px-4 py-2 w-48">文件名</th>
                                            <th className="px-4 py-2 w-32">区域类型</th>
                                            <th className="px-4 py-2 w-32">目标地区</th>
                                            <th className="px-4 py-2 w-32">设备类型</th>

                                            <th className="px-4 py-2 w-32">目标设备</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {candidates.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2"><input type="checkbox" checked={item.selected} onChange={(e) => {
                                                    const newC = [...candidates];
                                                    newC[idx].selected = e.target.checked;
                                                    setCandidates(newC);
                                                }} /></td>
                                                <td className="px-4 py-2">
                                                    <div className="font-mono text-slate-700 truncate" title={item.filename}>{item.filename}</div>
                                                    <div className="text-xs text-slate-400">{item.detected_sysname || '-'}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select value={item.region_type} onChange={(e) => {
                                                        const newC = [...candidates];
                                                        newC[idx].region_type = e.target.value;
                                                        setCandidates(newC);
                                                    }} className="bg-transparent border-b border-transparent hover:border-border focus:border-blue-500 outline-none w-full text-sm">
                                                        <option value="办公区">办公区</option>
                                                        <option value="工厂">工厂</option>
                                                        <option value="数据中心">数据中心</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2"><input type="text" value={item.target_region} onChange={(e) => {
                                                    const newC = [...candidates];
                                                    newC[idx].target_region = e.target.value;
                                                    setCandidates(newC);
                                                }} className="bg-transparent border-b border-transparent hover:border-border focus:border-blue-500 outline-none w-full font-medium text-blue-600" /></td>
                                                <td className="px-4 py-2">
                                                    <select value={item.device_type} onChange={(e) => {
                                                        const newC = [...candidates];
                                                        newC[idx].device_type = e.target.value;
                                                        setCandidates(newC);
                                                    }} className="bg-transparent border-b border-transparent hover:border-border focus:border-blue-500 outline-none w-full text-sm">
                                                        <option value="交换机">交换机</option>
                                                        <option value="防火墙">防火墙</option>
                                                        <option value="路由器">路由器</option>
                                                        <option value="无线AC">无线AC</option>
                                                        <option value="服务器">服务器</option>
                                                    </select>
                                                </td>

                                                <td className="px-4 py-2"><input type="text" value={item.target_device} onChange={(e) => {
                                                    const newC = [...candidates];
                                                    newC[idx].target_device = e.target.value;
                                                    setCandidates(newC);
                                                }} className="bg-transparent border-b border-transparent hover:border-border focus:border-blue-500 outline-none w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
                            <p className="text-lg font-bold text-slate-700">正在导入配置文件...</p>
                        </div>
                    )}

                    {step === 'result' && importResults && (
                        <div className="space-y-6 text-center py-8">
                            <div className="flex justify-center gap-8">
                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 min-w-[150px]">
                                    <div className="text-3xl font-black text-green-600">{importResults.success}</div>
                                    <div className="text-sm font-bold text-green-700 uppercase mt-1">成功</div>
                                </div>
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 min-w-[150px]">
                                    <div className="text-3xl font-black text-red-600">{importResults.failed}</div>
                                    <div className="text-sm font-bold text-red-700 uppercase mt-1">失败</div>
                                </div>
                            </div>
                            {importResults.errors.length > 0 && (
                                <div className="bg-slate-900 rounded-xl p-4 text-left max-h-48 overflow-auto">
                                    <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{importResults.errors.join('\n')}</pre>
                                </div>
                            )}
                            <button onClick={onClose} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900">完成</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InputDialog = ({ isOpen, title, label, value, onSubmit, onClose }: any) => {
    const [val, setVal] = useState(value);
    useEffect(() => setVal(value), [value, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-6 scale-100 animate-scale-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
                        <input
                            autoFocus
                            type="text"
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            onKeyDown={e => e.key === 'Enter' && onSubmit(val)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                        <button onClick={() => onSubmit(val)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">确定</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onClose }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-6 scale-100 animate-scale-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                    {title}
                </h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">确定</button>
                </div>
            </div>
        </div>
    );
};



const MonacoDiffViewer = ({ fileA, fileB, onClose, showMessage, ...props }: any) => {
    const [contentA, setContentA] = useState<string>('');
    const [contentB, setContentB] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContents = async () => {
            try {
                const [resA, resB] = await Promise.all([
                    api.files.getContent(fileA.path),
                    api.files.getContent(fileB.path)
                ]);
                setContentA(resA.content);
                setContentB(resB.content);
            } catch (e) {
                showMessage("错误", "加载文件失败", "error");
            } finally {
                setLoading(false);
            }
        };
        loadContents();
    }, [fileA, fileB]);

    if (loading) return <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin h-8 w-8 text-slate-400" /></div>;

    return (
        <MonacoDiffEditor
            original={contentA}
            modified={contentB}
            originalLabel={fileA.name}
            modifiedLabel={fileB.name}
            height="100%"
            onClose={onClose}
            showMessage={showMessage}
            leftAction={props.leftAction}
        />
    );
};

// --- Main Page ---

const MoveDialog = ({ isOpen, title, currentRegion, currentDevice, onMove, onClose, treeData }: any) => {
    const [targetRegion, setTargetRegion] = useState(currentRegion || '');
    const [targetDevice, setTargetDevice] = useState(currentDevice || '');

    useEffect(() => {
        if (isOpen) {
            setTargetRegion(currentRegion || '');
            setTargetDevice(currentDevice || '');
        }
    }, [isOpen, currentRegion, currentDevice]);

    if (!isOpen) return null;

    const regions = treeData ? treeData.map((r: any) => r.name) : [];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-6 scale-100 animate-scale-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FolderInput className="h-5 w-5 text-blue-500" />
                    {title}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">移动到区域</label>
                        <select
                            value={targetRegion}
                            onChange={e => setTargetRegion(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white"
                        >
                            <option value="">选择区域...</option>
                            {regions.map((r: string) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                        <button onClick={() => onMove(targetRegion, targetDevice)} disabled={!targetRegion} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed">确定</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ConfigManager() {
    const [treeData, setTreeData] = useState<TreeNode[]>([]);
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [lastSelectedNode, setLastSelectedNode] = useState<TreeNode | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [fileList, setFileList] = useState<FileItem[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [previewContent, setPreviewContent] = useState<string | null>(null);

    // Monaco Editor Instance for Single File Preview
    const [previewEditor, setPreviewEditor] = useState<any>(null);

    const handlePreviewEditorDidMount = (editor: any) => {
        setPreviewEditor(editor);
    };

    const goToTop = () => {
        if (previewEditor) {
            previewEditor.revealLine(1);
            previewEditor.setPosition({ lineNumber: 1, column: 1 });
            previewEditor.focus();
        }
    };

    const goToBottom = () => {
        if (previewEditor) {
            const lineCount = previewEditor.getModel()?.getLineCount() || 1;
            previewEditor.revealLine(lineCount);
            previewEditor.setPosition({ lineNumber: lineCount, column: 1 });
            previewEditor.focus();
        }
    };
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Added sidebar state
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // Multi-select mode toggle

    const [col1Width, setCol1Width] = useState(220);
    const [col2Width, setCol2Width] = useState(250);
    const [moveDialog, setMoveDialog] = useState<{ isOpen: boolean, title: string, currentRegion?: string, currentDevice?: string, onMove: (region: string, device: string) => Promise<void> }>({ isOpen: false, title: '', onMove: async () => { } });

    const [inputDialog, setInputDialog] = useState<{ isOpen: boolean, title: string, label: string, value: string, onSubmit: (val: string) => Promise<void> }>({ isOpen: false, title: '', label: '', value: '', onSubmit: async () => { } });
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => Promise<void> }>({ isOpen: false, title: '', message: '', onConfirm: async () => { } });

    // 使用新版消息系统
    const { messages, showMessage: _showMessage, hideMessage } = useMessage();

    // 兼容旧版调用签名: (title, message, type) -> (type, title, content)
    const showMessage = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
        _showMessage(type, title, message);
    };



    const loadTree = async () => {
        try {
            const data = await api.files.getTree();
            setTreeData(data);
            return data;
        } catch (e) {
            console.error("Failed to load tree", e);
            return [];
        }
    };

    useEffect(() => { loadTree(); }, []);

    // --- Helpers & Derived State ---

    const getFileName = (id: string) => fileList.find(f => f.id === id)?.name || id;
    const getFilePath = (id: string) => fileList.find(f => f.id === id)?.path || '';

    const selectedRegion = lastSelectedNode?.type === 'region' ? lastSelectedNode :
        (lastSelectedNode?.type === 'device' ? treeData.find(r => r.children?.some(d => d.id === lastSelectedNode.id)) : null);

    const selectedDevice = lastSelectedNode?.type === 'device' ? lastSelectedNode : null;

    const startResize = (col: number, e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = col === 1 ? col1Width : col2Width;

        const onMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (col === 1) setCol1Width(Math.max(160, Math.min(600, newWidth)));
            else setCol2Width(Math.max(160, Math.min(600, newWidth)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // --- Handlers ---

    const handleToggle = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedIds(newExpanded);
    };

    const handleSelectNode = (node: TreeNode, multi: boolean = false) => {
        if (multi) {
            setSelectedNodeIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(node.id)) {
                    newSet.delete(node.id);
                } else {
                    newSet.add(node.id);
                }
                return newSet;
            });
            // Update lastSelectedNode only if adding, or if removing the current lastSelectedNode?
            // Simple approach: Always set lastSelectedNode to the clicked node if it's being added or kept?
            // If removing, we might want to shift lastSelectedNode.
            // For now, let's just update lastSelectedNode to the clicked node if it's in the set.
            // But we can't easily access the *new* set here inside the functional update.
            // Let's keep it simple: if multi-selecting, just update lastSelectedNode to the current one.
            setLastSelectedNode(node);
        } else {
            setSelectedNodeIds(new Set([node.id]));
            setLastSelectedNode(node);

            // If it's a device, load its files
            if (node.type === 'device' && node.children) {
                const files = node.children.map(c => ({
                    id: c.id,
                    name: c.name,
                    path: c.path!,
                    mtime: c.mtime!
                }));
                setFileList(files);
                setSelectedFiles(new Set());
                setPreviewContent(null);
            } else {
                setFileList([]);
            }
        }
    };

    const handleSelectFile = async (file: FileItem, multi: boolean) => {
        if (multi) {
            const newSet = new Set(selectedFiles);
            if (newSet.has(file.id)) newSet.delete(file.id);
            else newSet.add(file.id);
            setSelectedFiles(newSet);
        } else {
            setSelectedFiles(new Set([file.id]));
            try {
                const res = await api.files.getContent(file.path);
                setPreviewContent(res.content);
            } catch (e) {
                setPreviewContent("Failed to load content");
            }
        }
    };

    // --- Render Functions ---

    // --- Render Functions ---

    const renderRegions = () => {
        return (
            <div className="flex flex-col py-2">
                {treeData.map(region => (
                    <div
                        key={region.id}
                        className={cn(
                            "flex items-center py-2 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-sm select-none group mx-2 rounded-lg font-medium",
                            selectedNodeIds.has(region.id) ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                        )}
                        onClick={(e) => handleSelectNode(region, e.ctrlKey || e.metaKey)}
                    >
                        {isMultiSelectMode && (
                            <div className="mr-2" onClick={(e) => { e.stopPropagation(); handleSelectNode(region, true); }}>
                                <input type="checkbox" checked={selectedNodeIds.has(region.id)} onChange={() => { }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            </div>
                        )}
                        <div className={cn("mr-2", selectedNodeIds.has(region.id) ? "text-blue-500" : "text-slate-400")}>
                            <Folder className="h-4 w-4" />
                        </div>
                        <span className="truncate flex-1">{region.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded-full ml-2">{region.children?.length || 0}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderDevices = () => {
        if (!selectedRegion || !selectedRegion.children) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <Folder className="h-12 w-12 mb-2 opacity-20" />
                    <p>请选择一个区域</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col py-2">
                {selectedRegion.children.map(device => {
                    const isExpanded = expandedIds.has(device.id);
                    const isSelected = selectedNodeIds.has(device.id);

                    return (
                        <div key={device.id} className="mb-1">
                            <div
                                className={cn(
                                    "flex items-center py-2 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-sm select-none group mx-2 rounded-lg font-medium",
                                    isSelected ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"
                                )}
                                onClick={(e) => {
                                    handleSelectNode(device, e.ctrlKey || e.metaKey);
                                    if (!(e.ctrlKey || e.metaKey)) handleToggle(device.id);
                                }}
                            >
                                <div className="mr-2 text-slate-400">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </div>
                                {isMultiSelectMode && (
                                    <div className="mr-2" onClick={(e) => { e.stopPropagation(); handleSelectNode(device, true); }}>
                                        <input type="checkbox" checked={selectedNodeIds.has(device.id)} onChange={() => { }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    </div>
                                )}
                                <div className={cn("mr-2", isSelected ? "text-indigo-500" : "text-slate-400")}>
                                    <DeviceIcon type={device.device_type || 'unknown'} className="h-4 w-4" />
                                </div>
                                <span className="truncate flex-1">{device.name || ''}</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded-full ml-2">{device.file_count || 0}</span>
                            </div>

                            {isExpanded && (
                                <div className="ml-6 mt-1 space-y-0.5 border-l border-border/50 pl-2 mr-2">
                                    {/* Files for this device */}
                                    {/* We need to fetch files for this device if not already in fileList or if fileList is global. 
                                        Actually, handleSelectNode(device) updates fileList. 
                                        But here we want to render files for ALL expanded devices? 
                                        The requirement says: "Click specific device to expand files under it".
                                        So we should probably fetch files when expanding? 
                                        Or just rely on fileList if we only allow one device selected?
                                        The user said: "Click specific device expand files... click file... show in 3rd column".
                                        This implies we might see files for multiple devices if multiple are expanded?
                                        But `fileList` state is currently flat.
                                        Let's stick to: Select Device -> Update File List -> Render File List UNDER the device?
                                        Or render File List in the 2nd column under the device node?
                                        Yes, "expand device under configuration files".
                                        
                                        Issue: `fileList` is currently updated only when a device is SELECTED.
                                        If I expand a device without selecting it (if possible), or if I select another device, `fileList` changes.
                                        If I want to show files in the tree, I need the files data available in the tree structure or fetch it.
                                        The `treeData` currently doesn't seem to have `children` (files) for devices, only `file_count`.
                                        
                                        Let's check `loadTree`. It calls `api.files.getTree()`.
                                        If `getTree` returns files, then `device.children` would have files.
                                        Looking at `TreeNode` type: `children?: TreeNode[]`.
                                        And `TreeNodeItem` logic: `node.type !== 'file'`.
                                        
                                        If the backend returns files as children of devices, then we can just render them.
                                        If not, we might need to fetch them.
                                        
                                        Assuming for now we only show files for the SELECTED device, and we render them here.
                                        If the user wants to see files for multiple devices simultaneously, we'd need to change data fetching.
                                        But based on "Select specific region... then 2nd column shows devices... click device expand... click file",
                                        it seems standard tree behavior.
                                        
                                        Let's assume `fileList` corresponds to the `selectedDevice`.
                                        So we only render files if `device.id === selectedDevice.id`.
                                    */}
                                    {isSelected && fileList.map(file => (
                                        <div
                                            key={file.id}
                                            className={cn(
                                                "flex items-center py-1.5 px-2 cursor-pointer hover:bg-slate-100 transition-colors text-sm select-none rounded-md group font-medium",
                                                selectedFiles.has(file.id) ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectFile(file, false);
                                            }}
                                        >
                                            <div onClick={(e) => { e.stopPropagation(); handleSelectFile(file, true); }}
                                                title="Select"
                                                className={cn(
                                                    "w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors bg-white shrink-0 mr-2",
                                                    selectedFiles.has(file.id) ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-blue-400"
                                                )}>
                                                {selectedFiles.has(file.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                            </div>
                                            <FileText className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                            <span className="truncate flex-1">{file.name}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(file.mtime * 1000).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                    {isSelected && fileList.length === 0 && (
                                        <div className="text-xs text-slate-400 py-1 pl-2">暂无配置文件</div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- CRUD Actions ---

    const createRegion = async () => {
        setInputDialog({
            isOpen: true,
            title: "新建地区",
            label: "地区名称",
            value: "",
            onSubmit: async (name) => {
                if (name) await api.files.createRegion(name).then(loadTree).catch((e: any) => showMessage("错误", e.message, "error"));
                setInputDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const createDevice = async () => {
        if (lastSelectedNode?.type !== 'region') {
            showMessage("提示", "请先选择一个地区", "info");
            return;
        }
        setInputDialog({
            isOpen: true,
            title: "新建设备",
            label: "设备名称",
            value: "",
            onSubmit: async (name) => {
                if (name) await api.files.createDevice(lastSelectedNode.name, name).then(loadTree).catch((e: any) => showMessage("错误", e.message, "error"));
                setInputDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const deleteFiles = async () => {
        if (selectedFiles.size === 0) return;
        setConfirmDialog({
            isOpen: true,
            title: "确认删除文件",
            message: `确定删除选中的 ${selectedFiles.size} 个文件吗? 此操作不可恢复。`,
            onConfirm: async () => {
                const paths = fileList.filter(f => selectedFiles.has(f.id)).map(f => f.path);
                try {
                    await api.files.deleteFiles(paths);
                    const newData = await loadTree();

                    // 重新选中当前节点以刷新文件列表，防止空白
                    if (lastSelectedNode) {
                        // 在新数据中查找当前节点
                        let newNode: TreeNode | undefined;
                        if (lastSelectedNode.type === 'device') {
                            const region = newData.find((r: TreeNode) => r.children?.some((d: TreeNode) => d.id === lastSelectedNode.id));
                            newNode = region?.children?.find((d: TreeNode) => d.id === lastSelectedNode.id);
                        } else {
                            newNode = newData.find((r: TreeNode) => r.id === lastSelectedNode.id);
                        }

                        if (newNode) {
                            handleSelectNode(newNode, false);
                        }
                    }
                } catch (e: any) {
                    showMessage("错误", e.message, "error");
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const deleteNode = async () => {
        if (selectedFiles.size > 0) {
            deleteFiles();
            return;
        }

        if (selectedNodeIds.size === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: "确认删除",
            message: `确定删除选中的 ${selectedNodeIds.size} 个项目吗? 此操作不可恢复。`,
            onConfirm: async () => {
                try {
                    const nodesToDelete: TreeNode[] = [];
                    const findNodes = (nodes: TreeNode[]) => {
                        for (const node of nodes) {
                            if (selectedNodeIds.has(node.id)) nodesToDelete.push(node);
                            if (node.children) findNodes(node.children);
                        }
                    };
                    findNodes(treeData);

                    // 记录父节点信息，用于删除后恢复选中
                    let parentRegionName: string | undefined;
                    if (lastSelectedNode?.type === 'device') {
                        const region = treeData.find(r => r.children?.some(d => d.id === lastSelectedNode.id));
                        parentRegionName = region?.name;
                    }

                    for (const node of nodesToDelete) {
                        if (node.type === 'region') {
                            await api.files.deleteRegion(node.name);
                        } else if (node.type === 'device') {
                            const region = treeData.find(r => r.children?.some(d => d.id === node.id));
                            if (region) await api.files.deleteDevice(region.name, node.name);
                        }
                    }
                    setSelectedNodeIds(new Set());
                    setLastSelectedNode(null);
                    setFileList([]); // 清空文件列表

                    const newData = await loadTree();

                    // 尝试恢复选中状态
                    // 1. 如果是删除设备，尝试选中其父区域
                    if (parentRegionName) {
                        const regionNode = newData.find((r: TreeNode) => r.name === parentRegionName);
                        if (regionNode) {
                            handleSelectNode(regionNode, false);
                        }
                    }
                } catch (e: any) {
                    showMessage("删除失败", e.message, "error");
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const renameNode = async () => {
        if (!lastSelectedNode) return;
        setInputDialog({
            isOpen: true,
            title: "重命名",
            label: "新名称",
            value: lastSelectedNode.name,
            onSubmit: async (name) => {
                if (!name) return;
                if (lastSelectedNode.type === 'region') {
                    await api.files.renameRegion(lastSelectedNode.name, name).then(loadTree).catch((e: any) => showMessage("错误", e.message, "error"));
                } else if (lastSelectedNode.type === 'device') {
                    const region = treeData.find(r => r.children?.some(d => d.id === lastSelectedNode.id));
                    if (region) await api.files.renameDevice(region.name, lastSelectedNode.name, name).then(loadTree).catch((e: any) => showMessage("错误", e.message, "error"));
                }
                setInputDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const openDir = async () => {
        if (lastSelectedNode?.type === 'device') {
            const region = treeData.find(r => r.children?.some(d => d.id === lastSelectedNode.id));
            if (region) api.files.openDir(`e:/NetOps/data/configs/${region.name}/${lastSelectedNode.name}`);
        }
    };



    return (
        <div className="h-full w-full flex flex-col p-2 overflow-hidden bg-slate-50">
            <div className="flex flex-1 w-full bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                {/* Left Panel: Toolbar + Lists */}
                <div className={cn("flex flex-col border-r border-slate-200 bg-white overflow-hidden transition-all duration-300 ease-in-out", !isSidebarOpen && "w-0 border-r-0 opacity-0 hidden")} style={{ width: isSidebarOpen ? col1Width + col2Width : 0 }}>
                    {/* Unified Toolbar - Top of Left Panel */}
                    <div className="h-14 border-b border-border/50 flex items-center px-2 bg-slate-50/50 shrink-0 z-20 gap-1">
                        <button onClick={() => setIsImportOpen(true)} className="p-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm mr-2" title="导入配置">
                            <Upload className="h-4 w-4" />
                        </button>

                        <button onClick={createRegion}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="新建区域">
                            <Globe className="h-4 w-4 text-blue-500" />
                        </button>

                        <button onClick={createDevice}
                            disabled={!selectedRegion}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="新建设备">
                            <Server className="h-4 w-4 text-indigo-500" />
                        </button>

                        <button onClick={renameNode} disabled={!selectedRegion && !selectedDevice}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="重命名">
                            <Edit2 className="h-4 w-4" />
                        </button>

                        <button onClick={openDir} disabled={!selectedRegion && !selectedDevice}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="打开目录">
                            <FolderOpen className="h-4 w-4" />
                        </button>

                        <button onClick={() => {
                            const node = selectedDevice || selectedRegion;
                            if (node) {
                                setMoveDialog({
                                    isOpen: true,
                                    title: "移动",
                                    currentRegion: selectedRegion?.name,
                                    currentDevice: selectedDevice?.name,
                                    onMove: async (r, _) => {
                                        if (selectedDevice && selectedRegion) {
                                            await api.files.moveNode('device', selectedDevice.name, selectedRegion.name, r);
                                        } else if (selectedRegion) {
                                            showMessage("提示", "暂不支持移动区域", "info");
                                        }
                                        loadTree();
                                        setMoveDialog(prev => ({ ...prev, isOpen: false }));
                                    }
                                });
                            }
                        }} disabled={!selectedRegion && !selectedDevice}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="移动">
                            <FolderInput className="h-4 w-4" />
                        </button>

                        <button onClick={deleteNode} disabled={!selectedRegion && !selectedDevice && selectedFiles.size === 0}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="删除">
                            <Trash2 className="h-4 w-4" />
                        </button>

                        <button onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                            className={cn("p-2 rounded-lg transition-colors", isMultiSelectMode ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100")}
                            title={isMultiSelectMode ? "退出多选模式" : "进入多选模式"}>
                            <ListChecks className="h-4 w-4" />
                        </button>

                        <button onClick={loadTree} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="刷新">
                            <RefreshCw className="h-4 w-4" />
                        </button>

                        <button onClick={() => { }} disabled={selectedFiles.size !== 2}
                            className={cn("p-2 rounded-lg transition-all shadow-sm", selectedFiles.size === 2 ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20" : "bg-slate-100 text-slate-400 cursor-not-allowed")} title="对比">
                            <FileDiff className="h-4 w-4" />
                        </button>

                        <div className="flex-1" /> {/* Spacer to push sidebar button to far right */}

                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="折叠侧边栏">
                            <PanelLeftClose className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex flex-1 overflow-hidden">
                        {/* Column 1: Regions */}
                        <div className="flex-none flex flex-col relative bg-white border-r border-border/50" style={{ width: col1Width }}>
                            <div className="px-4 py-3 text-sm font-bold text-slate-700 border-b border-border/50 bg-slate-50/80 flex items-center h-10">
                                区域列表
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {renderRegions()}
                            </div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 transition-colors" onMouseDown={e => startResize(1, e)} />
                        </div>

                        {/* Column 2: Devices & Files */}
                        <div className="flex-none flex flex-col relative bg-white border-r border-border/50" style={{ width: col2Width }}>
                            <div className="px-4 py-3 text-sm font-bold text-slate-700 border-b border-border/50 bg-slate-50/80 flex items-center h-10">
                                设备列表
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {renderDevices()}
                            </div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 transition-colors" onMouseDown={e => startResize(2, e)} />
                        </div>

                        {/* Column 3: Preview / Diff - Moved to Right Panel */}
                    </div>
                </div>

                {/* Right Panel: Preview / Diff (Full Height) */}
                <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden rounded-r-xl shadow-sm">
                    {selectedFiles.size === 2 ? (
                        <MonacoDiffViewer
                            fileA={{
                                name: getFileName(Array.from(selectedFiles)[0]),
                                path: getFilePath(Array.from(selectedFiles)[0])
                            }}
                            fileB={{
                                name: getFileName(Array.from(selectedFiles)[1]),
                                path: getFilePath(Array.from(selectedFiles)[1])
                            }}
                            onClose={() => setSelectedFiles(new Set())}
                            showMessage={showMessage}
                            leftAction={!isSidebarOpen && (
                                <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="展开侧边栏">
                                    <PanelLeftOpen className="h-4 w-4" />
                                </button>
                            )}
                        />
                    ) : (
                        <>
                            <div className="px-4 py-2.5 text-sm font-semibold text-slate-700 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0 h-14">
                                <div className="flex items-center gap-2">
                                    {!isSidebarOpen && (
                                        <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors mr-2" title="展开侧边栏">
                                            <PanelLeftOpen className="h-4 w-4" />
                                        </button>
                                    )}
                                    <span>预览</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {previewContent && (
                                        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2">
                                            <button
                                                onClick={goToTop}
                                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                                title="跳转到首行"
                                            >
                                                <ChevronsUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={goToBottom}
                                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                                title="跳转到尾行"
                                            >
                                                <ChevronsDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                    {selectedFiles.size > 0 && (
                                        <span className="text-blue-600 text-xs font-medium bg-blue-50 px-2 py-0.5 rounded-full">{selectedFiles.size} 个文件</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden bg-white">
                                {previewContent ? (
                                    <Editor
                                        height="100%"
                                        language={networkConfigLanguage.id}
                                        value={previewContent}
                                        theme="network-config-light"
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            stickyScroll: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            fontSize: 15,
                                            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                            lineHeight: 24,
                                            wordWrap: 'on',
                                            automaticLayout: true,
                                            lineNumbers: 'on',
                                            scrollbar: { vertical: 'auto', horizontal: 'auto' },
                                            padding: { top: 0, bottom: 0 },
                                        }}
                                        onMount={handlePreviewEditorDidMount}

                                        beforeMount={(monaco) => {
                                            // 注册语言和主题
                                            if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === networkConfigLanguage.id)) {
                                                monaco.languages.register({ id: networkConfigLanguage.id });
                                                monaco.languages.setMonarchTokensProvider(networkConfigLanguage.id, networkConfigLanguage.monarchTokensProvider as any);
                                            }
                                            monaco.editor.defineTheme('network-config-light', networkConfigThemeLight as any);
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <FileText className="h-12 w-12 mb-3 opacity-30" />
                                        <p className="text-sm">点击文件预览内容</p>
                                        <p className="text-xs mt-1 text-slate-300">或勾选两个文件进行对比</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                {/* Dialogs */}
                <ImportDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImportComplete={() => { setIsImportOpen(false); loadTree(); }} showMessage={showMessage} />
                <InputDialog {...inputDialog} onClose={() => setInputDialog(prev => ({ ...prev, isOpen: false }))} />
                <ConfirmDialog {...confirmDialog} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
                <MoveDialog {...moveDialog} treeData={treeData} onClose={() => setMoveDialog(prev => ({ ...prev, isOpen: false }))} />
                <MessageContainer messages={messages} onClose={hideMessage} />
            </div>
        </div>
    );
}

