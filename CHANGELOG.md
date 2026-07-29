# 변경 이력

OWKR Balance의 운영 배포 내용을 날짜별로 정리한 문서입니다.

## 작성 기준

- GitHub Actions와 GitHub Deployments에서 성공한 `Production` 및 `github-pages` 배포를 기준으로 작성했습니다.
- 날짜는 한국 표준시(`Asia/Seoul`) 기준이며, 같은 날의 여러 커밋은 마지막 운영 배포에 포함된 내용으로 묶었습니다.
- `Preview` 배포는 제외했습니다.
- 별도의 Git 태그나 GitHub Release가 없어 버전 대신 배포 날짜와 기준 커밋을 사용합니다.

| 기간 | 운영 배포 대상 |
| --- | --- |
| 2025-09-27 ~ 2026-01-16 | GitHub Pages |
| 2026-01-16 ~ 2026-07-13 | Vercel Production |
| 2026-07-16 ~ 2026-07-26 | GitHub Pages |
| 2026-07-28 ~ 현재 | Vercel Production |

## 2026-07-29

배포: Vercel Production · 기준 커밋: [`64fd34a`](https://github.com/Overwatch-KR/owkr-balance/commit/64fd34ab3c6a99640a666925ff97becbaffb0542)

- 플레이어 식별 기준을 변경 가능한 닉네임 대신 Discord ID로 전환했습니다.
- 기존 명단의 Discord 계정을 다시 연결하고, 누락된 Discord 표시 이름을 보존하도록 보완했습니다.
- 검토 과정에서 수정한 참가자 명단이 공용 유저 시트에도 동기화되도록 개선했습니다.

## 2026-07-28

배포: Vercel Production · 기준 커밋: [`8a0b42d`](https://github.com/Overwatch-KR/owkr-balance/commit/8a0b42d85b22611129e055aff4d920b480f40c16)

- Discord OAuth와 Redis 기반 영구 저장 API를 추가하고 운영 배포를 Vercel로 전환했습니다.
- 운영진이 함께 사용하는 유저 시트 조회·인라인 편집·저장·동기화 기능을 추가했습니다.
- 유저 시트에 운영 메모를 통합하고, 일반 조회 및 이미지 내보내기에서는 비공개 메모가 노출되지 않도록 했습니다.
- 잘못된 Discord 명단 항목과 역할 회피 설정을 가져오기 전에 검증하고, 문제 항목을 수정하거나 닫을 수 있도록 피드백을 개선했습니다.
- 동시 편집 충돌과 세션 만료를 보강하고 매치 세션을 30분 후 만료하도록 했습니다.
- 참가자 목록 스크롤, 맞대결 행 높이, 파비콘 등 화면 세부 동작을 정리했습니다.
- 풀 리퀘스트와 `main` 푸시에서 타입 검사·테스트·빌드를 실행하는 검증 워크플로를 구성했습니다.

## 2026-07-26

배포: GitHub Pages · 기준 커밋: [`52b2d8f`](https://github.com/Overwatch-KR/owkr-balance/commit/52b2d8f66f12d1caa7799d4b03d861352a400455)

- 한 플레이어가 하나의 회피 역할만 선택할 수 있도록 입력과 파서를 일관되게 제한했습니다.
- 참가자 대조 시 중복 매칭을 막고 각 참가자를 일대일로 비교하도록 수정했습니다.
- 명단 누락·중복·불일치 항목을 더 명확히 확인할 수 있도록 참가자 점검 화면을 개선했습니다.

## 2026-07-24

배포: GitHub Pages · 기준 커밋: [`04e1275`](https://github.com/Overwatch-KR/owkr-balance/commit/04e1275fbc49fa93c596bfe3bc7d4d217b172a7c)

- 밸런스 요약과 역할별 맞대결 결과의 상호작용 및 설명을 개선했습니다.
- 온보딩 진행 상태를 저장하고, 중단한 위치에서 재개할 수 있는 안내 흐름을 추가했습니다.
- 점수 추정이 없는 미배치 상태를 중립적으로 표시하는 티어 변형을 추가했습니다.

## 2026-07-23

배포: GitHub Pages · 기준 커밋: [`7bbdede`](https://github.com/Overwatch-KR/owkr-balance/commit/7bbdedefa3453eca650e1f868065fe5b7dc667aa)

- 참가자 입력에서 마이크 사용 여부를 직접 지정할 수 있도록 했습니다.
- 탱커 간 전력 차이가 과도한 조합을 피하는 밸런싱 안전장치를 추가했습니다.
- 명단 입력부터 팀 생성까지 주요 기능을 단계별로 안내하는 온보딩을 추가했습니다.

## 2026-07-21

배포: GitHub Pages · 기준 커밋: [`25306d6`](https://github.com/Overwatch-KR/owkr-balance/commit/25306d6c0b656147c513bb6a9ee5d585bc0f32fe)

- 밸런스 요약과 역할별 맞대결 표의 정보 구조를 다듬었습니다.
- 브라우저 화면과 Discord 공유 이미지에서 결과가 일관되게 보이도록 레이아웃을 정리했습니다.

## 2026-07-20

배포: GitHub Pages · 기준 커밋: [`2009dd7`](https://github.com/Overwatch-KR/owkr-balance/commit/2009dd73c9ce865105c584869cf2736db9585629)

- 대량 명단 가져오기와 참가자 편집 흐름을 개선했습니다.
- 팀 결과에 밸런스 요약을 추가하고 역할별 맞대결 표의 가독성과 상호작용을 강화했습니다.
- 입력 데이터 정규화와 밸런싱 결과 모델을 보완했습니다.

## 2026-07-19

배포: GitHub Pages · 기준 커밋: [`338d8e9`](https://github.com/Overwatch-KR/owkr-balance/commit/338d8e97fadf49467155f340551246b8f0e8a23f)

- 선호·회피 역할 조합을 정규화해 모순된 역할 설정이 저장되지 않도록 했습니다.
- 결과 이미지 캡처 시 화면 상태와 선호 역할 표시가 일관되도록 수정했습니다.

## 2026-07-18

배포: GitHub Pages · 기준 커밋: [`9f8f01f`](https://github.com/Overwatch-KR/owkr-balance/commit/9f8f01f14e0f4077786249442d3c2ffd4edc1a7e)

- 입력 명단과 실제 참가자를 비교해 누락·추가 인원을 검토하는 참가자 점검 기능을 추가했습니다.
- 매치 결과 검토 화면과 안내를 개선했습니다.
- 참가자 비교 입력을 브라우저 저장소에 유지하도록 수정했습니다.

## 2026-07-16

배포: GitHub Pages · 기준 커밋: [`2e81f9f`](https://github.com/Overwatch-KR/owkr-balance/commit/2e81f9f3403c2922e195133e929d227b01cf9ef7)

- 매치 결과에서 각 플레이어의 전체 역할 티어를 확인할 수 있도록 했습니다.
- 역할 티어 표시와 Discord 이미지 내보내기 레이아웃을 통일했습니다.
- 정적 호스팅 구성을 Vercel에서 GitHub Pages로 전환했습니다.
- 프로젝트 라이선스 안내를 현재 정책에 맞게 정리했습니다.

## 2026-07-13

배포: Vercel Production · 기준 커밋: [`b30feec`](https://github.com/Overwatch-KR/owkr-balance/commit/b30feecc806ed5c316526580330eb25e2d129901)

- Discord 사용자 정보와 배틀태그 표시를 정리하고 기존 참가자의 Discord 이름을 보완했습니다.
- 유사한 팀 조합만 반복되지 않도록 상위 밸런싱 후보를 다양화했습니다.
- 역할별 맞대결 결과와 Discord 이미지 내보내기 가독성을 개선했습니다.
- 참가자 추가·수정·삭제 및 팀 생성 흐름을 간소화했습니다.
- 밸런싱 계산을 Web Worker와 독립 유틸리티로 분리하고 핵심 파서·알고리즘 테스트를 보강했습니다.

## 2026-07-09

배포: Vercel Production · 기준 커밋: [`a95b6f0`](https://github.com/Overwatch-KR/owkr-balance/commit/a95b6f0f6855764d3c9c5090de056f8325a8ef10)

- Discord 관리자 허용 목록을 복원하고 로그인·참가자 입력 흐름을 개선했습니다.
- 로그인 화면에 애니메이션 랜덤 배경을 추가했습니다.
- 참가자 입력 안내 문구와 Discord 이미지 내보내기 가독성을 다듬었습니다.
- Vercel 패키지와 브라우저 호환성 데이터를 갱신했습니다.

## 2026-07-08

배포: Vercel Production · 기준 커밋: [`0dda741`](https://github.com/Overwatch-KR/owkr-balance/commit/0dda741684b911e97ab8cea874d2d32a66220ccf)

- 참가자 추가 단계를 단순화하고 입력 화면의 상태 전환을 개선했습니다.
- 사용하지 않는 참가자 히스토리 API와 클라이언트 로직을 제거했습니다.

## 2026-06-09

배포: Vercel Production · 기준 커밋: [`f5f77f6`](https://github.com/Overwatch-KR/owkr-balance/commit/f5f77f69a6a96b681b2d506390b29657e8ba4894)

- 가능한 경우 플레이어를 비선호 역할에 배치하지 않도록 밸런싱 우선순위를 개선했습니다.
- 참가자 목록과 입력 화면에서 회피 역할을 확인할 수 있도록 했습니다.

## 2026-05-12

배포: Vercel Production · 기준 커밋: [`32e962b`](https://github.com/Overwatch-KR/owkr-balance/commit/32e962ba4d26f1d17882ae4e95b8c16820388266)

- `?` 표기와 역할별 회피 페널티를 추가해 비선호 역할을 파싱하고 밸런싱에 반영했습니다.
- `!`, `?`, 별표, 배치 중·예상 티어 등 Discord 명단 표기 변형을 더 폭넓게 처리하도록 파서를 개선했습니다.
- 닉네임과 역할 티어가 여러 줄로 분리된 명단을 가져올 수 있도록 했습니다.

## 2026-04-06

배포: Vercel Production · 기준 커밋: [`bf3498b`](https://github.com/Overwatch-KR/owkr-balance/commit/bf3498b911c801206988eabb6eea0ad2939bad80)

- 플레이어 이름에 마우스를 올리면 모든 역할 티어를 확인할 수 있는 툴팁을 추가했습니다.
- 결과 이미지를 만들 때 커스텀 게임 코드가 포함되지 않도록 했습니다.

## 2026-03-30

배포: Vercel Production · 기준 커밋: [`9f2146d`](https://github.com/Overwatch-KR/owkr-balance/commit/9f2146d29b4edfa588c28474ce78d2f2c7a3a241)

- 비선형 티어 점수, 역할별 전력 차이 평가, 탐색 가지치기를 적용해 밸런싱 품질과 계산 성능을 개선했습니다.
- 상위 3개 팀 조합, 밸런스 지표, 역할별 맞대결 표를 추가했습니다.
- 커스텀 게임 코드와 공수 진영 정보를 결과에 포함했습니다.
- Upstash Redis 기반 참가자 히스토리를 추가했습니다.
- 프로젝트 라이선스를 All Rights Reserved로 변경했습니다.

## 2026-02-09

배포: Vercel Production · 기준 커밋: [`546c012`](https://github.com/Overwatch-KR/owkr-balance/commit/546c012f28d4239ca6c9cef9edfd6ad0b7da944a)

- 티어 균형을 평가하는 목적 함수를 추가했습니다.
- 역할 선호와 팀 점수 차이를 함께 비교하는 합성 점수 기반 밸런싱 알고리즘을 적용했습니다.

## 2026-01-23

배포: Vercel Production · 기준 커밋: [`f8fde3b`](https://github.com/Overwatch-KR/owkr-balance/commit/f8fde3bf86d8e31b5a43a997c974b8493792ff98)

- README의 사용 방법과 프로젝트 안내를 갱신했습니다.

## 2026-01-22

배포: Vercel Production · 기준 커밋: [`9dab79f`](https://github.com/Overwatch-KR/owkr-balance/commit/9dab79fa347d889bda9015a4975e2b72959b9ba3)

- README의 설치 및 실행 안내를 보완했습니다.

## 2026-01-21

배포: Vercel Production · 기준 커밋: [`4ab692e`](https://github.com/Overwatch-KR/owkr-balance/commit/4ab692e3acc4c15f4c1267d55d35d3d80d2c0c25)

- Discord 채팅에서 사용하는 역할·티어 이모지를 참가자 정보로 파싱할 수 있도록 했습니다.

## 2026-01-20

배포: Vercel Production · 기준 커밋: [`deab853`](https://github.com/Overwatch-KR/owkr-balance/commit/deab853f3ff2bf4fd32ef450078b51869624fbb8)

- 패키지 관리 명령을 pnpm으로 통일하고 환경 변수 예시를 추가했습니다.
- Pretendard 글꼴과 Tailwind 기반 화면 스타일을 적용했습니다.
- 참가자 입력·목록·팀 결과·티어 선택 UI를 역할별 컴포넌트로 정리했습니다.
- 플레이어와 최근 팀 결과를 브라우저 저장소에 유지하도록 개선했습니다.
- Vercel Analytics를 연결했습니다.
- Discord 공유 이미지 렌더링 오류를 수정했습니다.

## 2026-01-16

배포: Vercel Production 및 GitHub Pages · 기준 커밋: [`105a199`](https://github.com/Overwatch-KR/owkr-balance/commit/105a199ac0268a754d2bfb27ba6b3f3775df8431), [`0b23dbb`](https://github.com/Overwatch-KR/owkr-balance/commit/0b23dbbc7d6fc84689addcd64a7934e19d24a87d)

- 레거시 구현을 제거하고 JavaScript 코드를 TypeScript로 전환했습니다.
- Discord OAuth 로그인·로그아웃과 인증 상태에 따른 로딩 화면을 추가했습니다.
- 참가자 입력, 팀 카드, 결과 화면과 밸런싱 상태 관리를 리팩터링했습니다.
- 밸런싱 실행 중 상태 갱신과 결과 처리 오류를 수정했습니다.
- 라이선스, 환경 변수, 프로젝트 문서를 정리했습니다.

## 2026-01-15

배포: GitHub Pages · 기준 커밋: [`ba9bcf4`](https://github.com/Overwatch-KR/owkr-balance/commit/ba9bcf429cd3b9dd0059c53ad381a84988fef727)

- 기존 애플리케이션을 React 기반 구조와 컴포넌트 UI로 전환했습니다.

## 2025-10-10

배포: GitHub Pages · 기준 커밋: [`86b46aa`](https://github.com/Overwatch-KR/owkr-balance/commit/86b46aa6b44b06b56f5ee4e5696c16c54a92b3d3)

- 탱커와 딜러 티어 차이로 팀 전력이 치우치던 문제를 수정했습니다.
- 애플리케이션 파비콘을 추가했습니다.

## 2025-10-08

배포: GitHub Pages · 기준 커밋: [`39d4d4f`](https://github.com/Overwatch-KR/owkr-balance/commit/39d4d4fd448df2ab3d23674964e1a1ef6c58e607)

- README의 프로젝트 설명과 사용 안내를 갱신했습니다.

## 2025-10-03

배포: GitHub Pages · 기준 커밋: [`47d7c7d`](https://github.com/Overwatch-KR/owkr-balance/commit/47d7c7dff4dc03316291c02e7e9bccb9480de68e)

- 팀 조합 평가 우선순위를 조정했습니다.
- 팀 배정 및 결과 표시 오류를 수정했습니다.

## 2025-09-27

배포: GitHub Pages · 기준 커밋: [`7676042`](https://github.com/Overwatch-KR/owkr-balance/commit/7676042a0013446fc6adc60c05cf42cbe4880988)

- OWKR 팀 밸런싱 도구의 첫 버전을 공개했습니다.
- 참가자 입력과 팀 생성 사용 방법을 추가했습니다.
