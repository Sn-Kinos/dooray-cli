# 공식 API 전체 명령

Dooray 공식 API 문서에 있는 서비스 API 와 관리 API 를 모두 명령으로 부를 수 있다.
업무·위키·메신저처럼 자주 쓰는 일은 이름 해석과 표 출력을 갖춘 명령이 따로 있다. 이 문서는 그 밖의 endpoint 를 그대로 옮긴 명령을 다룬다.

| 그룹 | 할 수 있는 일 |
| --- | --- |
| `dooray drive` | 드라이브와 파일 목록, 업로드·다운로드, 이름 바꾸기, 복사·이동, 폴더 생성, 공유 링크, 변경 내역 |
| `dooray calendar` | 캘린더 생성·삭제·멤버 설정, 일정 생성·수정·삭제, 바쁜 시간 조회 |
| `dooray messenger channel` · `log` | 대화방 생성, 들어가기·나가기, 메시지 수정·삭제·답장 |
| `dooray project` | 프로젝트 생성·수정·보관·활성화, 업무 상태, 단계, 템플릿, 멤버, 메일 주소, Hook |
| `dooray post move` · `assignee-workflow` · `draft` | 업무 이동, 담당자별 상태 변경, 임시 업무와 첨부 |
| `dooray wiki page referrer` · `shared-link` · `wiki file` | 위키 참조자 설정, 공유 링크, 위키 파일 올리기·받기 |
| `dooray reservation` | 자원 유형·자원 조회, 예약 생성·수정·삭제 |
| `dooray contacts` | 주소록 조회·검색 |
| `dooray hook` · `stream` | 수신 웹훅, 최근 2주 활동(피드) |
| `dooray admin` | 관리 API 전체. 멤버, 부서, 직책·직위, 메일 포워딩·릴레이·DL, 접근 규칙, 라이선스, 사용자 메일·일정·업무 조회, 게시판 마이그레이션 |

각 명령의 인자와 옵션은 `--help` 가 보여준다. 도움말 둘째 줄에 부르는 endpoint 가 있다.

```bash
dooray drive file list --help
#   GET /drive/v1/drives/{drive-id}/files
```

## 인자와 옵션

- 경로의 id 는 positional 인자다. 순서는 경로에 나오는 순서와 같다.
- `{project-id}` 자리에는 프로젝트 id 대신 프로젝트 코드를 줘도 된다.
- 쿼리 파라미터는 이름을 kebab-case 로 바꾼 옵션이다. `parentId` 는 `--parent-id` 다.
- 요청 본문은 JSON 으로 `--data` 또는 `--data-file` 에 준다. 값이 `-` 이면 stdin 에서 읽는다. 받을 필드는 `--data` 의 도움말에 있다.
- 파일을 올리는 명령은 마지막 인자가 파일 경로다. 받는 명령은 `-o <디렉터리>` 나 `--output-file <경로>` 로 저장 위치를 고른다.

```bash
dooray calendar event create <calendarId> --data-file event.json
echo '{"text":"수정한 내용"}' | dooray messenger log update <channelId> <logId> --data -
dooray drive file upload <driveId> ./report.pdf --parent-id <folderId>
dooray project milestone create <project> --data '{"name":"1차 출시","startedAt":"2026-11-01","endedAt":"2026-11-30"}'
```

## 출력

| 옵션 | 출력 |
| --- | --- |
| (없음) | 응답의 `result` 를 YAML 로 |
| `--json` | 응답 JSON 그대로 |
| `--quiet` | `result` 의 `id` 만. 목록이면 한 줄에 하나씩 |

응답에 다음 페이지 커서가 있으면(`stream list`) stderr 에 `cursor: <값>` 으로 알린다. 다음 호출의 `--before` 에 넘긴다.

## 확인

삭제와 되돌릴 수 없는 호출(퇴사, 일시정지, 비밀번호 변경, 전체 덮어쓰기 등)은 실행 전에 확인을 묻는다.
`-y` 로 확인을 생략한다. 터미널이 아닌 곳에서 `-y` 없이 부르면 API 를 부르지 않고 종료 코드 3 으로 끝난다.

## 관리 API

`dooray admin` 아래 명령은 관리 API 토큰으로 부른다. 관리 API 는 "Basic" 상품 이상에서 쓸 수 있고, 토큰은 Dooray 에 메일로 요청해 받는다.

```bash
printf '%s' "$ADMIN_TOKEN" | dooray config set admin-api-key -
dooray admin member list --size 20
```

주소는 개인 토큰의 `base-url` 에서 `api.` 를 `admin-api.` 로 바꿔 정한다. 다른 주소를 쓰려면 `dooray config set admin-base-url <url>` 로 정한다.

## 커스텀 사이드 앱

사이드 앱은 Dooray 가 등록한 URL 을 부르고 앱이 JSON 으로 답하는 기능이다. Business 플랜 이상에서 Admin 화면에 앱을 등록하면 인증 토큰이 한 번 보인다.
`dooray side-app serve` 가 그 URL 의 서버 역할을 한다. Dooray 가 보낸 JWT(HS512)를 인증 토큰으로 검증하고, 맞으면 JSON 파일을 그대로 응답한다.

```bash
dooray side-app check notice.json                                   # A·B 포맷 필수 필드 확인
printf '%s' "$SIDE_APP_TOKEN" | dooray side-app serve --token - --file notice.json --port 8080
dooray side-app verify <jwt> --token -                              # 받은 JWT 의 payload(email, doorayMemberId 등) 확인
```

`serve` 는 요청마다 파일을 다시 읽으므로 서버를 켠 채로 내용을 바꿀 수 있다. `iat` 가 현재 시각과 `--max-age`(기본 300초) 넘게 차이 나면 401 로 거절한다.

## SSO(OAuth) 연동 준비

Dooray 는 고객사 SSO 의 OIDC 클라이언트로 붙고, 연결 설정은 Dooray 담당자가 한다.
`dooray sso check` 는 고객사 SSO 의 메타데이터(`/.well-known/openid-configuration`)를 읽어 담당자에게 넘길 주소들을 모으고, SSO 에 Dooray 를 클라이언트로 등록할 때 쓸 값을 출력한다.

```bash
dooray sso check https://other.example.com --tenant example.dooray.com
```

빠진 endpoint, `code`·`authorization_code`·`openid` 미지원, 공개키를 받지 못하는 `jwks_uri` 를 「확인할 것」으로 알린다.
