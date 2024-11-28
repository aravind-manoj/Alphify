import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Browser from 'webextension-polyfill';
import { v4 as uuid4 } from 'uuid';
import toast, { Toaster } from 'react-hot-toast';
import { geminiResponseText, chromeResponseText, geminiResponseStream, chromeResponseStream } from '../service/ai';
import { Message, Conversation, Model } from '../types';
import Header from './components/Header';
import Home from './components/Home';
import ChatContainer from './components/ChatContainer';
import InputContainer from './components/InputContainer';

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentModel, setCurrentModel] = useState("");
    const [models, setModels] = useState<Model[]>([]);
    const [currentTitle, setCurrentTitle] = useState("New Chat");

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const homeSection = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const userInterruptRef = useRef<boolean>(false);

    const db = useRef<IDBDatabase>();
    const db_request = useRef<IDBOpenDBRequest>();
    const conversationID = useRef<string>("");

    useEffect(() => {
        initDB();
        fetchConversations();
        fetchModels();
    }, []);

    useEffect(() => {
        if (currentModel === "chrome-ai") {
            if (fileInputRef.current) {
                fileInputRef.current.disabled = true;
            }
        }
    }, [currentModel]);

    const initDB = () => {
        db_request.current = indexedDB.open("AlphifyDB", 1);
        db_request.current.onerror = (event) => {
            console.error("Error opening database:", event);
        };
        db_request.current.onupgradeneeded = (event) => {
            db.current = (event.target as IDBOpenDBRequest).result as IDBDatabase;
            db.current.createObjectStore("conversations", { keyPath: "id" });
        }
        db_request.current.onsuccess = (event) => {
            db.current = (event.target as IDBOpenDBRequest).result as IDBDatabase;
        };
    };

    const initConversation = async (prompt: string) => {
        let titlePrompt = "system: You have to create a description for the given prompt. It must be meaningful and contain atleast 3 words or upto 6 words max. The description should be in the form of a single sentence. Do not include any other text, emojis or markdown formatting. Also no need to . at end.\n\n";
        titlePrompt += `user: ${prompt}\n`;
        let response;
        if (currentModel === "chrome-ai") {
            response = await chromeResponseText(titlePrompt);
        } else {
            response = await geminiResponseText(titlePrompt);
        }
        let title = response?.status ? response?.message : "Untitled";
        setCurrentTitle(title);
        conversationID.current = uuid4();
        const conversationDB = db.current?.transaction("conversations", "readwrite").objectStore("conversations");
        conversationDB?.add({ id: conversationID.current, title: title, timestamp: new Date(), messages: [] });
    }

    const fetchConversations = async () => {
        const dbr: IDBOpenDBRequest = indexedDB.open("AlphifyDB", 1);
        dbr.onsuccess = (event) => {
            (event.target as IDBOpenDBRequest).result.transaction("conversations", "readwrite").objectStore("conversations").getAll().onsuccess = (event) => {
                const data = (event.target as IDBRequest).result;
                setConversations(data);
            }
        }
    };

    const fetchModels = async () => {
        if (window.ai) {
            const ai = (await window.ai.languageModel.capabilities()).available;
            if (ai === "readily") {
                setModels(prev => [...prev, { id: "chrome-ai", name: "Chrome AI", description: "Inbuilt AI on Chrome" }]);
            }
        }
        Browser.storage.local.get("extension_settings").then((result: any) => {
            if (result.extension_settings) {
                const settings = JSON.parse(result.extension_settings as string);
                if (settings.geminiApiKey) {
                    setModels(prev => [
                        ...prev,
                        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast, Versatile Performance" },
                        { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8b", description: "High Volume & Basic Tasks" },
                        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced Reasoning Tasks" }
                    ]);
                }
            }
        });
    };

    const updateConversationsDB = async (updatedMessages: Message[]) => {
        const conversationDB = db.current?.transaction("conversations", "readwrite").objectStore("conversations");
        if (conversationDB) {
            conversationDB.get(conversationID.current).onsuccess = (event) => {
                const data = (event.target as IDBRequest).result;
                if (data) {
                    data.messages = updatedMessages;
                    const res = conversationDB.put(data);
                    res.onerror = (event) => {
                        console.error("Error updating conversation:", event);
                    };
                    res.onsuccess = () => {
                        return;
                    };
                }
            }
        }
    };

    const handleStopGeneration = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            userInterruptRef.current = true;
            setIsGenerating(false);
            setMessages(prev => {
                const update = prev.map((msg, idx) => idx === prev.length - 1 ? { ...msg, isStreaming: false } : msg);
                updateConversationsDB(update);
                return update;
            });
        }
    };

    const handleSendMessage = async () => {
        if ((!message.trim() && files.length === 0) || isGenerating) return;
        if (!models.find(m => m.id === currentModel)) {
            toast.error("No model selected, Please select a model first.", { duration: 3000 });
            return;
        }
        const messageId = Date.now().toString();
        setIsGenerating(true);
        if (textareaRef.current) {
            textareaRef.current.style.color = "#909090";
        }
        abortControllerRef.current = new AbortController();
        userInterruptRef.current = false;
        let content = message.trim();
        if (files.length > 0) {
            content += "\n\nAttached files:\n" + files.map(f => `- ${f.name}`).join("\n");
        }
        if (isFirstMessage) {
            homeSection.current?.classList.add("hidden");
            setIsFirstMessage(false);
            initConversation(content);
        }
        setMessages(prev => {
            const update = [
                ...prev,
                { id: `user-${messageId}`, content: content, isUser: true, isStreaming: false, error: false },
                { id: `assistant-${messageId}`, content: "", isUser: false, isStreaming: true, error: false }
            ];
            updateConversationsDB(update);
            return update;
        });
        let prompt = "system: You are Alphify, an AI text assistant designed to provide helpful, informative, and accurate responses based on user input. Your goal is to assist users by offering relevant informations. Do not include prompt roles like 'user:' or 'assistant:' in response.\n\n";
        for await (const text of messages) {
            prompt += `${text.isUser ? "user" : "assistant"}: ${text.content}\n\n`;
        }
        prompt += `user: ${content}`;
        try {
            if (currentModel === "chrome-ai") {
                const responseStream = chromeResponseStream(prompt, abortControllerRef.current.signal);
                for await (const chunk of responseStream) {
                    if (abortControllerRef.current.signal.aborted) break;
                    const res = JSON.parse(chunk);
                    if (res.status) {
                        setMessages(prev => {
                            const update = prev.map(msg => msg.id === `assistant-${messageId}` ? { ...msg, content: res.message } : msg);
                            updateConversationsDB(update);
                            return update;
                        });
                    } else {
                        setMessages(prev => {
                            const update = prev.filter(msg => msg.id !== `assistant-${messageId}`);
                            updateConversationsDB(update);
                            return update;
                        });
                        setMessages(prev => {
                            const update = [...prev, { id: `error-${messageId}`, content: `*${res.message}*`, isUser: false, isStreaming: false, error: true }];
                            updateConversationsDB(update);
                            return update;
                        });
                    }
                }
            } else {
                const responseStream = geminiResponseStream(currentModel, prompt, files, abortControllerRef.current.signal);
                let response = "";
                for await (const chunk of responseStream) {
                    if (abortControllerRef.current.signal.aborted) break;
                    const res = JSON.parse(chunk);
                    if (res.status) {
                        response += res.message;
                        setMessages(prev => {
                            const update = prev.map(msg => msg.id === `assistant-${messageId}` ? { ...msg, content: response } : msg);
                            updateConversationsDB(update);
                            return update;
                        });
                    } else {
                        setMessages(prev => {
                            const update = prev.filter(msg => msg.id !== `assistant-${messageId}`);
                            updateConversationsDB(update);
                            return update;
                        });
                        setMessages(prev => {
                            const update = [...prev, { id: `error-${messageId}`, content: `*${res.message}*`, isUser: false, isStreaming: false, error: true }];
                            updateConversationsDB(update);
                            return update;
                        });
                    }
                }
            }
            if (!abortControllerRef.current.signal.aborted) {
                setMessages(prev => {
                    const update = prev.map(msg => msg.id === `assistant-${messageId}` ? { ...msg, isStreaming: false } : msg);
                    updateConversationsDB(update);
                    return update;
                });
            }
        } catch (error) {
            if (!abortControllerRef.current?.signal.aborted) {
                setMessages(prev => {
                    const update = [...prev, { id: `error-${messageId}`, content: "*User interupted while processing.*", isUser: false, isStreaming: false, error: true }];
                    updateConversationsDB(update);
                    return update;
                });
                userInterruptRef.current = false;
            } else {
                console.error(error);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setIsGenerating(false);
                setMessage("");
                setFiles([]);
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.color = "#ffffff";
                };
            }
            abortControllerRef.current = null;
        }
    };

    const handleNewChat = async () => {
        await handleStopGeneration();
        while (userInterruptRef.current) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        fetchConversations();
        setIsFirstMessage(true);
        setMessages([]);
        conversationID.current = "";
        setCurrentTitle("New Chat");
        setMessage("");
        setFiles([]);
        homeSection.current?.classList.remove("hidden");
        textareaRef.current?.focus();
    };

    const handleSelectConversation = async (id: string) => {
        await fetchConversations();
        const conversation = conversations.find(c => c.id === id);
        if (conversation) {
            await handleStopGeneration();
            while (userInterruptRef.current) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            setMessages([]);
            await new Promise(resolve => setTimeout(resolve, 100));
            setIsFirstMessage(false);
            setMessages(conversation.messages);
            conversationID.current = id;
            setMessage("");
            setFiles([]);
            setCurrentTitle(conversation.title);
            homeSection.current?.classList.add("hidden");
            textareaRef.current?.focus();
        }
    };

    const handleSelectModel = (id: string) => {
        toast.promise(
            new Promise<void>(resolve => { setCurrentModel(id); resolve() }),
            {
                loading: "Switching Model...",
                success: <b>Switched to {models.find(m => m.id === id)?.name}.</b>,
                error: <b>Failed to switch model.</b>,
            }, { duration: 1500 }
        );
        textareaRef.current?.focus();
    };

    const handleItemRemove = async (id: string) => {
        const conversation = conversations.find(c => c.id === id);
        if (conversation) {
            const conversationDB = db.current?.transaction("conversations", "readwrite").objectStore("conversations");
            conversationDB?.delete(id);
            await fetchConversations();
            console.log("Conversation ID: ", conversationID.current);
            console.log("Call ID: ", id);
            if (conversationID.current === id) {
                handleNewChat();
            }
            toast.success("Deleted Successfully.", { duration: 1000 });
            textareaRef.current?.focus();
        }
    };

    return (
        <>
            <Toaster
                position="top-center"
                reverseOrder={false}
            />
            <Header
                models={models}
                currentModel={currentModel}
                currentTitle={currentTitle}
                conversations={conversations}
                conversationID={conversationID}
                onNewChat={handleNewChat}
                onSelectConversation={handleSelectConversation}
                onSelectModel={handleSelectModel}
                onItemRemove={handleItemRemove}
            />
            <Home homeSection={homeSection} />
            <ChatContainer messages={messages} />
            <InputContainer
                isGenerating={isGenerating}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                message={message}
                files={files}
                setMessage={setMessage}
                setFiles={setFiles}
                onSendMessage={handleSendMessage}
                onStopGeneration={handleStopGeneration}
            />
        </>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);