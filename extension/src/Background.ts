import Browser, { runtime } from 'webextension-polyfill';
import { GoogleGenerativeAI } from '@google/generative-ai';

const patternSingleQuotes = /\bify\('.*?'\)/;
const patternDoubleQuotes = /\bify\(".*?"\)/;

const GEMINI_API_KEY: any = Browser.storage.local.get("gemini_api_key");

type TextMessage = {
    key: string;
    type: string;
    value: string;
}

type ToggleMessage = {
    type: string;
    isActive: boolean;
}

let data: string = "";
let isActive: boolean = false;

const chat_history: any = [];

const apiRequest = async (text: string) => {
    try{
        var prompt = "You are Alphify, an AI text assistant designed to provide helpful, informative, and accurate responses based on user input. Your goal is to assist users by offering relevant and clear information without asking unnecessary questions or answering your own queries.\n";
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        chat_history.forEach((element: string[]) => {
            prompt += `User: ${element[0]}\n Model: ${element[1]}\n`;
        });
        prompt += `User: ${text}`;
        const output = await model.generateContent(prompt);
        console.log(output);
        if (output.response){
            const response = output.response.text();
            chat_history.push([text, response])
            return output.response ? { success: true, message: response } : { success: false, message: "Error occurred. Please try again later." };
        }
        return { success: false, message: "Something went wrong. Please try again." };
    }catch (e: any){
        console.log(e);
        return e.message.includes("Resource has been exhausted") ? { success: false, message: "API quota exceeded. Please try again." } : { success: false, message: "API error occurred. Please try again." };
    }
};

runtime.onMessage.addListener(async (message: unknown, sender, sendResponse) => {
    if ((message as ToggleMessage).type === 'toggle') {
        isActive = (message as ToggleMessage).isActive;
    }
    if (!isActive){
        return false;
    }
    if ((message as TextMessage).type === 'textChange') {
        data = (message as TextMessage).value;
    }
    if ((message as TextMessage).type === 'execute') {
        data = (message as TextMessage).value;
        if (patternDoubleQuotes.test(data)){
            let query = data.split('ify("')[1].split('"')[0].replace("\n", "");
            if (query.length > 0){
                const response: any = await apiRequest(query);
                if (response.success){
                    return { type: "textUpdate", key: `ify("${query}")`, value: response.message };
                }else{
                    return { type:"error", key: `ify("${query}")`, value: response.message };
                }
            }
        }
        if (patternSingleQuotes.test(data)){
            let query = data.split("ify('")[1].split("'")[0].replace("\n", "");
            if (query.length > 0){
                const response: any = await apiRequest(query);
                if (response.success){
                    return { type: "textUpdate", key: `ify('${query}')`, value: response.message };
                }else{
                    return { type:"error", key: `ify('${query}')`, value: response.message };
                }
            }
        }
    }
    return false;
});

export { patternSingleQuotes, patternDoubleQuotes };
export type { TextMessage };
