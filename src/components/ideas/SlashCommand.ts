import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import SlashCommandList, { SlashItem } from "./SlashCommandList";

const ITEMS: SlashItem[] = [
  { title: "본문", aliases: ["text", "paragraph", "본문", "p"], icon: "📝", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: "큰 제목 (H1)", aliases: ["h1", "heading1", "큰제목", "제목1"], icon: "H1", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run() },
  { title: "중간 제목 (H2)", aliases: ["h2", "heading2", "중간제목", "제목2"], icon: "H2", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run() },
  { title: "작은 제목 (H3)", aliases: ["h3", "heading3", "작은제목", "제목3"], icon: "H3", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run() },
  { title: "글머리 목록", aliases: ["bullet", "ul", "list", "목록"], icon: "•", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "번호 목록", aliases: ["number", "ol", "ordered", "번호"], icon: "1.", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: "체크리스트", aliases: ["task", "todo", "check", "체크"], icon: "☑", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
  { title: "표 (3x3)", aliases: ["table", "표"], icon: "📊", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "인용", aliases: ["quote", "blockquote", "인용"], icon: "💬", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: "코드 블록", aliases: ["code", "codeblock", "코드"], icon: "</>", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: "구분선", aliases: ["hr", "divider", "rule", "구분"], icon: "—", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }: any) => props.command({ editor, range }),
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const q = query.trim().toLowerCase();
          if (!q) return ITEMS.slice(0, 10);
          return ITEMS.filter((i) =>
            i.title.toLowerCase().includes(q) ||
            i.aliases.some((a) => a.toLowerCase().includes(q))
          ).slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] = [];
          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "slash",
              });
            },
            onUpdate: (props: any) => {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") { popup[0]?.hide(); return true; }
              return (component?.ref as any)?.onKeyDown?.(props) ?? false;
            },
            onExit: () => { popup[0]?.destroy(); component?.destroy(); },
          };
        },
      }),
    ];
  },
});

export default SlashCommand;
