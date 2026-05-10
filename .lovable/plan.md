# STEP 5 — 공유 기능 + 자유게시판

폐쇄형 친구 그룹(5명 이내)을 위한 공유/게시판/초대코드 시스템을 추가합니다. 기존 매매기록·아이디어 노트·자산관리·인증·RLS는 그대로 유지하고 신규 모듈만 얹습니다.

---

## 1. 데이터베이스 (마이그레이션 1회)

신규 테이블 5개와 `ideas` 컬럼 추가, 트리거, RPC 함수를 한 번의 마이그레이션으로 생성합니다.

### 신규 테이블
- **user_profiles** — `user_id` PK, `nickname`(unique), `avatar_url`. SELECT 공개(닉네임 표시용), 수정은 본인만.
- **invite_codes** — 8자리 코드, `created_by`/`used_by`/`is_used`/`memo`. 본인 발급분만 SELECT.
- **board_posts** — 자유게시판 글. `content` jsonb (TipTap), `view_count`/`like_count`/`comment_count` 자동 갱신. SELECT 공개, 수정/삭제는 작성자만.
- **comments** — `target_type`('post'|'shared_idea'), `parent_comment_id`(1단계 대댓글), `is_deleted`(soft delete).
- **likes** — `(user_id, target_type, target_id)` 복합 PK. SELECT 공개.

### `ideas` 테이블 컬럼 추가
- `is_shared` bool, `shared_at` timestamp, `share_pnl_rate` bool, `like_count` int, `comment_count` int
- SELECT RLS 변경: `auth.uid() = user_id OR is_shared = true`

### 트리거
- `likes` INSERT/DELETE → `board_posts.like_count` / `ideas.like_count` 자동 갱신
- `comments` INSERT/soft delete → `board_posts.comment_count` / `ideas.comment_count` 갱신
- 답글의 답글 INSERT 차단 트리거 (parent의 parent가 NULL이 아니면 reject)

### RPC 함수
- `change_nickname(new_nickname text)` — 중복 검사 후 업데이트
- `verify_invite_code(p_code text) → jsonb` — 유효성 반환
- `use_invite_code(p_code text, p_user_id uuid)` — 사용 처리
- `toggle_like(p_target_type text, p_target_id uuid) → jsonb` — 토글 결과 반환

---

## 2. 신규 페이지 / 라우트

App.tsx에 라우트 추가:
- `/invite` — 초대 코드 입력 (Public)
- `/signup` — 닉네임 + 가입 (sessionStorage에 invite_code 없으면 /invite로 리다이렉트)
- `/shared`, `/shared/:id` — 공유 노트 목록/상세
- `/board`, `/board/new`, `/board/:id`, `/board/:id/edit` — 자유게시판

**기존 사용자 마이그레이션:** ProtectedRoute에서 user_profiles의 nickname이 NULL이면 NicknameSetup 모달을 강제 표시.

---

## 3. 신규 컴포넌트
- `social/LikeButton` — 낙관적 업데이트 + `toggle_like` RPC
- `social/CommentSection` + `social/CommentItem` — 1단계 대댓글, soft delete
- `social/AuthorBadge` — 닉네임 + 아바타 + 상대시간
- `social/CertifiedBadge` — 한투 인증 뱃지 (OPEN/CLOSED, 수익률 색상)
- `SharedNoteCard`, `BoardPostRow`
- `InviteCodeManager`, `NicknameSetup`

## 4. 신규 훅 / 유틸
- 훅: `useNickname`, `useInviteCode`, `useLikes`, `useComments`, `useSharedIdeas`, `useBoardPosts`
- 유틸: `inviteCodeGenerator` (8자리, O/0/I/1/L 제외), `profileUtils` (닉네임 검증)

---

## 5. 기존 파일 수정
- **AppSidebar** — `🌐 공유 노트`, `💬 자유게시판` 메뉴 추가
- **Ideas.tsx** — [전체/비공개/공유 중] 탭 추가
- **IdeaDetail.tsx** — 공유 토글 + "수익률 함께 공유" 체크박스
- **IdeaCard.tsx** — 공유 중이면 🌐 아이콘
- **Login.tsx / Signup.tsx** — 닉네임 모달 / 초대 코드 검증
- **Settings.tsx** — 닉네임 변경 + 초대 코드 관리 카드
- **Dashboard.tsx** — "최근 공유 노트" + "최근 게시판 활동" 위젯

---

## 6. 매매 인증 뱃지 로직
공유 노트에 연결된 trade가 있고 `share_pnl_rate=true`일 때 자동 표시:
- OPEN/PARTIAL → `📊 진행 중 ±X%` (회색 배경)
- CLOSED → `✅ 한투 인증 ±X%` (초록 배경)
- 수익=빨강 / 손실=파랑 (한국식)
- 절대 노출 금지: 수량, 평가금액, 실제 금액

## 7. 디자인 / 보안 원칙
- 기존 시멘틱 토큰 재사용 (직접 색상 X)
- TipTap RichEditor 컴포넌트 그대로 재사용 (게시판/공유 노트 모두)
- 모든 신규 테이블 RLS 활성화
- 초대 코드 1회용, 운영자(본인)만 발급

---

## 진행 순서
1. 마이그레이션 작성 → 사용자 승인 → 실행 (types.ts 자동 갱신)
2. 유틸/훅/공통 컴포넌트 작성
3. 신규 페이지 작성 (Invite → Shared → Board)
4. 기존 페이지 수정 (Sidebar, Ideas, IdeaDetail, Login, Signup, Settings, Dashboard)
5. App.tsx 라우트 등록 및 ProtectedRoute에 닉네임 가드 삽입
6. 빌드/프리뷰 확인

승인하시면 마이그레이션부터 진행하겠습니다.
