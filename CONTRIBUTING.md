# 협업 규칙

## 1. 레포 구조
```
OSS-TEAM04/
├─ front/     # React + Vite (Vercel 배포)
├─ backend/   # Express + MySQL (Docker → AWS EC2)
└─ docs/      # 기획 문서
```

## 2. 브랜치 전략
| 브랜치 | 용도 |
|---|---|
| `main` | 배포·제출용. `develop`이 안정되면 PR로만 반영 |
| `develop` | **기본 브랜치**. 모든 작업 PR이 모이는 곳 |
| `feat/#이슈번호-설명` | 새 기능 |
| `fix/#이슈번호-설명` | 버그 수정 |
| `refactor/#이슈번호-설명` | 리팩토링 |
| `docs/…`, `chore/…`, `test/…`, `deploy/…` | 문서 / 설정·기타 / 테스트 / 배포 |

예: `feat/#12-llm-extract`, `fix/#20-date-filter`

### 작업 흐름
1. 이슈 생성 (템플릿 사용, Assignee·라벨 지정)
2. `develop`에서 브랜치 생성
   ```bash
   git switch develop && git pull
   git switch -c feat/#12-llm-extract
   ```
3. 작업 후 커밋, push
4. `develop`으로 PR 생성 (본문에 `close #12`)
5. 리뷰 후 **Squash and merge**, 머지된 브랜치는 삭제

## 3. 커밋 메시지
```
<타입>: <요약> (#이슈번호)
```
| 타입 | 의미 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 코드 개선 |
| `docs` | 문서 |
| `test` | 테스트 추가·수정 |
| `chore` | 설정, 패키지, 빌드 등 |
| `deploy` | 배포 관련 |

예: `feat: 분실물 자연어 속성 추출 API 추가 (#12)`

## 4. 라벨
| 분류 | 라벨 |
|---|---|
| 작업 유형 | `feat` `fix` `bug` `refactor` `docs` `test` `chore` `deploy` |
| 영역 | `FE` `BE` `DB` `LLM` `Infra` |
| 담당자 | `이용민` `권민수` `김창현` |

이슈·PR마다 **작업 유형 1개 + 영역 + 본인 라벨**을 붙입니다.

## 5. 주의
- API 키(경찰청, Gemini)와 `.env`는 **절대 커밋하지 않습니다**. 필요한 변수는 `.env.example`에 키 이름만 적습니다.
- 계산 규칙(`backend/src/rules/`)은 순수 함수로 작성하고 테스트를 함께 올립니다.
