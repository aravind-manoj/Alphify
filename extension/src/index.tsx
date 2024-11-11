import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Browser from 'webextension-polyfill';
import { Settings, Github } from 'lucide-react';

const VERSION = "Version: 1.2.5";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

interface StorageResult {
  isActive?: boolean;
}

const App = () => {
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    const fetchToggleState = async () => {
      const result = await Browser.storage.local.get('isActive') as StorageResult;
      await Browser.runtime.sendMessage({ type: 'toggle', isActive: result.isActive });
      setIsActive(Boolean(result.isActive));
    };

    fetchToggleState();
  }, []);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setIsActive(newState);
    await Browser.storage.local.set({ isActive: newState });
    await Browser.runtime.sendMessage({ type: 'toggle', isActive: newState });
  };

  return (
    <div className="popup">
      <header className="headerSection">
        <div className="headerContent">
          <div className="logoTitle">
            <img src="logo.svg" alt="Logo" className="logo" />
            <h1>Alphify</h1>
          </div>
          <Settings className="settingsIcon" />
        </div>
      </header>
      <div className="contentWrap">
        { isActive ? <h1 style={{color: "#6EE173"}}>Alphify: Enabled</h1> : <h1 style={{color: "#b7b7b7"}}>Alphify: Disabled</h1> }
      </div>
      <div className="togglerWrap">
        <label className="switch">
          <input
            type="checkbox"
            checked={isActive}
            onChange={handleToggle}
          />
          <span className="slider round"></span>
        </label>
        <h4 className="toggleInstructionText">{ isActive ? "To disable Alphify click on the toggle." : "To enable Alphify click on the toggle."}</h4>
      </div>
      <div className="versionInfo">
        <span className="versionNumber">{VERSION}</span>
      </div>
      <footer>
        <div className='footerContent'>
          <h4><a href="https://alphify.vercel.app/" target="_blank" rel="noopener noreferrer">Visit our site</a></h4>
          <a href="https://github.com/aravind-manoj/Alphify" target="_blank" rel="noopener noreferrer">
            <Github className="githubIcon" />
          </a>
        </div>
      </footer>
    </div>
  );
};

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);