import Browser from 'webextension-polyfill';
import { GoogleGenerativeAI } from "@google/generative-ai";

async function fileToGenerativePart(file: File) {
    const data = await file.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(data).toString('base64'),
            mimeType: file.type
        }
    };
}

async function readFileContent(file: File): Promise<string> {
    if (file.type.startsWith('image/')) {
        return `[Image: ${file.name}]`;
    }
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.html') || file.name.endsWith('.css')) {
        const text = await file.text();
        return `Content of ${file.name}:\n\`\`\`\n${text}\n\`\`\``;
    }
    return `[File: ${file.name}, Type: ${file.type || 'unknown'}, Size: ${(file.size / 1024).toFixed(2)}KB]`;
}

export async function geminiResponseTextOnly(prompt: string) {
    try {
        const GEMINI_API_KEY: any = Browser.storage.local.get("gemini_api_key");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return { status: true, message: result.response.text() };
    } catch (error) {
        return { status: false, message: 'Sorry, I encountered an error while processing your request.' };
    }
}

export async function* geminiResponseStream(prompt: string, files: File[], signal?: AbortSignal): AsyncGenerator<string> {
    try {
        const GEMINI_API_KEY: any = await Browser.storage.local.get("gemini_api_key");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        if (files.length > 0) {
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            const otherFiles = files.filter(file => !file.type.startsWith('image/'));
            let fullPrompt = prompt;
            if (otherFiles.length > 0) {
                const fileContents = await Promise.all(otherFiles.map(readFileContent));
                fullPrompt += '\n\nAttached files:\n' + fileContents.join('\n\n');
            }
            if (imageFiles.length > 0) {
                const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
                const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
                const result = await visionModel.generateContentStream([fullPrompt, ...imageParts]);
                for await (const chunk of result.stream) {
                    if (signal?.aborted) return;
                    const chunkText = chunk.text();
                    if (chunkText) yield chunkText;
                }
                return;
            }
        }
        const result = await model.generateContentStream(prompt, { signal });
        for await (const chunk of result.stream) {
            if (signal?.aborted) return;
            const chunkText = chunk.text();
            if (chunkText) yield chunkText;
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return;
        }
        yield 'Sorry, I encountered an error while processing your request.';
    }
}