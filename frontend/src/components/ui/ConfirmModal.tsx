import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title = '操作确认',
    message,
    onConfirm,
    onCancel,
    confirmText = '确 定',
    cancelText = '取 消',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            icon: <AlertCircle className="h-6 w-6 text-rose-500" />,
            bg: 'bg-rose-50/50',
            button: 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200'
        },
        warning: {
            icon: <AlertCircle className="h-6 w-6 text-amber-500" />,
            bg: 'bg-amber-50/50',
            button: 'bg-slate-900 hover:bg-slate-800 text-white'
        },
        info: {
            icon: <AlertCircle className="h-6 w-6 text-primary" />,
            bg: 'bg-primary/5',
            button: 'bg-slate-900 hover:bg-slate-800 text-white'
        }
    };

    const config = typeConfig[type];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[400px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200/60 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="p-8">
                    <div className="flex items-start gap-5">
                        <div className={cn("p-3 rounded-2xl shrink-0", config.bg)}>
                            {config.icon}
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={cn("px-8 py-2.5 text-sm font-black rounded-full transition-all active:scale-95", config.button)}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onCancel}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100/50 rounded-full transition-all active:rotate-90"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};
