import Browser from 'webextension-polyfill';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function fileToGenerativePart(file: File) {
    const data = await file.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(data).toString("base64"),
            mimeType: file.type
        }
    };
}

async function readFileContent(file: File): Promise<string> {
    if (file.type.startsWith("image/")) {
        return `[Image: ${file.name}]`;
    }
    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json") || file.name.endsWith(".csv") || file.name.endsWith(".js") || file.name.endsWith(".ts") || file.name.endsWith(".html") || file.name.endsWith(".css")) {
        const text = await file.text();
        return `Content of ${file.name}:\n\`\`\`\n${text}\n\`\`\``;
    }
    return `[File: ${file.name}, Type: ${file.type || "unknown"}, Size: ${(file.size / 1024).toFixed(2)}KB]`;
}

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
            if (files.length > 0) {
                const imageFiles = files.filter(file => file.type.startsWith("image/"));
                const otherFiles = files.filter(file => !file.type.startsWith("image/"));
                let fullPrompt = prompt;
                if (otherFiles.length > 0) {
                    const fileContents = await Promise.all(otherFiles.map(readFileContent));
                    fullPrompt += "\n\nAttached files:\n" + fileContents.join("\n\n");
                }
                if (imageFiles.length > 0) {
                    const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
                    const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
                    const result = await visionModel.generateContentStream([fullPrompt, ...imageParts]);
                    for await (const response of result.stream) {
                        if (signal?.aborted) return;
                        const chunk = response.text();
                        if (chunk) yield JSON.stringify({ status: true, message: chunk });
                    }
                    return;
                }
            }
            const result = await model.generateContentStream(prompt);
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