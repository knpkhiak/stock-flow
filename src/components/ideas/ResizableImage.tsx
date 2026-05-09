import { useRef, useState, useEffect } from "react";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";

function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title, width } = node.attrs as {
    src: string; alt?: string; title?: string; width?: number | string | null;
  };
  const wrapRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [active, setActive] = useState(false);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!selected) setActive(false);
  }, [selected]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setActive(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const startResize = (e: React.MouseEvent, side: "right" | "left") => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;
    setResizing(true);
    const startX = e.clientX;
    const startW = imgRef.current.getBoundingClientRect().width;
    const parentW = wrapRef.current?.parentElement?.getBoundingClientRect().width || 800;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const delta = side === "right" ? dx : -dx;
      const next = Math.max(80, Math.min(parentW, startW + delta));
      updateAttributes({ width: Math.round(next) });
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const w = typeof width === "number" ? `${width}px` : (width || "auto");

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapRef}
      className="resizable-image-wrap"
      data-active={active || selected}
      onClick={(e) => { e.stopPropagation(); setActive(true); }}
      style={{ display: "inline-block", position: "relative", maxWidth: "100%", lineHeight: 0 }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        title={title || ""}
        style={{
          width: w,
          maxWidth: "100%",
          height: "auto",
          display: "block",
          borderRadius: 8,
          outline: (active || selected) ? "2px solid hsl(var(--primary))" : "none",
          cursor: "pointer",
        }}
        draggable={false}
      />
      {(active || selected) && editor.isEditable && (
        <>
          <span
            onMouseDown={(e) => startResize(e, "left")}
            className="resize-handle"
            style={{ left: -6 }}
          />
          <span
            onMouseDown={(e) => startResize(e, "right")}
            className="resize-handle"
            style={{ right: -6 }}
          />
          <span className="resize-size-badge">
            {imgRef.current ? Math.round(imgRef.current.getBoundingClientRect().width) : ""}px
          </span>
          {resizing && <span style={{ position: "absolute", inset: 0 }} />}
        </>
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = (el as HTMLElement).getAttribute("width") || (el as HTMLElement).style.width;
          if (!w) return null;
          const n = parseInt(w, 10);
          return isNaN(n) ? null : n;
        },
        renderHTML: (attrs: any) => {
          if (!attrs.width) return {};
          return { width: attrs.width, style: `width: ${typeof attrs.width === "number" ? attrs.width + "px" : attrs.width}` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
