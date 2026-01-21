import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plus, Search, Terminal, Play,
    Trash2, Loader2,
    Briefcase, RotateCw,
    Folder, Layers,
    Activity, Pencil, ListChecks
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AutomationJobModal from '@/components/AutomationJobModal';
import TaskExecutionTimeline from '@/components/TaskExecutionTimeline';
import AutomationJobItem from '@/components/AutomationJobItem';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useMemo } from 'react';

// ... (类型定义省略以保持简洁)
interface AutomationJob {
    id: number;
    name: string;
    task_type: string;
    target_devices: string[];
    schedule_type: string;
    schedule_value: string;
    is_active: boolean;
    created_at: string;
}

interface JobLog {
    id: number;
    job_id: number;
    status: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    total_devices: number;
    success_count: number;
    failed_count: number;
    results: Record<string, any>;
}

export default function AutomationPage() {
    // ... (状态管理代码保持不变)
    const [jobs, setJobs] = useState<AutomationJob[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState<AutomationJob | null>(null);
    const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
    const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<any>(null);
    const [executionLoading, setExecutionLoading] = useState<number[]>([]);
    const [pollingEnabled, setPollingEnabled] = useState(false);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger',
        onConfirm: () => { }
    });

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // ... (过滤逻辑和数据加载函数保持不变)
    const filteredJobs = useMemo(() => {
        return jobs.filter(j =>
            (j.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [jobs, searchQuery]);

    const groupedJobs = useMemo(() => {
        const groups: Record<string, AutomationJob[]> = {};
        const BATCH_KEY = '批量作业 (Batch Operations)';
        const OTHERS_KEY = '其他 (Others)';
        filteredJobs.forEach(job => {
            let key = OTHERS_KEY;
            if (job.target_devices && job.target_devices.length > 0) {
                key = job.target_devices.length === 1 ? job.target_devices[0] : BATCH_KEY;
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(job);
        });
        return groups;
    }, [filteredJobs]);

    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedJobs).sort((a, b) => {
            if (a.includes('Batch')) return -1;
            if (b.includes('Batch')) return 1;
            return a.localeCompare(b);
        });
    }, [groupedJobs]);

    useEffect(() => {
        if (sortedGroupKeys.length > 0 && !selectedGroupKey) setSelectedGroupKey(sortedGroupKeys[0]);
    }, [sortedGroupKeys, selectedGroupKey]);

    const currentGroupJobs = selectedGroupKey ? groupedJobs[selectedGroupKey] || [] : [];
    const selectedLog = jobLogs.find(l => l.id === selectedLogId) || null;

    const fetchJobs = async () => {
        setJobsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/automation/jobs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
                const jobId = searchParams.get('jobId');
                if (jobId) {
                    const targetJob = data.find((j: any) => j.id === parseInt(jobId));
                    if (targetJob) {
                        setSelectedJob(targetJob);
                        const groupKey = targetJob.target_devices?.length === 1 ? targetJob.target_devices[0] : '批量作业 (Batch Operations)';
                        setSelectedGroupKey(groupKey);
                    }
                }
            }
        } catch (err) { console.error("Fetch jobs failed:", err); } finally { setJobsLoading(false); }
    };

    const fetchJobLogs = useCallback(async (jobId: number, keepSelection: boolean = true) => {
        if (!keepSelection) setLogsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/automation/jobs/${jobId}/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const sortedData = data.sort((a: JobLog, b: JobLog) => b.id - a.id);
                setJobLogs(sortedData);
                if (sortedData.length > 0 && selectedLogId === null && !keepSelection) setSelectedLogId(sortedData[0].id);
                setPollingEnabled(sortedData.some((log: JobLog) => log.status === 'running'));
            }
        } catch (err) { console.error("Fetch job logs error:", err); } finally { setLogsLoading(false); }
    }, [selectedLogId]);

    const handleRunNow = async (job: AutomationJob) => {
        setExecutionLoading(prev => [...prev, job.id]);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/automation/jobs/${job.id}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.log_id && selectedJob?.id === job.id) {
                    // 1. 立即获取该 Job 的最新日志列表
                    const logsRes = await fetch(`/api/automation/jobs/${job.id}/logs`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (logsRes.ok) {
                        const logsData = await logsRes.json();
                        setJobLogs(logsData.sort((a: any, b: any) => b.id - a.id));
                    }
                    // 2. 选中新生成的日志 ID 并开启轮询
                    setSelectedLogId(data.log_id);
                    setPollingEnabled(true);
                } else if (selectedJob?.id === job.id) {
                    setTimeout(() => fetchJobLogs(job.id), 1000);
                    setPollingEnabled(true);
                }
            }
        } catch (err) { console.error("Run job now failed:", err); } finally { setExecutionLoading(prev => prev.filter(id => id !== job.id)); }
    };

    const deleteJob = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: '删除作业确认',
            message: '确定要删除此自动化作业吗？此操作将永久移除该作业及其所有相关的执行历史记录，无法恢复。',
            type: 'danger',
            onConfirm: async () => {
                closeConfirm();
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/automation/jobs/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        fetchJobs();
                        if (selectedJob?.id === id) {
                            setSelectedJob(null); setJobLogs([]); setSelectedLogId(null);
                        }
                    }
                } catch (err) { console.error("Delete job failed:", err); }
            }
        });
    };

    useEffect(() => { fetchJobs(); }, []);
    useEffect(() => {
        if (selectedJob) {
            // 如果是因为跳转携带了参数，不要强行清空选中日志
            const urlJobId = searchParams.get('jobId');
            if (urlJobId && parseInt(urlJobId) === selectedJob.id && selectedLogId) {
                // Keep selectedLogId
            } else {
                setSelectedLogId(null);
            }
            fetchJobLogs(selectedJob.id, false);
        }
    }, [selectedJob?.id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (pollingEnabled && selectedJob) interval = setInterval(() => fetchJobLogs(selectedJob.id, true), 3000);
        return () => { if (interval) clearInterval(interval); };
    }, [pollingEnabled, selectedJob?.id, fetchJobLogs]);

    const batchDeleteJobs = () => {
        if (selectedJobIds.size === 0) return;
        setConfirmModal({
            isOpen: true,
            title: '批量删除确认',
            message: `确定要删除选中的 ${selectedJobIds.size} 个自动化作业吗？`,
            type: 'danger',
            onConfirm: async () => {
                closeConfirm();
                try {
                    const token = localStorage.getItem('token');
                    await Promise.all(Array.from(selectedJobIds).map(id => fetch(`/api/automation/jobs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })));
                    fetchJobs(); setSelectedJobIds(new Set()); setIsMultiSelectMode(false);
                    if (selectedJob?.id && selectedJobIds.has(selectedJob.id)) { setSelectedJob(null); setJobLogs([]); setSelectedLogId(null); }
                } catch (err) { console.error("Batch delete jobs failed:", err); }
            }
        });
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-2 overflow-hidden">
            <div className="flex-1 flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* 左侧嵌套结构 (第一栏 + 第二栏) */}
                <div className="flex flex-col border-r border-slate-200 shrink-0" style={{ width: '520px' }}>
                    {/* 统一工具栏 (Toolbar A) - 覆盖前两栏 */}
                    <div className="h-14 bg-slate-50/50 border-b border-slate-200 flex items-center px-4 gap-1 shrink-0">

                        <button
                            onClick={() => { setEditingJob(null); setIsModalOpen(true); }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="新建作业"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                        </button>

                        <button
                            onClick={() => { if (selectedJob) { setEditingJob(selectedJob); setIsModalOpen(true); } }}
                            disabled={!selectedJob || isMultiSelectMode}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30"
                            title="修改选中作业"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => isMultiSelectMode ? batchDeleteJobs() : (selectedJob && deleteJob(selectedJob.id))}
                            disabled={isMultiSelectMode ? selectedJobIds.size === 0 : !selectedJob}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30"
                            title="删除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="h-8 w-[1px] bg-slate-200 mx-2" />

                        <button
                            onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedJobIds(new Set()); }}
                            className={cn("p-2 rounded-lg transition-all", isMultiSelectMode ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:bg-slate-100")}
                            title="多选模式"
                        >
                            <ListChecks className="h-4 w-4" />
                        </button>

                        <button onClick={fetchJobs} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="刷新列表">
                            <RotateCw className={cn("h-4 w-4", jobsLoading && "animate-spin")} />
                        </button>

                        <div className="flex-1" />

                        <div className="relative group w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索作业..."
                                className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-sm font-medium focus:border-primary/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* 第一栏：设备分组 */}
                        <div className="w-[200px] border-r border-slate-200 flex flex-col overflow-hidden bg-white">
                            <div className="h-10 px-3 border-b border-slate-50 bg-slate-50/30 flex items-center shrink-0">
                                <Layers className="h-4 w-4 text-primary opacity-60 mr-2" />
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">设备分组</span>
                            </div>
                            <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                                {jobsLoading ? <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 text-primary animate-spin" /></div> :
                                    sortedGroupKeys.map(groupKey => (
                                        <div key={groupKey} onClick={() => setSelectedGroupKey(groupKey)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all select-none group", selectedGroupKey === groupKey ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-50 text-slate-600")}>
                                            {groupKey.includes('Batch') ? <Layers className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
                                            <span className="text-sm font-semibold truncate flex-1">{groupKey}</span>
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", selectedGroupKey === groupKey ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200")}>{groupedJobs[groupKey].length}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* 第二栏：任务列表 */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="h-10 px-3 border-b border-slate-50 flex items-center bg-slate-50/30 shrink-0">
                                <Briefcase className="h-4 w-4 text-primary opacity-60 mr-2" />
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">任务历史</h3>
                            </div>
                            <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                                {currentGroupJobs.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-20"><Activity className="h-8 w-8 mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">暂无记录</span></div> :
                                    currentGroupJobs.map(job => (
                                        <div key={job.id} className="relative group">
                                            <AutomationJobItem job={job} isActive={selectedJob?.id === job.id} isSelected={selectedJobIds.has(job.id)} showCheckbox={isMultiSelectMode} onClick={() => isMultiSelectMode ? setSelectedJobIds(prev => { const next = new Set(prev); if (next.has(job.id)) next.delete(job.id); else next.add(job.id); return next; }) : setSelectedJob(job)} />
                                            {!isMultiSelectMode && <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white/95 rounded-md shadow-lg border border-slate-100 p-0.5 z-10"><button onClick={(e) => { e.stopPropagation(); handleRunNow(job); }} disabled={executionLoading.includes(job.id)} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors" title="立即执行">{executionLoading.includes(job.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}</button></div>}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 第三栏：详细执行视图 (右展示区) */}
                <div className="flex-1 min-w-0 bg-white flex flex-col overflow-hidden">
                    {/* 独立头部 (Toolbar B) */}
                    <div className="h-14 px-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <Terminal className="h-4 w-4 text-primary opacity-60" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest truncate max-w-[300px]">{selectedJob ? selectedJob.name : '执行明细'}</h3>
                            {selectedLog && <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3"><span className="text-xs font-bold text-slate-300 uppercase tracking-tight">LOG #{selectedLog.id}</span></div>}
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedLog && <div className="flex items-center gap-2 mr-1">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase border border-emerald-100">{selectedLog.success_count} OK</span>
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded uppercase border border-rose-100">{selectedLog.failed_count} ERR</span>
                            </div>}
                            {selectedJob && <button onClick={() => fetchJobLogs(selectedJob.id)} className="p-1.5 hover:bg-slate-100 rounded border border-slate-200 transition-colors" title="刷新日志"><RotateCw className={cn("h-4 w-4 text-slate-400", logsLoading && "animate-spin")} /></button>}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        {selectedLog ? <TaskExecutionTimeline results={selectedLog.results || {}} isLoading={false} /> :
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Terminal className="h-12 w-12 mb-3" />
                                <h4 className="font-bold uppercase tracking-widest text-sm text-slate-500">选择执行记录查看明细</h4>
                                <span className="text-xs font-medium text-slate-300 mt-1">选择设备 至 选中作业 至 查看右侧步骤</span>
                            </div>}
                    </div>

                    {pollingEnabled && <div className="px-4 py-1.5 border-t border-slate-50 bg-amber-50/30 flex items-center gap-2 shrink-0"><div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" /><span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">LIVE TRACKING</span></div>}
                </div>
            </div>

            <AutomationJobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { fetchJobs(); setIsModalOpen(false); }} job={editingJob} />
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />
        </div>
    );
}
