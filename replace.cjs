const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// First add safeStorage at the top level
const safeStorageStr = `
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch {} }
};
`;

content = content.replace("export default function App() {", safeStorageStr + "\nexport default function App() {");

// Then replace all 'localStorage' with 'safeStorage' except inside safeStorage itself
// Because we already injected safeStorage doing localStorage.
// Actually, let's reverse the steps: replace all first, then insert safeStorage.
// We'll replace all 'localStorage.' with 'safeStorage.'
content = content.replace(/localStorage\./g, 'safeStorage.');

// Now insert safeStorage definition which actually calls native localStorage
const safeStorageImpl = `
const safeStorage = {
  getItem: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch {} },
  removeItem: (k: string) => { try { window.localStorage.removeItem(k); } catch {} }
};
`;

content = content.replace("export default function App() {", safeStorageImpl + "\nexport default function App() {");

fs.writeFileSync('src/App.tsx', content);
