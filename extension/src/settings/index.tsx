import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import toast, { Toaster } from 'react-hot-toast';
import Browser from 'webextension-polyfill';

interface Settings {
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

const sections = [
    { id: "general", label: "General", icon: "" },
    { id: "models", label: "Models", icon: "" },
    { id: "conversations", label: "Conversations", icon: "" },
    { id: "privacy-policy", label: "Privacy Policy", icon: "" },
    { id: "about", label: "About", icon: "" }
];

const languages = [
    'English',
];

const fontFamilies = [
    'Default',
];

const codeThemes = [
    { id: "a11yDark", label: "A11y Dark" },
    { id: "atomDark", label: "Atom Dark" },
    { id: "dracula", label: "Dracula" },
    { id: "okaidia", label: "Okaidia" },
    { id: "oneDark", label: "One Dark" },
    { id: "oneLight", label: "One Light" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "twilight", label: "Twilight" },
    { id: "vscDarkPlus", label: "VS Code Dark'" },
    { id: "vs", label: "VS Code Light" },
    { id: "xonokai", label: "Xonokai" },
    { id: "zTouch", label: "Z Touch" }
];

const Settings = () => {
    const [settings, setSettings] = useState<Settings>({
        language: "English",
        geminiApiKey: '',
        theme: 'system',
        fontSize: 14,
        fontFamily: 'Inter',
        enableMarkdown: true,
        enableFileUploads: true,
        enableAutoComplete: true,
        enableSpellCheck: true,
        sendWithEnter: true,
        codeBlockTheme: 'A11y Dark',
    });
    const [activeSection, setActiveSection] = useState('general');
    const [chromeAIStatus, setChromeAIStatus] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const stored = await Browser.storage.local.get("extension_settings");
                console.log("stored: ", stored.extension_settings);
                if (stored.extension_settings) {
                    setSettings(JSON.parse(stored.extension_settings as string));
                } else {
                    handleSave();
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();
        fetchChromAIStatus();
    }, []);

    const fetchChromAIStatus = async () => {
        try {
            if (window.ai) {
                const ai = (await window.ai.languageModel.capabilities()).available;;
                setChromeAIStatus(ai === "readily" ? true : false);
            } else {
                setChromeAIStatus(false);
            }
        }
        catch (error) {
            setChromeAIStatus(false);
            console.error("Error: ", error);
        }
    };

    const handleSave = async () => {
        try {
            await Browser.storage.local.set({ extension_settings: JSON.stringify(settings) });
            chrome.sidePanel.setOptions({
                path: "panel.html",
                enabled: false
            });
            chrome.sidePanel.setOptions({
                path: "panel.html",
                enabled: true
            });
            // @ts-ignore
            chrome.windows.getCurrent(w => chrome.sidePanel.open({ windowId: w.id }))
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        }
    };

    const handleReset = () => {
        const defaultSettings: Settings = {
            language: "English",
            geminiApiKey: '',
            theme: 'system',
            fontSize: 14,
            fontFamily: 'Inter',
            enableMarkdown: true,
            enableFileUploads: true,
            enableAutoComplete: true,
            enableSpellCheck: true,
            sendWithEnter: true,
            codeBlockTheme: 'A11y Dark',
        };
        setSettings(defaultSettings);
        toast.success('Settings reset to default');
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <div className="settings-section">
                        <h2>General Settings</h2>
                        <div className="setting-item">
                            <label htmlFor="language">Language</label>
                            <select
                                id="language"
                                value={settings.language}
                                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                            >
                                {languages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="theme">Theme</label>
                            <select
                                id="theme"
                                value={settings.theme}
                                onChange={(e) => setSettings({ ...settings, theme: e.target.value as Settings['theme'] })}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="fontFamily">Font Family</label>
                            <select
                                id="fontFamily"
                                value={settings.fontFamily}
                                onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                            >
                                {fontFamilies.map(font => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </select>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="fontSize">Font Size ({settings.fontSize}px)</label>
                            <input
                                type="range"
                                id="fontSize"
                                min="12"
                                max="20"
                                value={settings.fontSize}
                                onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                            />
                        </div>
                        <div className="setting-item">
                        </div>
                        <br />
                        <div className="setting-item">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settings.sendWithEnter}
                                    onChange={(e) => setSettings({ ...settings, sendWithEnter: e.target.checked })}
                                />
                                Send message with Enter key
                            </label>
                        </div>
                        <div className="setting-item">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settings.enableMarkdown}
                                    onChange={(e) => setSettings({ ...settings, enableMarkdown: e.target.checked })}
                                />
                                Enable Markdown Formatting
                            </label>
                        </div>
                        <div className="setting-item">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settings.enableFileUploads}
                                    onChange={(e) => setSettings({ ...settings, enableFileUploads: e.target.checked })}
                                />
                                Enable File Uploads
                            </label>
                        </div>
                    </div>
                );
            case "models":
                return (
                    <div className="settings-section">
                        <div className="setting-item">
                            <h2>Chrome Inbuilt AI</h2>
                            <div className="chrome-ai-status">
                                <p>API Status: {chromeAIStatus ? "Available" : "Unavailable"}</p>
                                {chromeAIStatus ? <svg fill="#5cb46a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" /></svg> : <svg fill="#bb5757" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm79 143c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" /></svg>}
                            </div>
                            <p>Use Gemini Nano that is built into Chrome browser.</p>
                        </div>
                        <div className="setting-item">
                            <h2>Gemini Models</h2>
                            <label htmlFor="apiKey">Gemini API Key</label>
                            <div className="api-key-input">
                                <input
                                    type="password"
                                    id="apiKey"
                                    value={settings.geminiApiKey}
                                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                    placeholder="Enter your API key"
                                />
                                <a
                                    href="https://makersuite.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-button"
                                >
                                    Get API Key
                                </a>
                            </div>
                            <p>Use Gemini API Key for free Gemini AI models.</p>
                        </div>
                    </div>
                );
            case 'about':
                return (
                    <div className="settings-section">
                        <h2>About</h2>
                        <div className="about-content">
                            <p>Version: 1.0.0</p>
                            <p>alphify.io</p>
                            <p>© 2024 All rights reserved</p>
                            <div className="about-links">
                                <a href="#" className="link-button">Terms of Service</a>
                                <a href="#" className="link-button">Documentation</a>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="settings-page">
            <Toaster
                position="top-center"
                reverseOrder={false}
            />
            <div className="settings-sidebar">
                <div className="settings-sidebar-header">
                    <img src="/logo.svg" alt="Alphify Logo" className="logo" />
                    <h1>Alphify</h1>
                </div>
                {sections.map((section) => (
                    <button
                        key={section.id}
                        className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        <i className={`fas ${section.icon}`}></i>
                        <span>{section.label}</span>
                    </button>
                ))}
            </div>
            <div className="settings-main">
                <div className="settings-header">
                    <h1>Extension Settings</h1>
                </div>

                <div className="settings-content">
                    {renderSection()}
                </div>
                <div className="settings-footer">
                    <button className="reset-button" onClick={handleReset}>
                        Reset to Default
                    </button>
                    <div className="action-buttons">
                        <button className="cancel-button">
                            Cancel
                        </button>
                        <button className="save-button" onClick={handleSave}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Settings />
    </React.StrictMode>
);