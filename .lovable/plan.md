# STEP 4 — 아이디어 노트 모듈 구현 계획

매매기록/자산관리와 자연스럽게 연결되는 마크다운 기반 투자 아이디어 노트 시스템을 추가합니다.

## 1. 데이터베이스 (Supabase)

**ideas 테이블 신규 생성**
- 필드: title, ticker, market, content(마크다운), tags(text[]), status(watching/entered/passed)
- RLS: 본인 데이터만 조회/생성/수정/삭제
- updated_at 자동 갱신 트리거

**trades 테이블 수정**
- `idea_id` 컬럼 추가 (FK → ideas.id, ON DELETE SET NULL)

**Storage 버킷 'ideas-images'**
- 비공개, 5MB 제한, image/* MIME 타입
- 경로 구조: `{user_id}/{idea_id}/{timestamp}.webp`
- 본인 폴더만 업로드/조회/삭제 가능

## 2. 라이브러리 추가

- `@uiw/react-md-editor` (마크다운 에디터)
- `dompurify` (XSS 방지)
- 이미지 압축은 Canvas API로 직접 구현 (별도 라이브러리 없음)

## 3. 신규 파일

```
src/pages/Ideas.tsx              # 목록 페이지 (필터/검색/정렬)
src/pages/IdeaDetail.tsx         # 상세 페이지 (에디터 + 연결매매)
src/components/ideas/
  IdeaCard.tsx                   # 카드 컴포넌트
  MarkdownEditor.tsx             # 에디터 래퍼 (paste/drop 이미지)
  LinkedTradesCard.tsx           # 연결된 매매 카드
  TradeLinkModal.tsx             # 매매 연결 모달
  NewIdeaDialog.tsx              # 빠른 작성 모달
src/lib/imageCompressor.ts       # Canvas 압축 (1920px, WebP, q=0.8)
src/lib/imageUpload.ts           # Storage 업로드 헬퍼
src/hooks/useIdeas.ts            # CRUD + 자동저장
src/hooks/useLinkedTrades.ts     # 연결 매매 조회
```

## 4. 수정 파일

- `src/App.tsx` — `/ideas`, `/ideas/:id` 라우트 추가
- `src/pages/Ideas.tsx` — 기존 placeholder 교체
- `src/pages/Trades.tsx` — 종목 셀에 💡 아이콘, 펼침 영역에 [아이디어 연결] 버튼
- `src/components/trades/NewTradeDialog.tsx` — "아이디어 연결" 드롭다운 (수동 매매만)
- `src/pages/Dashboard.tsx` — 최근 아이디어 3건 영역 실제 데이터 연결

## 5. 주요 동작

**자동 저장**: 본문 변경 5초 디바운스 → 우상단 "저장됨/저장 중/저장 실패" 인디케이터
**이미지 처리**: paste/drop → 즉시 토스트 → Canvas 압축 → Storage 업로드 → 마크다운 자동 삽입
**티커 자동완성**: 기존 `kis-proxy` `stock_info`/`stock_info_overseas` 재사용 (장기투자 다이얼로그와 동일 로직)
**매매 연결 1:N 정책**: 1매매는 1아이디어. 중복 시 변경 확인 다이얼로그
**상태 전환**: 매매 연결 시 자동 'entered', 패스 시 연결 해제 옵션
**삭제**: 확인 다이얼로그 → trades.idea_id = NULL (DB 트리거), Storage 폴더 정리

## 6. 디자인 토큰

기존 시스템 준수 — 상태별 뱃지 색상은 semantic 토큰으로 매핑:
- watching: muted, entered: warning(노랑), passed: 보라 계열
- 손익: 한국식 (양수 빨강 / 음수 파랑) 기존 헬퍼 재사용
- 시장 표시: `MarketIcon` 컴포넌트 재사용

## 7. 구현 순서

1. DB 마이그레이션 + Storage 버킷 (사용자 승인)
2. 라이브러리 설치
3. 유틸리티(imageCompressor, imageUpload) + 훅(useIdeas, useLinkedTrades)
4. 페이지/컴포넌트 (Ideas, IdeaDetail, IdeaCard, MarkdownEditor, TradeLinkModal, LinkedTradesCard)
5. 기존 페이지 연동 (Trades, Dashboard, App 라우터)
6. 빌드 확인 및 검증

## 보존 사항

인증/RLS, kis-proxy Edge Function, 매매기록 8컬럼 구조, 자동 동기화, 색상 시스템, 자산관리/대시보드 기존 구조 — 모두 유지.
