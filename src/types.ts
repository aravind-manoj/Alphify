export interface Conversation {
    id: string;
    title: string;
    timestamp: Date;
    messages: Message[];
}

export interface Model {
    id: string;
    name: string;
    description: string;
}

export interface HeaderProps {
    models: Model[];
    currentModel: string;
    currentTitle: string;
    conversations: Conversation[];
    conversationID: React.MutableRefObject<string>;
    isNewChat: boolean;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onSelectModel: (id: string) => void;
    onItemRemove: (id: string) => void;
}

export interface HomeProps {
    homeSection: React.RefObject<HTMLDivElement>;
}

export interface ChatContainerProps {
    messages: Message[];
}

export interface InputContainerProps {
    isGenerating: boolean;
    currentModel: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    message: string;
    files: File[];
    setMessage: React.Dispatch<React.SetStateAction<string>>;
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
    onSendMessage: () => Promise<void>;
    onStopGeneration: () => Promise<void>;
}

export interface Message {
    id: string;
    content: { text: string, files: File[] };
    isUser: boolean;
    isStreaming?: boolean;
    error?: boolean;
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

export interface Settings {
    language: string;
    theme: "light" | "dark" | "system";
    fontFamily: string;
    fontSize: number;
    codeBlockTheme: string;
    sendWithEnter: boolean;
    enableMarkdown: boolean;
    enableFileUploads: boolean;
    enableAutoComplete: boolean;
    enableSpellCheck: boolean;
    geminiApiKey: string;
}