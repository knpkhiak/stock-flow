// 닉네임: 2~20자, 한글/영문/숫자/_
const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,20}$/;
export function validateNickname(n: string): { ok: boolean; reason?: string } {
  const v = n.trim();
  if (v.length < 2) return { ok: false, reason: "2자 이상 입력해주세요" };
  if (v.length > 20) return { ok: false, reason: "20자 이하로 입력해주세요" };
  if (!NICK_RE.test(v)) return { ok: false, reason: "한글/영문/숫자만 사용 가능" };
  return { ok: true };
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
