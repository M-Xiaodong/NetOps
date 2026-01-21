import { useState, useCallback } from 'react';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface Message {
    id: string;
    type: MessageType;
    title: string;
    content: string;
    duration?: number;
}

export function useMessage() {
    const [messages, setMessages] = useState<Message[]>([]);

    const showMessage = useCallback((type: MessageType, title: string, content: string, duration: number = 3000) => {
        const id = `msg-${Date.now()}-${Math.random()}`;
        const message: Message = { id, type, title, content, duration };
        setMessages(prev => [...prev, message]);
        if (duration > 0) {
            setTimeout(() => hideMessage(id), duration);
        }
        return id;
    }, []);

    const hideMessage = useCallback((id: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return { messages, showMessage, hideMessage, clearMessages };
}
