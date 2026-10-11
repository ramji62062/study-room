"use client";

import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import {
  X,
  Play,
  Maximize2,
  Minimize2,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Code2,
} from "lucide-react";

interface OnDemandCodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const DEFAULT_STARTERS: Record<string, string> = {
  javascript: `// Live Code Sandbox (On-Demand)\nfunction calculateScore(attendance, participation) {\n  return (attendance * 0.4) + (participation * 0.6);\n}\n\nconsole.log("Calculated Score:", calculateScore(95, 88));\n`,
  python: `# Live Python Sandbox\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint("First 8 Fibonacci numbers:", list(fibonacci(8)))\n`,
  cpp: `// Live C++ Sandbox\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<std::string> topics = {"Data Structures", "Algorithms", "Concurrency"};\n    std::cout << "Study Group Topics:" << std::endl;\n    for (const auto& t : topics) {\n        std::cout << " - " << t << std::endl;\n    }\n    return 0;\n}\n`,
  java: `// Live Java Sandbox\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CodeTogether Study Sandbox!");\n    }\n}\n`,
};

export default function OnDemandCodeDrawer({
  isOpen,
  onClose,
  roomId,
}: OnDemandCodeDrawerProps) {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(DEFAULT_STARTERS.javascript);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (DEFAULT_STARTERS[newLang]) {
      setCode(DEFAULT_STARTERS[newLang]);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Executing in secure sandbox...");
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          roomId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data.output || data.result || "Execution completed with no output.");
      } else {
        setOutput(`Error: ${data.error || "Execution failed"}`);
      }
    } catch (err: any) {
      setOutput(`Network Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col transition-all duration-300 ${
        isExpanded ? "w-full md:w-[85vw]" : "w-full md:w-[600px] lg:w-[680px]"
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Live Code Sandbox</h3>
            <p className="text-[11px] text-zinc-500">On-demand execution (WebContainer & Cloud)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language select */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++ 20</option>
            <option value="java">Java 17</option>
          </select>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
            title={isExpanded ? "Restore" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-red-400 transition-colors"
            title="Close Sandbox"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 min-h-[300px] relative bg-[#1e1e1e]">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
          }}
        />
      </div>

      {/* Action Bar */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Running..." : "Run Sandbox"}</span>
          </button>

          <button
            onClick={() => setOutput("")}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Output</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-500">Fast cloud compilation</span>
      </div>

      {/* Terminal / Output Console */}
      <div className="h-44 bg-black border-t border-zinc-800 p-3 font-mono text-xs flex flex-col">
        <div className="flex items-center gap-1.5 text-zinc-500 mb-2 border-b border-zinc-800/80 pb-1">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-zinc-400">Sandbox Output</span>
        </div>
        <pre className="flex-1 overflow-y-auto text-zinc-300 whitespace-pre-wrap select-text">
          {output || "Output will appear here after clicking 'Run Sandbox'..."}
        </pre>
      </div>
    </div>
  );
}
