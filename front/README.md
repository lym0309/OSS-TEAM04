# front

React + Vite (JavaScript) · react-router · Vercel 배포

## 실행
```bash
npm install
npm run dev      # http://localhost:5173  (/api 요청은 localhost:3000 백엔드로 프록시)
npm test         # 단위 테스트 (Vitest)
npm run lint     # oxlint
npm run build    # dist/ 생성
```
개발 중에는 **http://localhost:5173/dev/ui** 에서 공용 UI(토큰·버튼·칩·태그·점수 링·썸네일)를 한눈에 볼 수 있어요. (배포 빌드에는 포함되지 않음)

## 구조
```
src/
├─ api/client.js         # 백엔드 호출 유틸 (VITE_API_URL)
├─ styles/
│  ├─ tokens.css         # 디자인 토큰 (CSS 변수) ← 색·모양은 여기 값만 사용
│  ├─ base.css           # 기본 스타일 (Pretendard, 배경)
│  └─ components.css     # 공용 클래스: .btn .btn-primary .btn-secondary .card .chip .match-tag .badge-new .disclaimer
├─ shared/               # 세 명이 같이 쓰는 것
│  ├─ types.js           # 공유 데이터 형태 SearchCondition / MatchTag / MatchResult (JSDoc)
│  ├─ codes.js           # 경찰청 코드표 (대분류·지역·색 계열·기간) + 헬퍼
│  ├─ thumbnail.js       # 썸네일 규칙 (사진 → 대분류 이미지 → 📦 기타)
│  ├─ Thumbnail.jsx      # 썸네일 컴포넌트
│  └─ ScoreRing.jsx      # 매칭 점수 링
├─ components/           # 레이아웃 (Layout, Sidebar), Placeholder
├─ pages/                # 라우트별 화면
├─ App.jsx               # 라우팅
└─ main.jsx
test/                    # 단위 테스트
```

## 라우트
| 주소 | 화면 | 시안 | 담당 |
|---|---|---|---|
| `/` | 메인 입력 | 2a | @lym0309 |
| `/confirm/:lostItemId` | 조건 확인·수정 | 3a / 3b | @lym0309 |
| `/results/:lostItemId` | 매칭 결과 | 1a / 1b | @kim-ch2 |
| `/results/:lostItemId?new=1` | 신규 습득물 확인 | 6a / 6b | @kwonminsooo |
| `/items/:atcId/:fdSn` | 습득물 상세 | 4a | @kim-ch2 |
| `/browse` | 전체 습득물 | 7a | @kim-ch2 |
| `/history` (`?code=`면 코드 입력 포커스) | 검색 기록 · 조회 코드 | 5a | @kwonminsooo |

화면 사이에는 `lostItemId`만 넘깁니다. 각 페이지 파일의 `TODO`를 실제 화면으로 바꿔 주세요.

## 스타일 규칙
- **CSS 프레임워크(Tailwind 등) 사용 금지.** 순수 CSS 파일로 작성하고, 컴포넌트 옆에 `이름.css`를 두고 import 해요.
- 색·모양은 hex를 직접 쓰지 말고 `tokens.css`의 변수를 써요. 예: `color: var(--color-primary)`
- 공용 컴포넌트 사용 예
  ```jsx
  import Thumbnail from '../shared/Thumbnail.jsx'
  import ScoreRing from '../shared/ScoreRing.jsx'

  <Thumbnail item={item} size={96} />     // 결과 카드
  <Thumbnail item={item} height={150} />  // 전체 습득물 카드
  <ScoreRing score={item.score} />
  ```

## Vercel 배포
- Root Directory: `front`
- Environment Variable: `VITE_API_URL=https://api.<도메인>`
- `vercel.json`이 모든 경로를 `index.html`로 보내 새로고침해도 라우팅이 유지됨
