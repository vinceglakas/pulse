'use client'

import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: '.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'python', label: 'Python', ext: '.py' },
  { id: 'html', label: 'HTML', ext: '.html' },
  { id: 'css', label: 'CSS', ext: '.css' },
  { id: 'json', label: 'JSON', ext: '.json' },
]

const STARTER_TEMPLATES: Record<string, string> = {
  javascript: `// Pulsed Code Editor
// Write your code here and click Run

async function main() {
  console.log("Hello from Pulsed! 🚀");
  
  // Example: Fetch data
  const response = await fetch('https://api.github.com/zen');
  const wisdom = await response.text();
  console.log("GitHub says:", wisdom);
}

main();`,
  typescript: `// TypeScript template
interface User {
  name: string;
  email: string;
  plan: 'free' | 'pro';
}

const user: User = {
  name: "Pulsed User",
  email: "user@pulsed.ai",
  plan: "pro"
};

console.log(\`Welcome, \${user.name}! Plan: \${user.plan}\`);`,
  python: `# Python template
# Note: Runs in browser via Pyodide (coming soon)

def greet(name: str) -> str:
    return f"Hello, {name}! Welcome to Pulsed."

print(greet("World"))

# Example: Data processing
data = [1, 2, 3, 4, 5]
squared = [x**2 for x in data]
print(f"Squared: {squared}")`,
  html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Inter, sans-serif; background: #0a0a0f; color: #f0f0f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111118; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; text-align: center; }
    h1 { color: #818cf8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Built with Pulsed</h1>
    <p>Edit this template and preview live</p>
  </div>
</body>
</html>`,
  css: `/* CSS Template */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.card {
  background: #111118;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 24px;
  transition: border-color 0.2s;
}

.card:hover {
  border-color: #6366f1;
}`,
  json: `{
  "name": "my-pulsed-project",
  "version": "1.0.0",
  "description": "Built with Pulsed Code Editor",
  "scripts": {
    "start": "node index.js"
  }
}`,
}

interface FileTab {
  id: string; name: string; language: string; content: string;
}

export default function CodeEditorPage() {
  const [files, setFiles] = useState<FileTab[]>([
    { id: '1', name: 'main.js', language: 'javascript', content: STARTER_TEMPLATES.javascript },
  ])
  const [activeFileId, setActiveFileId] = useState('1')
  const [output, setOutput] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const activeFile = files.find(f => f.id === activeFileId)!

  function updateFile(content: string) {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content } : f))
  }

  function addFile() {
    const id = crypto.randomUUID()
    const newFile: FileTab = { id, name: `file-${files.length + 1}.js`, language: 'javascript', content: STARTER_TEMPLATES.javascript }
    setFiles([...files, newFile]); setActiveFileId(id)
  }

  function closeFile(id: string) {
    if (files.length <= 1) return
    const remaining = files.filter(f => f.id !== id)
    setFiles(remaining)
    if (activeFileId === id) setActiveFileId(remaining[0].id)
  }

  function renameFile(id: string) {
    const name = prompt('File name:', files.find(f => f.id === id)?.name)
    if (name) {
      const ext = name.split('.').pop() || ''
      const lang = LANGUAGES.find(l => l.ext === `.${ext}`)?.id || 'javascript'
      setFiles(files.map(f => f.id === id ? { ...f, name, language: lang } : f))
    }
  }

  function runCode() {
    setOutput([])
    const logs: string[] = []

    if (activeFile.language === 'html') {
      setShowPreview(true)
      setTimeout(() => {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument!
          doc.open(); doc.write(activeFile.content); doc.close()
        }
      }, 100)
      return
    }

    if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
      const originalLog = console.log
      const originalError = console.error
      console.log = (...args) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')); originalLog(...args) }
      console.error = (...args) => { logs.push(`❌ ${args.join(' ')}`); originalError(...args) }

      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
        const fn = new AsyncFunction(activeFile.content)
        fn().then(() => { setOutput([...logs]); console.log = originalLog; console.error = originalError })
          .catch((e: Error) => { logs.push(`❌ ${e.message}`); setOutput([...logs]); console.log = originalLog; console.error = originalError })
      } catch (e: any) {
        logs.push(`❌ ${e.message}`); setOutput(logs)
        console.log = originalLog; console.error = originalError
      }
      return
    }

    setOutput([`⚠️ Running ${activeFile.language} is not yet supported in-browser. Use JavaScript or HTML for now.`])
  }

  async function aiAssist() {
    if (!aiPrompt) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `You are a code assistant. The user is editing a ${activeFile.language} file. Their request: "${aiPrompt}". Current code:\n\`\`\`\n${activeFile.content}\n\`\`\`\n\nReturn ONLY the updated code. No explanations, no markdown fences.` }],
        }),
      })
      const data = await res.json()
      const code = data.choices?.[0]?.message?.content || data.content || ''
      const cleaned = code.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
      updateFile(cleaned)
    } catch (e) { console.error('AI assist failed:', e) }
    setAiLoading(false); setAiPrompt('')
  }

  function downloadFile() {
    const blob = new Blob([activeFile.content], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = activeFile.name; a.click()
  }

  // Tab handling for textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart; const end = ta.selectionEnd
      const newValue = activeFile.content.substring(0, start) + '  ' + activeFile.content.substring(end)
      updateFile(newValue)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runCode() }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Code Editor</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runCode} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium">▶ Run (⌘↵)</button>
          <button onClick={downloadFile} className="px-3 py-1 rounded-lg text-xs hover:bg-white/5" style={{ color: '#8b8b9e' }}>↓ Download</button>
        </div>
      </div>

      {/* File tabs */}
      <div className="flex items-center gap-0 px-2 h-9 shrink-0" style={{ background: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {files.map(f => (
          <div key={f.id} onClick={() => setActiveFileId(f.id)} onDoubleClick={() => renameFile(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-b-2 ${activeFileId === f.id ? 'border-indigo-500 text-white' : 'border-transparent text-[#6b6b80] hover:text-[#8b8b9e]'}`}>
            <span>{f.name}</span>
            {files.length > 1 && <button onClick={e => { e.stopPropagation(); closeFile(f.id) }} className="hover:text-red-400 ml-1">×</button>}
          </div>
        ))}
        <button onClick={addFile} className="px-2 py-1 text-xs hover:text-indigo-400" style={{ color: '#6b6b80' }}>+</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <textarea ref={textareaRef} value={activeFile.content} onChange={e => updateFile(e.target.value)}
            onKeyDown={handleKeyDown} spellCheck={false}
            className="flex-1 p-4 font-mono text-sm resize-none outline-none"
            style={{ background: '#0a0a0f', color: '#c4c4d4', tabSize: 2, lineHeight: 1.6 }} />

          {/* AI Assist bar */}
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: '#111118', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs" style={{ color: '#6b6b80' }}>✨</span>
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Ask AI to modify code..."
              className="flex-1 px-2 py-1 rounded text-xs outline-none" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}
              onKeyDown={e => e.key === 'Enter' && aiAssist()} />
            <button onClick={aiAssist} disabled={aiLoading} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs disabled:opacity-40">
              {aiLoading ? '...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Output / Preview */}
        <div className="w-96 flex flex-col shrink-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 px-3 h-8 shrink-0" style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setShowPreview(false)} className={`text-xs ${!showPreview ? 'text-indigo-400' : 'text-[#6b6b80]'}`}>Console</button>
            <button onClick={() => setShowPreview(true)} className={`text-xs ${showPreview ? 'text-indigo-400' : 'text-[#6b6b80]'}`}>Preview</button>
          </div>
          {showPreview ? (
            <iframe ref={iframeRef} className="flex-1 bg-white" sandbox="allow-scripts" />
          ) : (
            <div className="flex-1 p-3 font-mono text-xs overflow-auto" style={{ background: '#0a0a0f', color: '#8b8b9e' }}>
              {output.length === 0 ? (
                <p style={{ color: '#6b6b80' }}>Click Run or press ⌘↵ to execute</p>
              ) : output.map((line, i) => (
                <div key={i} className={`py-0.5 ${line.startsWith('❌') ? 'text-red-400' : ''}`}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
