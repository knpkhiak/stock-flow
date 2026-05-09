import { useCallback, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { toast } from "sonner";
import { uploadIdeaImage } from "@/lib/imageUpload";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  value: string;
  onChange: (v: string) => void;
  ideaId: string;
  height?: number;
}

export default function MarkdownEditor({ value, onChange, ideaId, height = 500 }: Props) {
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(
    async (files: File[] | FileList) => {
      if (!user) { toast.error("로그인이 필요합니다"); return; }
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      for (const f of list) {
        const t = toast.loading("이미지 업로드 중...");
        try {
          const { url } = await uploadIdeaImage({ file: f, userId: user.id, ideaId });
          const md = `\n![image](${url})\n`;
          onChange((value || "") + md);
          toast.success("이미지 업로드 완료", { id: t });
        } catch (e: any) {
          toast.error(`이미지 업로드 실패: ${e.message}`, { id: t });
        }
      }
    },
    [user, ideaId, value, onChange],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer?.files?.length) {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div ref={wrapRef} onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => e.preventDefault()} data-color-mode="dark">
      <MDEditor value={value} onChange={(v) => onChange(v ?? "")} height={height} />
    </div>
  );
}
