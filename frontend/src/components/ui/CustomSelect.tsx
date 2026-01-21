import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
    label: string;
    value: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    searchable?: boolean;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = '请选择',
    className,
    searchable = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedLabel = options.find(opt => opt.value === value)?.label;

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    useLayoutEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    const dropdownContent = isOpen && (
        <div
            className="fixed z-[9999] mt-1.5 bg-white border border-slate-200/60 rounded-2xl shadow-[0_20px_100px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-1 duration-200 max-h-[280px] overflow-hidden flex flex-col backdrop-blur-xl bg-white/95"
            style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {searchable && (
                <div className="p-3 border-b border-slate-100 sticky top-0 bg-transparent">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            autoFocus
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索选项..."
                            className="w-full h-10 bg-slate-100/50 border border-slate-200/50 rounded-xl pl-10 pr-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                    </div>
                </div>
            )}

            <div className="overflow-y-auto custom-scrollbar p-1.5">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map(option => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                                setSearchQuery('');
                            }}
                            className={cn(
                                "px-3 py-2.5 text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-between group transition-all duration-200 mb-0.5",
                                value === option.value
                                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                                    : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                            )}
                        >
                            {option.label}
                            {value === option.value && <Check className="h-4 w-4 text-white" />}
                        </div>
                    ))
                ) : (
                    <div className="px-3 py-6 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                        未找到匹配内容
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    updateCoords(); // 状态变更前先计算位置
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "w-full h-10 bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all hover:border-primary/50",
                    isOpen && "ring-4 ring-primary/5 border-primary/50 shadow-sm",
                    "text-sm font-extrabold text-slate-900"
                )}
            >
                <span className={cn(!selectedLabel && "text-slate-300 font-bold")}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-all duration-300", isOpen && "rotate-180 text-primary")} />
            </div>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
}
