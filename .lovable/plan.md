# STEP 6 — 운영자 시스템 + 사용자별 API 키 격리 + 사이드바 재구성

대규모 보안 패치 + 구조 개편입니다. 기존 기능은 그대로 유지하고, 권한·키 격리·사이드바만 정리합니다.

## 1. DB 마이그레이션 (1회 실행)

### 1-A. 컬럼 추가
- `user_profiles.is_admin boolean default false`
- `invite_codes.is_master boolean default false`

### 1-B. `api_settings` 테이블 신규
```
user_id (PK, FK→auth.users, ON DELETE CASCADE)
kis_app_key, kis_app_secret, kis_account_number text
kis_account_type text default 'REAL'
last_token text, token_expires_at timestamptz
is_connected boolean default false
last_connected_at, created_at, updated_at timestamptz
```
RLS 4개 정책 (본인만 SELECT/INSERT/UPDATE/DELETE) — 운영자도 타인 키 조회 불가.

### 1-C. 마스터 코드 자동 INSERT
`STOCKFLOWADMIN2026` (is_master=true, created_by=NULL).
→ 운영자께서 마스터 코드를 미리 사용하셨다면 별도 코드 발급해드립니다.

### 1-D. `use_invite_code` RPC 수정
- 마스터 코드 사용 시 `user_profiles.is_admin = true` 자동 부여
- 일반 코드는 false 유지

### 1-E. 운영자 전용 RPC
- `set_user_admin(target_user_id, is_admin)` — 호출자 운영자 검증, 본인 권한 해제 차단
- `admin_list_users()` — 가입자 전체 목록 + API 연결여부 (auth.users 조인, SECURITY DEFINER)

## 2. Edge Function `kis-proxy` 수정

기존: 글로벌 KIS_APP_KEY 사용
신규:
1. `Authorization: Bearer <jwt>` 헤더 → `supabase.auth.getUser(jwt)`로 user_id 추출
2. `api_settings` SELECT (서비스 롤 클라이언트로) `where user_id = caller`
3. 키 미설정 시 `{error, code: 'API_NOT_CONFIGURED'}` 400 반환
4. 토큰 캐싱: `last_token` 만료 시 새 발급 → `api_settings`에 저장 (23h)
5. 사용자별 키로 한투 API 호출

`config.toml`의 `[functions.kis-proxy] verify_jwt = true` 유지.

## 3. 글로벌 Secrets 정리
- `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_CANO`, `KIS_ACNT_PRDT_CD` 삭제 권장 (제거는 운영자 확인 후)

## 4. 프론트엔드

### 신규 파일
- `src/components/AdminRoute.tsx` — is_admin 아니면 /dashboard 리다이렉트
- `src/hooks/useUserProfile.ts` — 본인 프로필 + is_admin 조회
- `src/hooks/useApiSettings.ts` — 본인 api_settings CRUD
- `src/hooks/useAdminUsers.ts` — admin_list_users RPC
- `src/pages/Admin.tsx` — 탭 2개 (초대 코드 / 사용자 관리)
- `src/components/admin/AdminInvitesTab.tsx` — 통계 + 발급/폐기/공유 메시지
- `src/components/admin/AdminUsersTab.tsx` — 통계 + 권한 변경 + 본인 차단
- `src/components/settings/ApiSettingsCard.tsx` — 사용자별 키 입력 + 연결 테스트
- `src/components/settings/ProfileCard.tsx` — 닉네임/이메일/비번 재설정
- `src/components/settings/DangerZoneCard.tsx` — 데이터 초기화/탈퇴

### 수정 파일
- `src/components/AppSidebar.tsx` — 4개 그룹 (TRADING / NOTES & COMMUNITY / SETTINGS / ADMIN), ADMIN은 is_admin일 때만
- `src/pages/Settings.tsx` — Tabs 3개 (API 연결 / 프로필 / 위험 영역)
- `src/App.tsx` — `/admin` 라우트 + AdminRoute
- `src/pages/Invite.tsx` — 마스터 코드도 동일 흐름 (RPC가 처리)

## 5. 검증 시나리오 (배포 전 체크)
- 마스터 코드로 가입 → 사이드바 ADMIN 그룹 노출
- 일반 사용자 /admin 접근 → /dashboard 리다이렉트
- 운영자 본인 권한 해제 시도 → 에러
- 사용자 A 키로는 사용자 A 매매만 sync (Edge Function 사용자별 키)
- api_settings RLS — 다른 user_id row 조회 불가

## 기술 메모
- `auth.users` 조인은 SECURITY DEFINER RPC로만 (직접 조회 불가)
- 토큰 캐시는 `api_settings` 자체에 저장 (기존 `kis_token_cache`는 글로벌이라 사용자별 격리에 부적합 — 사용자별로 분리)
- 기존 사용자 데이터(매매기록 등)는 건드리지 않음. 단, 운영자 본인이 글로벌 키로 동기화한 잘못된 데이터는 `/settings → 위험 영역 → 데이터 초기화`로 정리 권장
- 본 마이그레이션 후 운영자께서 가입/API 키 재입력하시기 전까지는 `/trades` 자동 동기화가 멈춥니다 (의도된 동작)

## 작업량
- 마이그레이션 1개 (테이블/RLS/RPC/마스터코드 모두 포함)
- Edge Function 1개 재작성
- 신규 파일 약 11개, 수정 파일 약 4개
