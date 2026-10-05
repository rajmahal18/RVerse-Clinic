"use client";

import { useEffect, useRef, useState } from "react";

export function ResponsivePaper({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const update = () => {
      if (!container.current || !paper.current) return;
      const scale = Math.min(1, container.current.clientWidth / paper.current.offsetWidth);
      setSize({ scale, height: paper.current.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    if (container.current) observer.observe(container.current);
    if (paper.current) observer.observe(paper.current);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="medicine-paper-preview" style={{ height: size.height || undefined }}>
      <div ref={paper} className="medicine-paper-content" style={{ transform: `scale(${size.scale})` }}>
        {children}
      </div>
    </div>
  );
}
