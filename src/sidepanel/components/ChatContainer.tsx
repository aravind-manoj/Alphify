import { useEffect, useRef } from 'react';
import { ChatContainerProps } from '../../types';
import RenderResponse from '../utils/RenderResponse';

const ChatContainer: React.FC<ChatContainerProps> = ({
    messages
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="chat-container" ref={chatContainerRef}>
            {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.error ? "error" : msg.isUser ? "user" : "assistant"}`}>
                    {!msg.error &&
                        <div className="message-avatar">
                            {msg.isUser ? (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" /></svg>) : (<img src="logo.svg" alt="Assistant Logo" />)}
                        </div>}
                    <div className="message-content">
                        {msg.isUser ? (
                            msg.content
                        ) : (
                            <>
                                <RenderResponse content={msg.content} />
                                {msg.isStreaming && (
                                    <div className="loading-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default ChatContainer;