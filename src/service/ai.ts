import Browser from 'webextension-polyfill';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function geminiResponseText(prompt: string) {
    try {
        const settings: Record<string, unknown> = await Browser.storage.local.get("extension_settings");
        const records = JSON.parse(settings.extension_settings as string);
        if (records.geminiApiKey) {
            const genAI = new GoogleGenerativeAI(records.geminiApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return { status: true, message: result.response.text() };
        } else {
            return { status: false, message: "API key not found. Please set it in the extension settings." };
        }
    } catch (error) {
        return { status: false, message: "Sorry, I encountered an error while processing your request." };
    }
}

export async function chromeResponseText(prompt: string) {
    try {
        if (window.ai) {
            const writer = await window.ai.writer.create({
                tone: "as-is",
                length: "as-is",
                format: "markdown",
                sharedContext: "You are an AI Chatbot"
            });
            const result = await writer.write(prompt);
            return { status: true, message: result };
        }
    } catch (error) {
        console.error("Error: ", error);
        return { status: false, message: "Sorry, I encountered an error while processing your request." };
    }
}

export async function* geminiResponseStream(selectedModel: string, prompt: string, files: File[], signal?: AbortSignal): AsyncGenerator<string> {
    try {
        const settings: Record<string, unknown> = await Browser.storage.local.get("extension_settings");
        const records = JSON.parse(settings.extension_settings as string);
        if (records.geminiApiKey) {
            const genAI = new GoogleGenerativeAI(records.geminiApiKey as string);
            const model = genAI.getGenerativeModel({ model: selectedModel });
            let result;
            if (files.length > 0) {
                const uploads = await Promise.all(
                    files.map(file =>
                        new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                resolve({
                                    inlineData: {
                                        data: reader.result?.toString().split(",")[1],
                                        mimeType: file.type
                                    }
                                });
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        })
                    )
                );
                // @ts-ignore
                result = await model.generateContentStream([prompt, ...uploads]);
            } else {
                result = await model.generateContentStream(prompt);
            }
            for await (const response of result.stream) {
                if (signal?.aborted) return;
                const chunk = response.text();
                if (chunk) yield JSON.stringify({ status: true, message: chunk });
            }
        } else {
            yield JSON.stringify({ status: false, message: "API key not found. Please set it in the extension settings." });
        }
    } catch (error) {
        console.error(error);
        if (error instanceof Error && error.name === "AbortError") {
            return;
        }
        yield JSON.stringify({ status: false, message: "API error occurred while processing your request." });
    }
}

export async function* chromeResponseStream(prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
    try {
        if (window.ai) {
            const writer = await window.ai.writer.create({
                tone: "as-is",
                length: "as-is",
                format: "markdown",
                sharedContext: "You are an AI Chatbot"
            });
            const stream = await writer.writeStreaming(prompt);
            for await (const chunk of stream) {
                if (signal?.aborted) return;
                if (chunk) yield JSON.stringify({ status: true, message: chunk });
            }
        }
    } catch (error) {
        console.error("Error: ", error);
        if (error instanceof Error && error.name === "AbortError") {
            return;
        }
        yield JSON.stringify({ status: false, message: "An error occurred while processing your request." });
    }
}