"use client";

import { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Minus, Maximize2, Minimize2, X } from "lucide-react";

interface StudyFloatingWindowProps {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
  zIndex: number;
  onClose: () => void;
  onMinimize?: () => void;
  onFocus: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
}

export default function StudyFloatingWindow({
  id,
  title,
  isOpen,
  isMinimized = false,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  defaultPosition = { x: 120, y: 100 },
  defaultSize = { width: 560, height: 440 },
  minWidth = 340,
  minHeight = 240,
  children,
}: StudyFloatingWindowProps) {
  const [size, setSize] = useState(defaultSize);
  const [position, setPosition] = useState(defaultPosition);
  const [isMaximized, setIsMaximized] = useState(false);
  const prevDimensionsRef = useRef<{ size: { width: number; height: number }; position: { x: number; y: number } }>({
    size: defaultSize,
    position: defaultPosition,
  });

  // Clamp position to viewport bounds on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const maxX = Math.max(20, window.innerWidth - size.width - 20);
      const maxY = Math.max(64, window.innerHeight - size.height - 70);
      setPosition((prev) => ({
        x: Math.max(10, Math.min(maxX, prev.x)),
        y: Math.max(60, Math.min(maxY, prev.y)),
      }));
    }
  }, []);

  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore
      setSize(prevDimensionsRef.current.size);
      setPosition(prevDimensionsRef.current.position);
      setIsMaximized(false);
    } else {
      // Maximize
      prevDimensionsRef.current = { size, position };
      if (typeof window !== "undefined") {
        setPosition({ x: 80, y: 56 });
        setSize({
          width: window.innerWidth - 96,
          height: window.innerHeight - 120,
        });
      }
      setIsMaximized(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: isMinimized ? "none" : "block",
      }}
    >
      <Rnd
        size={size}
        position={position}
        minWidth={minWidth}
        minHeight={minHeight}
        bounds="window"
        dragHandleClassName="study-window-drag-handle"
        style={{
          zIndex,
        }}
        onDragStart={onFocus}
        onDragStop={(_e, d) => {
          setPosition({ x: Math.max(10, d.x), y: Math.max(50, d.y) });
        }}
        onResizeStart={onFocus}
        onResizeStop={(_e, _direction, ref, _delta, pos) => {
          setSize({
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
          });
          setPosition(pos);
        }}
        className="flex flex-col rounded-2xl overflow-hidden bg-[#141920]/95 backdrop-blur-xl border border-[#2B3340]/80 shadow-[0_16px_48px_rgba(0,0,0,0.7)] font-['DM_Sans',sans-serif] focus-within:border-[#3DD6B0]/50 transition-colors"
      >
        {/* Floating Window Title Bar */}
        <div
          onDoubleClick={toggleMaximize}
          onMouseDown={onFocus}
          className="study-window-drag-handle h-10 px-3.5 bg-[#141920] border-b border-[#232A35] flex items-center justify-between cursor-move select-none flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3DD6B0]/70" />
            <span className="text-xs font-bold text-[#E6EDF3] tracking-wide">
              {title}
            </span>
          </div>

          {/* Window action buttons */}
          <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
            {onMinimize && (
              <button
                onClick={onMinimize}
                aria-label="Minimize window"
                title="Minimize"
                className="w-6 h-6 rounded-md hover:bg-[#232A35] text-[#8B97A7] hover:text-[#E6EDF3] flex items-center justify-center transition-colors"
              >
                <Minus size={13} />
              </button>
            )}

            <button
              onClick={toggleMaximize}
              aria-label={isMaximized ? "Restore window" : "Maximize window"}
              title={isMaximized ? "Restore" : "Maximize"}
              className="w-6 h-6 rounded-md hover:bg-[#232A35] text-[#8B97A7] hover:text-[#E6EDF3] flex items-center justify-center transition-colors"
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>

            <button
              onClick={onClose}
              aria-label="Close window"
              title="Close"
              className="w-6 h-6 rounded-md hover:bg-[#2A1B1E] text-[#8B97A7] hover:text-[#FF8A8A] flex items-center justify-center transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Window Content Container */}
        <div
          onMouseDown={onFocus}
          className="flex-1 w-full h-[calc(100%-40px)] overflow-hidden relative bg-[#0E1116]/90"
        >
          {children}
        </div>
      </Rnd>
    </div>
  );
}
