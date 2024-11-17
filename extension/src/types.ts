export interface Message {
    id: string;
    content: string;
    isUser: boolean;
    isStreaming?: boolean;
}

export interface StorageResult {
    isActive?: boolean;
}

export interface TextMessage {
    key: string;
    type: string;
    value: string;
}

export interface ToggleMessage {
    type: string;
    isActive: boolean;
}