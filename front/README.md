# front

React + Vite (JavaScript) · react-router · Vercel 배포

## 실행
```bash
npm install
npm run dev      # http://localhost:5173  (/api 요청은 localhost:3000 백엔드로 프록시)
npm run build    # dist/ 생성
npm run lint     # oxlint
```

## 구조
```
src/
├─ api/client.js     # 백엔드 호출 유틸 (VITE_API_URL)
├─ components/       # 공용 컴포넌트 (Layout, ServerStatus)
├─ pages/            # 라우트별 페이지
│  ├─ LostInputPage     /             분실물 입력·조건 확인
│  ├─ LookupPage        /lookup       조회 코드 입력
│  └─ MatchResultPage   /lost/:code   매칭 결과·신규 후보
├─ App.jsx           # 라우팅
└─ main.jsx
```

## Vercel 배포
- Root Directory: `front`
- Environment Variable: `VITE_API_URL=https://api.<도메인>`
- `vercel.json`이 모든 경로를 `index.html`로 보내 새로고침해도 라우팅이 유지됨
