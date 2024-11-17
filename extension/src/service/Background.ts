import Browser, { runtime } from 'webextension-polyfill';
import { geminiResponseTextOnly } from './ai';
import { TextMessage, ToggleMessage } from '../types';

const data_history: any = [];
const chat_history: any = [];
const chat_history_bkp: any = [];

var idx = 0;
var data: string = "";
var isActive: boolean = false;

const patternSingleQuotes = /\bi\n*f\n*y\n*\(\s*'[\s\S]*?'\s*\)/;
const patternDoubleQuotes = /\bi\n*f\n*y\n*\(\s*"[\s\S]*?"\s*\)/;
const patternUndoSignal = /\bi\n*f\n*y\n*\(\s*\-\s*\)/;
const patternRedoSignal = /\bi\n*f\n*y\n*\(\s*\+\s*\)/;

const queryFormat = (char: string, c: number) => {
    let index: number = 0;
    if (data.search(patternSingleQuotes) != -1){
        index = data.search(patternSingleQuotes);
    }
    if (data.search(patternDoubleQuotes) != -1){
        index = data.search(patternDoubleQuotes);
    }
    if (data.search(patternUndoSignal) != -1){
        index = data.search(patternUndoSignal);
    }
    if (data.search(patternRedoSignal) != -1){
        index = data.search(patternRedoSignal);
    }
    let _data = data.substring(index);
    let post_text_i = _data.split("i")[1].split("f")[0];
    let post_text_f = _data.split("f")[1].split("y")[0];
    let post_text_y = _data.split("y")[1].split("(")[0];
    let pre_query = _data.split(`i${post_text_i}f${post_text_f}y${post_text_y}(`)[1].split(`${char}`)[0];
    let post_query = _data.split(`i${post_text_i}f${post_text_f}y${post_text_y}(`)[1].split(`${char}`)[c].split(")")[0];
    return [post_text_i, post_text_f, post_text_y, pre_query, post_query];
}

const apiRequest = async (text: string) => {
    try{
        let prompt = "You are Alphify, an AI text assistant designed to provide helpful, informative, and accurate responses based on user input. Your goal is to assist users by offering relevant and clear information.\n";
        chat_history.forEach((element: string[]) => {
            prompt += `User: ${element[0]}\n Model: ${element[1]}\n`;
        });
        prompt += `User: ${text}`;
        const output = await geminiResponseTextOnly(prompt);
        if (output.status){
            const response = output.message;
            chat_history.push([text, response])
            return { status: true, message: response };
        }
        return { status: false, message: "Something went wrong. Please try again." };
    }catch (e: any){
        return e.message.includes("Resource has been exhausted") ? { status: false, message: "API quota exceeded. Please try again." } : { status: false, message: "API error occurred. Please try again." };
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
            const [i0, i1, i2, i3, i4] = queryFormat('"', 2);
            let query = data.split(`i${i0}f${i1}y${i2}(`)[1].trim().split('"')[1].split('"')[0];
            if (query.length > 0){
                const response: any = await apiRequest(query.replace("\n", ""));
                if (response.status){
                    data_history[idx] = (message as TextMessage).value.replace(`i${i0}f${i1}y${i2}(${i3}"${query}"${i4})`, "");
                    data_history[++idx] = (message as TextMessage).value.replace(`i${i0}f${i1}y${i2}(${i3}"${query}"${i4})`, response.message);
                    for (let i = data_history.length - 1; i > idx; i--) {
                        data_history.pop();
                    }
                    return { type: "textUpdate", key: `i${i0}f${i1}y${i2}(${i3}"${query}"${i4})`, value: response.message };
                }else{
                    return { type:"error", key: `i${i0}f${i1}y${i2}(${i3}"${query}"${i4})`, value: response.message };
                }
            }
        }
        if (patternSingleQuotes.test(data)){
            const [i0, i1, i2, i3, i4] = queryFormat("'", 2);
            let query = data.split(`i${i0}f${i1}y${i2}(`)[1].trim().split("'")[1].split("'")[0];
            data_history[data_history.length] = (message as TextMessage).value.replace(`i${i0}f${i1}y${i2}(${i3}'${query}'${i4})`, "");
            idx++;
            if (query.length > 0){
                const response: any = await apiRequest(query.replace("\n", ""));
                if (response.status){
                    data_history[data_history.length] = (message as TextMessage).value.replace(`i${i0}f${i1}y${i2}(${i3}'${query}'${i4})`, response.message);
                    idx++;
                    return { type: "textUpdate", key: `i${i0}f${i1}y${i2}(${i3}'${query}'${i4})`, value: response.message };
                }else{
                    return { type:"error", key: `i${i0}f${i1}y${i2}(${i3}'${query}'${i4})`, value: response.message };
                }
            }
        }
    }
    if ((message as TextMessage).type === "undo"){
        const [i0, i1, i2, i3, i4] = queryFormat("-", 1);
        if (data_history[idx - 1] != undefined){
            chat_history_bkp.push(chat_history.pop());
            return { type: "undo", key: "", value: data_history[--idx] };
        }else{
            return { type: "error", key: `i${i0}f${i1}y${i2}(${i3}-${i4})`, value: "Operation can't be performed. No more undos available."};
        }
    }
    if ((message as TextMessage).type === "redo"){
        const [i0, i1, i2, i3, i4] = queryFormat("+", 1);
        if (data_history[idx + 1] != undefined){
            chat_history.push(chat_history_bkp.pop());
            return { type: "redo", key: "", value: data_history[++idx] };
        }else{
            return { type: "error", key: `i${i0}f${i1}y${i2}(${i3}+${i4})`, value: "Operation can't be performed. No more redos available."};
        }
    }
    return false;
});

export { patternSingleQuotes, patternDoubleQuotes, patternUndoSignal, patternRedoSignal };
export type { TextMessage };
