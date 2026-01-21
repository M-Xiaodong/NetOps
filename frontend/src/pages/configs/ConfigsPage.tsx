import React from 'react';
import { FileText } from 'lucide-react';

export default function ConfigsPage() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm">
                <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl mb-4">
                    <FileText className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">配置管理页面维护中</h2>
                <p className="text-sm text-slate-500">
                    检测到文件损坏，该页面已暂时重置。请稍后通过 Git 历史恢复此功能。
                </p>
            </div>
        </div>
    );
}
