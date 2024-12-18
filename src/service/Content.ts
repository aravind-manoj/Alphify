import Browser, { runtime } from 'webextension-polyfill';
import { patternSingleQuotes, patternDoubleQuotes, patternUndoSignal, patternRedoSignal } from './Background';
import { TextMessage } from '../types';
import { StorageResult } from '../types';

const startup = async () => {
    const result = await Browser.storage.local.get('isActive') as StorageResult;
    await Browser.runtime.sendMessage({ type: 'toggle', isActive: result.isActive });
}
startup();

const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[type="text"], textarea');

const sendText = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const text = target.value;
    runtime.sendMessage({ type: 'textChange', key: "", value: text });
};

const sendExecute = async (event: Event) => {
    if ((await Browser.storage.local.get('isActive') as StorageResult).isActive) {
        const text = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
        if (patternSingleQuotes.test(text) || patternDoubleQuotes.test(text)) {
            const element = document.createElement('div');
            document.body.appendChild(element);
            const original = (event.target as HTMLInputElement | HTMLTextAreaElement).style.outlineColor;
            (event.target as HTMLInputElement | HTMLTextAreaElement).style.outlineColor = "rgb(134 76 206)";
            element.textContent = "iFy is thinking...";
            element.style.position = 'fixed';
            element.style.top = '0';
            element.style.right = '0';
            element.style.borderRadius = '0 0 0 10px';
            element.style.backgroundColor = 'rgb(134 76 206)';
            element.style.padding = '12px 20px';
            element.style.zIndex = '1000';
            element.style.pointerEvents = 'none';
            element.style.fontFamily = '"Helvetica Neue", Arial, sans-serif';
            element.style.fontWeight = '600';
            element.style.color = 'white';
            runtime.sendMessage({ type: 'execute', key: "", value: text }).then((response: any) => {
                (event.target as HTMLInputElement | HTMLTextAreaElement).style.outlineColor = original;
                document.body.removeChild(element);
                let cursorPos = (event.target as HTMLInputElement | HTMLTextAreaElement).selectionStart;
                let beforeCursor = text.substring(0, cursorPos!);
                let afterCursor = text.substring(cursorPos!);
                if (response.type === "textUpdate") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (beforeCursor + afterCursor).replace((response as TextMessage).key, (response as TextMessage).value);
                    (event.target as HTMLInputElement | HTMLTextAreaElement).selectionStart = (event.target as HTMLInputElement | HTMLTextAreaElement).selectionEnd = text.indexOf((response as TextMessage).key) + (response as TextMessage).value.length;
                }
                if (response.type === "error") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (beforeCursor + afterCursor).replace((response as TextMessage).key, "");
                    (event.target as HTMLInputElement | HTMLTextAreaElement).selectionStart = (event.target as HTMLInputElement | HTMLTextAreaElement).selectionEnd = text.indexOf((response as TextMessage).key);
                    alert(response.value);
                }
            });
        }
        if (patternUndoSignal.test(text)) {
            runtime.sendMessage({ type: 'undo', key: "", value: text }).then((response: any) => {
                let cursorPos = (event.target as HTMLInputElement | HTMLTextAreaElement).selectionStart;
                let beforeCursor = text.substring(0, cursorPos!);
                let afterCursor = text.substring(cursorPos!);
                if (response.type === "undo") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (response as TextMessage).value;
                }
                if (response.type === "error") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (beforeCursor + afterCursor).replace((response as TextMessage).key, "");
                    alert(response.value);
                }
            });
        }
        if (patternRedoSignal.test(text)) {
            runtime.sendMessage({ type: 'redo', key: "", value: text }).then((response: any) => {
                if (response.type === "redo") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (response as TextMessage).value;
                }
                if (response.type === "error") {
                    (event.target as HTMLInputElement | HTMLTextAreaElement).value = (event.target as HTMLInputElement | HTMLTextAreaElement).value.replace((response as TextMessage).key, "");
                    alert(response.value);
                }
            });
        }
    }
}

inputs.forEach(input => {
    input.addEventListener('input', sendText);
    input.addEventListener('paste', sendText);
    input.addEventListener('keydown', (event: any) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
            sendText(event);
        }
        if (event.key === "Enter") {
            sendExecute(event);
        }
    });
});

export { };
