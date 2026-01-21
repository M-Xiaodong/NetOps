import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Message, MessageType } from '../../hooks/useMessage';

interface MessageItemProps {
    message: Message;
    onClose: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onClose }) => {
    const icons: Record<MessageType, React.ReactNode> = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
    };

    const styles: Record<MessageType, string> = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-orange-50 border-orange-200 text-orange-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
        <div className={cn('flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300', styles[message.type])}>
            <div className="flex-shrink-0 mt-0.5">{icons[message.type]}</div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{message.title}</p>
                <p className="text-sm mt-1 opacity-90">{message.content}</p>
            </div>
            <button onClick={() => onClose(message.id)} className="flex-shrink-0 hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

interface MessageContainerProps {
    messages: Message[];
    onClose: (id: string) => void;
}

export const MessageContainer: React.FC<MessageContainerProps> = ({ messages, onClose }) => {
    if (messages.length === 0) return null;
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
            {messages.map(message => (
                <MessageItem key={message.id} message={message} onClose={onClose} />
            ))}
        </div>
    );
};
