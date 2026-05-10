// 8자리 초대 코드 생성. 혼동 문자 제외 (O, 0, I, 1, L)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateInviteCode(len = 8): string {
  let s = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += CHARS[arr[i] % CHARS.length];
  return s;
}
