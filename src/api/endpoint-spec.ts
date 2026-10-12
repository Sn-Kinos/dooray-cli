/**
 * 공식 문서의 endpoint 하나를 CLI 명령 하나로 옮기는 명세. 명령은 `commands/endpoint-command.ts` 가 만든다 (ADR-069).
 *
 * `method` 와 `path` 는 한 줄에 이 순서로 쓴다. `scripts/api-endpoint-inventory.mjs` 가 그 모양으로 읽는다.
 * `path` 는 공식 문서 표기 그대로다. `{...}` 자리는 순서대로 positional 인자가 된다.
 * `admin/` 으로 시작하면 관리 API 토큰과 주소로 부른다.
 */
import type { HttpMethod } from "./client.js";

export interface ParamSpec {
  /** API 의 파라미터 이름. 옵션 이름은 이것을 kebab-case 로 바꾼 것이다 */
  name: string;
  description: string;
  required?: boolean;
}

export interface EndpointSpec {
  /** 공백으로 나눈 명령 경로. 예: "drive file copy" */
  command: string;
  description: string;
  method: HttpMethod;
  path: string;
  query?: ParamSpec[];
  /** 항상 같은 값으로 보내는 쿼리. 같은 경로를 `media=meta`·`media=raw` 로 나눠 쓰는 endpoint 에 쓴다 */
  fixedQuery?: Record<string, string>;
  /** 요청 헤더. 옵션 이름은 헤더 이름을 소문자로 바꾼 것이다 (`X-DLP-Inspection` → `--x-dlp-inspection`) */
  headers?: ParamSpec[];
  /** JSON 본문. `--data`/`--data-file` 로 받는다. 값은 도움말에 보일 필드 요약이다 */
  body?: { fields: string; required?: boolean };
  /** multipart 업로드. 마지막 positional 이 파일 경로다. fields 는 file 보다 먼저 붙는다 */
  upload?: { fields?: ParamSpec[] };
  /** 응답 본문이 파일이다. `-o` 로 저장 위치를 받는다 */
  download?: boolean;
  /** 되돌릴 수 없는 호출이다. `-y` 없이는 확인을 받는다. DELETE 는 따로 적지 않아도 확인한다 */
  destructive?: boolean;
}
