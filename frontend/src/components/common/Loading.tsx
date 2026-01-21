import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    fullscreen?: boolean;
    className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    text = '加载中...',
    size = 'md',
    fullscreen = false,
    className
}) => {
    const iconSizes = { sm: 'h-6 w-6', md: 'h-12 w-12', lg: 'h-16 w-16' };
    const textSizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-xl' };

    const content = (
        <div className={cn('flex flex-col items-center justify-center space-y-4', fullscreen ? 'h-screen' : 'h-64', className)}>
            <RefreshCw className={cn(iconSizes[size], 'text-blue-600 animate-spin')} />
            {text && <p className={cn(textSizes[size], 'font-bold text-slate-700')}>{text}</p>}
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                {content}
            </div>
        );
    }
    return content;
};
