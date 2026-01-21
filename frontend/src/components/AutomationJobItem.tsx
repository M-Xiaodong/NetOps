import {
    Activity,
    Database,
    Terminal,
    Search,
    ShieldCheck,
    Zap,
    Clock,
    MoreHorizontal,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 定义接口 (与后端模型对齐)
export interface AutomationJob {
    id: number;
    name: string;
    task_type: string;
    target_devices: string[];
    schedule_type: string;
    schedule_value?: string;
    is_active: boolean;
    created_at: string;
}

interface AutomationJobItemProps {
    job: AutomationJob;
    isActive: boolean; // 用于表示是否在右侧展示详情
    isSelected?: boolean; // 用于多选模式下的勾选
    showCheckbox?: boolean;
    onClick: () => void;
}

const taskTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
    inspect: { label: '健康巡检', icon: Activity, color: 'text-blue-500' },
    backup: { label: '配置备份', icon: Database, color: 'text-emerald-500' },
    config: { label: '配置下发', icon: Terminal, color: 'text-orange-500' },
    query: { label: '信息查询', icon: Search, color: 'text-purple-500' },
    diagnosis: { label: '网络诊断', icon: ShieldCheck, color: 'text-rose-500' }
};

export default function AutomationJobItem({
    job,
    isActive,
    isSelected = false,
    showCheckbox = false,
    onClick
}: AutomationJobItemProps) {
    const config = taskTypeConfig[job.task_type] || { label: '未知任务', icon: MoreHorizontal, color: 'text-slate-400' };
    const TypeIcon = config.icon;
    const isImmediate = job.schedule_type === 'immediate';

    // 格式化时间显示 (显示 月/日 时:分)
    const timeStr = new Date(job.created_at).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                isActive
                    ? "bg-slate-50 border-primary/20 shadow-sm"
                    : isSelected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-white border-slate-100 hover:border-slate-200"
            )}
        >
            <div className="flex items-start gap-2.5">
                {/* 多选复选框 */}
                {showCheckbox && (
                    <div className={cn(
                        "mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "bg-primary border-primary" : "bg-white border-slate-300"
                    )}>
                        {isSelected && <Check className="h-3 w-3 text-white stroke-[4]" />}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2 flex-1 mr-2">
                            <span className={cn(
                                "font-bold text-sm line-clamp-1",
                                isSelected || isActive ? "text-slate-900" : "text-slate-600"
                            )}>
                                {job.name}
                            </span>
                        </div>
                        {isImmediate ? (
                            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                            <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("p-1 rounded bg-slate-50 border border-slate-100", config.color)}>
                                <TypeIcon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 truncate">
                                {config.label}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono font-bold">
                            {timeStr}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 补充 Check 图标导入
