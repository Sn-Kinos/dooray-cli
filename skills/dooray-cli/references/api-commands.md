# api-commands

공식 API 문서의 endpoint 중 다른 reference 가 다루지 않는 것은 모두 endpoint 하나가 명령 하나다.
명령을 고를 때는 그룹의 `--help` 로 목록을 보고, 명령의 `--help` 둘째 줄에서 부르는 endpoint 를 확인한다.

```bash
dooray drive --help
dooray admin member --help
dooray calendar event create --help
```

## 그룹

| 그룹 | 다루는 것 |
| --- | --- |
| `drive` | 드라이브·파일 목록, 업로드(`file upload`), 다운로드(`file download`), 이름 바꾸기, 복사·이동, 폴더, 공유 링크, 변경 내역 |
| `calendar` | `create`·`get`·`delete`, `member set`, `event create`·`update`·`delete`, `busy-hours` |
| `messenger channel` · `messenger log` | 대화방 생성, 멤버 `join`·`leave`, 메시지 `update`·`delete`·`reply` |
| `project` | `create`·`get`·`update`·`archive`·`activate`, `workflow`, `milestone`, `template`, `member`, `email-address`, `hook`, `wiki-hook`, `category` |
| `post` | `move`(다른 프로젝트로), `assignee-workflow`(담당자 한 명의 상태), `draft` |
| `wiki` | `page referrer set`, `page shared-link list`, `file upload`·`download` |
| `reservation` | 자원 유형·자원·예약 가능 자원, 예약 `create`·`get`·`update`·`delete` |
| `contacts` | 주소록 `list`·`get`·`search` |
| `hook` · `stream` | 수신 웹훅 `create`·`get`·`delete`, 최근 2주 활동 `stream list` |
| `admin` | 관리 API 전체 (관리 API 토큰 필요) |
| `side-app` | 커스텀 사이드 앱 서버(`serve`), JWT 검증(`verify`), 응답 JSON 형식 확인(`check`) |
| `sso` | 고객사 SSO(OIDC) 메타데이터 점검과 Dooray 클라이언트 등록 값 (`check`) |

## 인자·본문 규칙

- 경로의 id 는 positional 인자이고 경로 순서를 따른다. `<project-id>` 자리는 프로젝트 코드도 받는다.
- 쿼리 파라미터는 kebab-case 옵션이다 (`parentId` → `--parent-id`). 필수 쿼리는 빠지면 commander 가 막는다.
- JSON 본문은 `--data '<json>'` 또는 `--data-file <path>` 로 준다. `-` 는 stdin 이다. 필드 요약은 `--data` 도움말에 있다.
  필수 본문이 없으면 API 를 부르지 않고 종료 코드 3 으로 끝난다.
- 19자리 id 는 JSON 안에서 문자열로 쓴다. 숫자로 써도 CLI 가 문자열로 보존해 보낸다.
- 업로드는 마지막 인자가 파일 경로다. 다운로드는 `-o <dir>` 또는 `--output-file <path>` 를 쓴다.

## 출력

- 기본은 `result` 의 YAML 이다. 사람이 볼 때 쓴다.
- 다른 명령에 넘길 값은 `--json` 이나 `--quiet`(`result` 의 `id`) 로 받는다.
- `stream list` 는 다음 페이지 커서를 stderr 에 `cursor: <값>` 으로 낸다. 결과 건수가 `--size` 보다 적어도 끝이 아니다. 빈 목록이 나올 때까지 `--before <cursor>` 로 이어 부른다.

```bash
EVENT_ID=$(dooray calendar event create <calendarId> --data-file event.json --quiet)
dooray calendar event delete <calendarId> "$EVENT_ID" -y
```

## 확인이 필요한 호출

DELETE 와 되돌릴 수 없는 호출(퇴사, 일시정지, 비밀번호 변경, 로그아웃 시키기, 메일 회수, 목록 전체 덮어쓰기 등)은 확인을 거친다.
에이전트는 사용자가 실행을 승인한 뒤에만 `-y` 를 붙여 부른다. `-y` 없이 터미널 밖에서 부르면 API 를 부르지 않고 종료 코드 3 으로 끝난다.

## 관리 API

- `admin` 아래 명령은 관리 API 토큰을 쓴다. 없으면 `dooray config set admin-api-key -` 로 저장하라는 오류(종료 코드 4)가 난다.
- 관리 API 는 조직 전체에 영향을 준다. 조회가 아닌 호출은 사용자에게 무엇을 바꾸는지 보여주고 승인을 받은 뒤 부른다.
- 목록은 `--page`(0부터)·`--size`(최대 200) 로 넘긴다.
