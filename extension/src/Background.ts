import Browser, { runtime } from 'webextension-polyfill';

const patternSingleQuotes = /\bify\('.*?'\)/;
const patternDoubleQuotes = /\bify\(".*?"\)/;

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

const apiRequest = async (text: string) => {
    const res = await fetch(`https://alphify-api.vercel.app/content?text=${text}`);
    if (res.ok) {
        const jsonData = await res.json();
        return jsonData.status === "success" ? jsonData : false;
    }
    return false;
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
                const api: any = await apiRequest(query);
                if (api){
                    return { type: "textUpdate", key: `ify("${query}")`, value: api.message }
                }
            }
        }
        if (patternSingleQuotes.test(data)){
            let query = data.split("ify('")[1].split("'")[0].replace("\n", "");
            if (query.length > 0){
                const api: any = await apiRequest(query);
                if (api){
                    return { type: "textUpdate", key: `ify('${query}')`, value: api.message }
                }
            }
        }
    }
    return false;
});

export { patternSingleQuotes, patternDoubleQuotes };
export type { TextMessage };
