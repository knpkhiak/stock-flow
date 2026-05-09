import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./ResizableImage";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Code2, Minus, Table as TableIcon, Image as ImageIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
} from "lucide-react";
import { uploadIdeaImage } from "@/lib/imageUpload";
import { useAuth } from "@/hooks/useAuth";
import SlashCommand from "./SlashCommand";
import "tippy.js/dist/tippy.css";
import "@/styles/tiptap.css";

interface Props {
  value: any;
  onChange: (json: any) => void;
  ideaId: string;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function ToolbarBtn({
  active, onClick, title, children, disabled,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-accent text-foreground/80 hover:text-foreground transition-colors disabled:opacity-40 ${active ? "bg-accent text-accent-foreground" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() { return <span className="mx-1 h-5 w-px bg-border self-center" />; }

export default function RichEditor({
  value, onChange, ideaId, placeholder = "아이디어를 자유롭게 작성해주세요... ('/'로 명령)",
  editable = true, autoFocus = false,
}: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    editable,
    autofocus: autoFocus,
    extensions: [
      StarterKit.configure({ link: false, underline: false } as any),
      Underline,
      Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder }),
      SlashCommand,
    ],
    content: value && Object.keys(value).length ? value : EMPTY_DOC,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Sync external value changes (e.g. after fetch)
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value && Object.keys(value).length ? value : EMPTY_DOC);
    if (current !== next) editor.commands.setContent(value && Object.keys(value).length ? value : EMPTY_DOC, { emitUpdate: false } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!user || !editor) { toast.error("로그인이 필요합니다"); return; }
    if (!file.type.startsWith("image/")) return;
    const tempUrl = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: tempUrl, alt: "Uploading..." }).run();
    const t = toast.loading("이미지 업로드 중...");
    try {
      const { url } = await uploadIdeaImage({ file, userId: user.id, ideaId });
      // Replace temp src
      const { state } = editor;
      let pos: number | null = null;
      state.doc.descendants((node, p) => {
        if (node.type.name === "image" && node.attrs.src === tempUrl) { pos = p; return false; }
      });
      if (pos !== null) {
        editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { src: url, alt: "" }).run();
      }
      URL.revokeObjectURL(tempUrl);
      toast.success("이미지 업로드 완료", { id: t });
    } catch (e: any) {
      // remove temp image
      const { state } = editor;
      let pos: number | null = null;
      state.doc.descendants((node, p) => {
        if (node.type.name === "image" && node.attrs.src === tempUrl) { pos = p; return false; }
      });
      if (pos !== null) editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
      URL.revokeObjectURL(tempUrl);
      toast.error(`이미지 업로드 실패: ${e.message}`, { id: t });
    }
  }, [editor, user, ideaId]);

  // paste / drop
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = Array.from(items)
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile()).filter(Boolean) as File[];
      if (files.length) {
        e.preventDefault();
        files.forEach((f) => void handleImageFile(f));
      }
    };
    const onDrop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        files.forEach((f) => void handleImageFile(f));
      }
    };
    dom.addEventListener("paste", onPaste);
    dom.addEventListener("drop", onDrop);
    return () => {
      dom.removeEventListener("paste", onPaste);
      dom.removeEventListener("drop", onDrop);
    };
  }, [editor, handleImageFile]);

  if (!editor) return null;

  const insertLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("링크 URL", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="tiptap-editor">
      {editable && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card/95 backdrop-blur p-1.5 rounded-t-md overflow-x-auto">
          <ToolbarBtn title="굵게 (Cmd+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="기울임 (Cmd+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="밑줄 (Cmd+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="형광펜" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="제목 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="제목 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="제목 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="글머리 목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="체크리스트" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="인용" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="코드 블록" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="표 (3x3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="이미지 업로드" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="링크 (Cmd+K)" active={editor.isActive("link")} onClick={insertLink}><LinkIcon className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="왼쪽 정렬" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="가운데 정렬" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="오른쪽 정렬" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn title="실행 취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn title="다시 실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarBtn>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImageFile(f);
          e.target.value = "";
        }}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
