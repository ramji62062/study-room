"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Play, X, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { runCodeInBrowser } from "@/lib/browserCodeRunner";

// Lazy-load Monaco Editor
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#141920] text-xs text-[#8B97A7]">
      Loading editor...
    </div>
  ),
});

interface StudyEditorPanelProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onClose: () => void;
}

const DEFAULT_PYTHON_CODE = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i

print(two_sum([2, 7, 11, 15], 9))
`;

export default function StudyEditorPanel({
  initialCode = DEFAULT_PYTHON_CODE,
  onCodeChange,
  onClose,
}: StudyEditorPanelProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("[0, 1]");
  const [isRunning, setIsRunning] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [fileName, setFileName] = useState("two_sum.py");

  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Debounced layout call on resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 60);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await runCodeInBrowser("python", code);
      setOutput(result);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTextChange = (val: string | undefined) => {
    const nextVal = val || "";
    setCode(nextVal);
    onCodeChange?.(nextVal);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-[#141920] border border-[#232A35] rounded-xl overflow-hidden font-['DM_Sans',sans-serif] shadow-sm select-none"
    >
      {/* 1. Header (52px) */}
      <div className="h-[52px] bg-[#141920] border-b border-[#232A35] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-[#E6EDF3]">
            {fileName}
          </span>
          <span className="text-[11px] font-semibold text-[#8B97A7] bg-[#1C232D] px-2 py-0.5 rounded-full border border-[#2B3340]">
            {isShared ? "Shared" : "Private"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Share my editor toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isShared}
            aria-label="Share my editor"
            onClick={() => setIsShared(!isShared)}
            className="flex items-center gap-2 text-xs text-[#8B97A7] hover:text-[#E6EDF3] transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            <span>Share my editor</span>
            <span
              className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                isShared ? "bg-[#3DD6B0] justify-end" : "bg-[#2B3340] justify-start"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  isShared ? "bg-[#0E1116]" : "bg-[#8B97A7]"
                }`}
              />
            </span>
          </button>

          {/* Run in browser button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="h-8 px-3.5 rounded-lg bg-[#3DD6B0] hover:bg-[#34BE9C] text-[#0E1116] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play size={12} fill="#0E1116" />
            <span>{isRunning ? "Running..." : "Run in browser"}</span>
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
            title="Close editor panel"
            aria-label="Close editor panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Monaco Editor Body */}
      <div className="flex-1 min-h-[220px] relative bg-[#141920]">
        <MonacoEditor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={handleTextChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            fontFamily: "'JetBrains Mono', monospace",
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
        />
      </div>

      {/* 3. Bottom Output Console */}
      <div className="h-28 bg-[#0E1116] border-t border-[#232A35] p-3 flex flex-col font-['JetBrains_Mono',monospace] text-xs flex-shrink-0">
        <div className="text-[11px] text-[#8B97A7] mb-1 font-sans">
          Output (runs in your browser only)
        </div>
        <pre className="flex-1 overflow-y-auto text-[#3DD6B0] font-bold whitespace-pre-wrap select-text m-0">
          {output}
        </pre>
      </div>
    </div>
  );
}
