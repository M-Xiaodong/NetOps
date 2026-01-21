import { useState, useEffect, useRef } from 'react';
import { Clock, Info, Zap, Activity, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

// 自定义下拉框组件 - 完全自定义样式替代原生 select
interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    variant?: 'primary' | 'secondary';  // primary: 紫色主题, secondary: 灰色主题
    size?: 'sm' | 'md' | 'lg';
}

const CustomSelect = ({ value, onChange, options, variant = 'primary', size = 'md' }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 样式变体 - 使用高对比度黑色文字
    const variants = {
        primary: {
            button: 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-400',
            buttonOpen: 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-200',
            menu: 'border-indigo-300 shadow-xl',
            item: 'hover:bg-indigo-50 text-slate-900',
            itemActive: 'bg-indigo-100 text-indigo-800 font-semibold',
            check: 'text-indigo-700'
        },
        secondary: {
            button: 'bg-slate-100 border-slate-400 text-slate-900 hover:bg-slate-200 hover:border-slate-500',
            buttonOpen: 'bg-slate-200 border-slate-500 ring-2 ring-slate-200',
            menu: 'border-slate-300 shadow-xl',
            item: 'hover:bg-slate-100 text-slate-900',
            itemActive: 'bg-slate-200 text-slate-900 font-semibold',
            check: 'text-slate-700'
        }
    };

    const sizes = {
        sm: { button: 'px-3 py-1.5 text-sm min-w-[70px]', menu: 'text-sm' },
        md: { button: 'px-4 py-2 text-base min-w-[90px]', menu: 'text-base' },
        lg: { button: 'px-5 py-2.5 text-lg min-w-[110px]', menu: 'text-lg' }
    };

    const v = variants[variant];
    const s = sizes[size];

    return (
        <div ref={selectRef} className="relative">
            {/* 触发按钮 */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border-2 font-bold transition-all duration-200 cursor-pointer select-none",
                    s.button,
                    v.button,
                    isOpen && v.buttonOpen
                )}
            >
                <span>{value}</span>
                <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div className={cn(
                    "absolute z-50 mt-1.5 w-full min-w-[120px] bg-white rounded-lg border-2 py-1 animate-in fade-in-0 zoom-in-95 duration-150",
                    v.menu,
                    s.menu
                )}>
                    <div className="max-h-[240px] overflow-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full px-3 py-2 flex items-center justify-between gap-2 transition-colors duration-100 cursor-pointer",
                                    v.item,
                                    option === value && v.itemActive
                                )}
                            >
                                <span className="font-medium">{option}</span>
                                {option === value && (
                                    <Check className={cn("h-4 w-4", v.check)} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const UnitConverter = () => {
    const [activeTab, setActiveTab] = useState<'rate' | 'time'>('rate');
    const [inputValue, setInputValue] = useState<string>('100');
    const [inputUnit, setInputUnit] = useState<string>('Mbps');

    // --- Time Estimation State ---
    const [fileSize, setFileSize] = useState<string>('10');
    const [fileUnit, setFileUnit] = useState<string>('GB');
    const [speedValue, setSpeedValue] = useState<string>('100');
    const [speedUnit, setSpeedUnit] = useState<string>('Mbps');
    const [timeResult, setTimeResult] = useState<string>('');
    const [calcSteps, setCalcSteps] = useState<{ bits: string, speed: string, result: string } | null>(null);

    // --- Rate Conversion Logic ---
    const [results, setResults] = useState<{
        network: { unit: string, value: string, label: string }[],
        storage: { unit: string, value: string, label: string }[]
    }>({ network: [], storage: [] });

    useEffect(() => {
        const val = parseFloat(inputValue) || 0;

        let baseBits = 0;
        switch (inputUnit) {
            case 'bps': baseBits = val; break;
            case 'Kbps': baseBits = val * 1000; break;
            case 'Mbps': baseBits = val * 1000 * 1000; break;
            case 'Gbps': baseBits = val * 1000 * 1000 * 1000; break;
            case 'Tbps': baseBits = val * 1000 * 1000 * 1000 * 1000; break;
            case 'B/s': baseBits = val * 8; break;
            case 'KB/s': baseBits = val * 1024 * 8; break;
            case 'MB/s': baseBits = val * 1024 * 1024 * 8; break;
            case 'GB/s': baseBits = val * 1024 * 1024 * 1024 * 8; break;
            case 'TB/s': baseBits = val * 1024 * 1024 * 1024 * 1024 * 8; break;
        }

        const formatVal = (v: number) => {
            if (v === 0) return '0';
            if (v < 0.0001) return v.toExponential(2);
            return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
        };

        setResults({
            network: [
                { unit: 'bps', label: '网络带宽 (Network)', value: formatVal(baseBits) },
                { unit: 'Kbps', label: '网络带宽 (Network)', value: formatVal(baseBits / 1000) },
                { unit: 'Mbps', label: '网络带宽 (Network)', value: formatVal(baseBits / (1000 * 1000)) },
                { unit: 'Gbps', label: '网络带宽 (Network)', value: formatVal(baseBits / (1000 * 1000 * 1000)) },
                { unit: 'Tbps', label: '网络带宽 (Network)', value: formatVal(baseBits / (1000 * 1000 * 1000 * 1000)) },
            ],
            storage: [
                { unit: 'B/s', label: '数据传输 (Data)', value: formatVal(baseBits / 8) },
                { unit: 'KB/s', label: '数据传输 (Data)', value: formatVal(baseBits / (8 * 1024)) },
                { unit: 'MB/s', label: '数据传输 (Data)', value: formatVal(baseBits / (8 * 1024 * 1024)) },
                { unit: 'GB/s', label: '数据传输 (Data)', value: formatVal(baseBits / (8 * 1024 * 1024 * 1024)) },
                { unit: 'TB/s', label: '数据传输 (Data)', value: formatVal(baseBits / (8 * 1024 * 1024 * 1024 * 1024)) },
            ]
        });
    }, [inputValue, inputUnit]);

    // --- Time Calculation Logic ---
    useEffect(() => {
        const size = parseFloat(fileSize) || 0;
        const speed = parseFloat(speedValue) || 0;
        if (size <= 0 || speed <= 0) {
            setTimeResult(''); setCalcSteps(null); return;
        }

        let bits = 0;
        switch (fileUnit) {
            case 'B': bits = size * 8; break;
            case 'KB': bits = size * 1024 * 8; break;
            case 'MB': bits = size * 1024 * 1024 * 8; break;
            case 'GB': bits = size * 1024 * 1024 * 1024 * 8; break;
            case 'TB': bits = size * 1024 * 1024 * 1024 * 1024 * 8; break;
        }

        let speedBps = 0;
        switch (speedUnit) {
            case 'bps': speedBps = speed; break;
            case 'Kbps': speedBps = speed * 1000; break;
            case 'Mbps': speedBps = speed * 1000 * 1000; break;
            case 'Gbps': speedBps = speed * 1000 * 1000 * 1000; break;
            case 'B/s': speedBps = speed * 8; break;
            case 'KB/s': speedBps = speed * 1024 * 8; break;
            case 'MB/s': speedBps = speed * 1024 * 1024 * 8; break;
            case 'GB/s': speedBps = speed * 1024 * 1024 * 1024 * 8; break;
        }

        const totalSeconds = bits / speedBps;

        // Format steps for display
        setCalcSteps({
            bits: new Intl.NumberFormat('en-US').format(bits),
            speed: new Intl.NumberFormat('en-US').format(speedBps),
            result: totalSeconds.toFixed(2)
        });

        if (totalSeconds < 1) { setTimeResult('< 1 秒'); return; }

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);

        let res = '';
        if (h > 0) res += `${h} 小时 `;
        if (m > 0) res += `${m} 分钟 `;
        if (s > 0 || res === '') res += `${s} 秒`;
        setTimeResult(res);
    }, [fileSize, fileUnit, speedValue, speedUnit]);

    const ResultCard = ({ item, isByte }: { item: any, isByte: boolean }) => (
        <div className={cn(
            "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group",
        )}>
            <div className={cn(
                "absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold rounded-full",
                isByte ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
            )}>
                {isByte ? '字节' : '比特'}
            </div>
            <div className="flex flex-col gap-1 pr-10">
                <span className="text-[12px] font-semibold text-slate-700">{item.label}</span>
                <div className="text-[20px] font-extrabold text-slate-900 leading-tight break-all">
                    {item.value}
                </div>
                <div className="text-[14px] font-semibold text-slate-800">{item.unit}</div>
            </div>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafafa]">
            {/* Header Tabs */}
            <div className="flex justify-center shrink-0 py-6">
                <div className="flex bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('rate')}
                        className={cn(
                            "px-6 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all duration-200",
                            activeTab === 'rate'
                                ? "bg-slate-800 text-white shadow-md"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        <Zap className="h-4 w-4" />速率换算
                    </button>
                    <button
                        onClick={() => setActiveTab('time')}
                        className={cn(
                            "px-6 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all duration-200",
                            activeTab === 'time'
                                ? "bg-slate-800 text-white shadow-md"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        <Clock className="h-4 w-4" />耗时估算
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-10">
                {activeTab === 'rate' ? (
                    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                        {/* Input Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                                <label className="block text-sm font-bold text-slate-900 mb-3 ml-1">原始数据输入</label>
                                <div className="flex items-center gap-4 border-b-2 border-slate-100 focus-within:border-slate-300 transition-colors pb-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                        className="flex-1 text-4xl font-black text-slate-900 bg-transparent outline-none placeholder:text-slate-300"
                                        placeholder="0"
                                    />
                                    <div className="h-full w-px bg-slate-200" />
                                    <CustomSelect
                                        value={inputUnit}
                                        onChange={setInputUnit}
                                        options={['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']}
                                        variant="primary"
                                        size="lg"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden flex flex-col justify-center shadow-lg shadow-slate-200">
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Info className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">换算公式</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold tracking-tight">1 Byte = 8 bits</p>
                                        <div className="w-12 h-1 bg-indigo-500 rounded-full my-2"></div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-[80%]">
                                        网络单位 (bps) 采用 1000 进制 (Metric)<br />
                                        存储单位 (B/s) 采用 1024 进制 (IEC)
                                    </p>
                                </div>
                                <Zap className="absolute -bottom-6 -right-6 h-32 w-32 text-slate-800 rotate-12 opacity-50" />
                            </div>
                        </div>

                        {/* Results */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 tracking-wide ml-1">网络带宽（比特系列 - 1000 进制）</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {results.network.map((item, idx) => (
                                        <ResultCard key={idx} item={item} isByte={false} />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 tracking-wide ml-1">数据储存（字节系列 - 1024 进制）</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {results.storage.map((item, idx) => (
                                        <ResultCard key={idx} item={item} isByte={true} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto animate-fade-in">
                        {/* 新布局：左侧（输入+结果），右侧（计算过程） */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* 左侧列：输入区域 + 结果 */}
                            <div className="lg:col-span-5 flex flex-col gap-6">
                                {/* 输入卡片 */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-5">传输参数设置</h3>

                                    {/* 文件大小 */}
                                    <div className="mb-6">
                                        <label className="block text-[13px] font-medium text-slate-700 mb-2">文件总大小</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={fileSize}
                                                onChange={(e) => setFileSize(e.target.value.replace(/[^0-9.]/g, ''))}
                                                className="w-28 text-2xl font-extrabold text-slate-900 bg-transparent outline-none border-b-2 border-slate-200 focus:border-indigo-500 transition-colors pb-1"
                                            />
                                            <CustomSelect
                                                value={fileUnit}
                                                onChange={setFileUnit}
                                                options={['B', 'KB', 'MB', 'GB', 'TB']}
                                                variant="secondary"
                                                size="md"
                                            />
                                        </div>
                                    </div>

                                    {/* 传输速率 */}
                                    <div>
                                        <label className="block text-[13px] font-medium text-slate-700 mb-2">传输速率</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={speedValue}
                                                onChange={(e) => setSpeedValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                                className="w-28 text-2xl font-extrabold text-slate-900 bg-transparent outline-none border-b-2 border-slate-200 focus:border-indigo-500 transition-colors pb-1"
                                            />
                                            <CustomSelect
                                                value={speedUnit}
                                                onChange={setSpeedUnit}
                                                options={['bps', 'Kbps', 'Mbps', 'Gbps', 'B/s', 'KB/s', 'MB/s', 'GB/s']}
                                                variant="primary"
                                                size="md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 结果卡片 */}
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden flex-1 min-h-[160px]">
                                    <div className="relative z-10 h-full flex flex-col justify-center">
                                        <span className="text-sm font-medium text-slate-300 mb-2">预计传输耗时</span>
                                        <div className="text-4xl lg:text-5xl font-extrabold tabular-nums leading-tight">
                                            {timeResult || '---'}
                                        </div>
                                    </div>
                                    <Zap className="absolute -right-8 -bottom-8 h-40 w-40 text-slate-700 rotate-12 opacity-60" />
                                </div>
                            </div>

                            {/* 右侧列：计算过程 */}
                            <div className="lg:col-span-7">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                        <Activity className="h-4 w-4 text-slate-700" />
                                        <h3 className="text-sm font-semibold text-slate-800">计算过程详情</h3>
                                    </div>

                                    {calcSteps ? (
                                        <div className="p-5 space-y-4 text-[13px]">
                                            {/* 步骤1 */}
                                            <div className="bg-slate-50 rounded-xl p-4">
                                                <div className="font-semibold text-slate-800 mb-2">步骤 1：计算数据总量</div>
                                                <div className="font-mono text-slate-900 flex flex-wrap items-center gap-1.5">
                                                    <span>{fileSize} {fileUnit}</span>
                                                    <span className="text-slate-400">×</span>
                                                    <span>1024<sup>{fileUnit === 'KB' ? '1' : fileUnit === 'MB' ? '2' : fileUnit === 'GB' ? '3' : fileUnit === 'TB' ? '4' : '0'}</sup></span>
                                                    <span className="text-slate-400">× 8 =</span>
                                                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">{calcSteps.bits}</span>
                                                    <span>bits</span>
                                                </div>
                                                <div className="text-slate-500 mt-2 text-[12px]">换算公式：字节 × 1024^n × 8 = 比特数</div>
                                            </div>

                                            {/* 步骤2 */}
                                            <div className="bg-slate-50 rounded-xl p-4">
                                                <div className="font-semibold text-slate-800 mb-2">步骤 2：转换传输速率</div>
                                                <div className="font-mono text-slate-900 flex flex-wrap items-center gap-1.5">
                                                    <span>{speedValue} {speedUnit}</span>
                                                    <span className="text-slate-400">=</span>
                                                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">{calcSteps.speed}</span>
                                                    <span>bps</span>
                                                </div>
                                                <div className="text-slate-500 mt-2 text-[12px]">网络单位：1 Kbps = 1000 bps，1 Mbps = 1,000,000 bps</div>
                                            </div>

                                            {/* 步骤3 */}
                                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                                <div className="font-semibold text-emerald-800 mb-2">步骤 3：计算传输时间</div>
                                                <div className="font-mono text-slate-900 flex flex-wrap items-center gap-1.5">
                                                    <span>时间 = 数据量 ÷ 速率 =</span>
                                                    <span>{calcSteps.bits} ÷ {calcSteps.speed}</span>
                                                    <span className="text-slate-400">=</span>
                                                    <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-semibold">{calcSteps.result}</span>
                                                    <span>秒</span>
                                                </div>
                                                <div className="text-emerald-700 mt-2 text-[12px] font-medium">✓ 换算后约为 {timeResult}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            请输入文件大小和传输速率，计算过程将在此显示
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitConverter;
