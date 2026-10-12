import type { EndpointSpec, ParamSpec } from "../endpoint-spec.js";

const MIGRATE_FILE_TYPE: ParamSpec = {
  name: "type",
  description: "inline_image(첨부 목록에 안 보임) | general(첨부 목록에 보임)",
};
const MIGRATE_FILE_BODY: ParamSpec = {
  name: "body",
  description: 'JSON 문자열: {"creator":{"emailAddress","name"},"createdAt":"ISO-8601"}',
};
const DLP_HEADER: ParamSpec = {
  name: "X-DLP-Inspection",
  description: "DLP 검사 여부: required | skip (기본 skip)",
};
const ATTACH_LIMIT = "게시판 설정(개수 기본 10, 용량 기본 30MB)을 넘으면 올라가지 않는다";

export const adminServiceEndpoints: EndpointSpec[] = [
  {
    command: "admin service mail list",
    description: "사용자 메일함의 최근 메일 간략 목록 (최대 20개, 포틀릿용)",
    method: "GET", path: "admin/v1/services/mail/members/{member-id}/mails",
    query: [
      { name: "size", description: "기본 10, 최대 20" },
      { name: "folderName", description: "inbox(기본) | sent" },
      { name: "read", description: "true 면 읽은 메일만, false 면 안 읽은 메일만. 없으면 전부" },
    ],
  },
  {
    command: "admin service mail retrieve",
    description: "사용자 메일함에서 조건과 일치하는 메일 회수. 수신 24시간 이내이거나 안 읽은 메일만, 일치하는 메일이 2통 이상이면 회수하지 않는다",
    method: "POST", path: "admin/v1/services/mail/members/{member-id}/mails/retrieve",
    body: { required: true, fields: "mimeMessageId(Message-ID 헤더), headerFrom(From 헤더 주소), subject(제목)" },
    destructive: true,
  },
  {
    command: "admin service contacts create",
    description: "사용자 주소록에 연락처 추가 (마이그레이션용)",
    method: "POST", path: "admin/v1/services/contacts/members/{member-id}/contacts",
    body: {
      required: true,
      fields: "name, firstName, lastName, nickname, jobTitle, company, department, note, favorited, addresses[], phones[], emails[], urls[], socialMedia[], anniversaries[], labelNames[](없으면 라벨 생성)",
    },
  },
  {
    command: "admin service contacts get",
    description: "사용자 주소록 연락처 하나 조회 (전체 목록 조회는 관리 API 에 없다)",
    method: "GET", path: "admin/v1/services/contacts/members/{member-id}/contacts/{contact-id}",
  },
  {
    command: "admin service contacts update",
    description: "사용자 주소록 연락처 하나 수정",
    method: "PUT", path: "admin/v1/services/contacts/members/{member-id}/contacts/{contact-id}",
    body: {
      required: true,
      fields: "name, firstName, lastName, nickname, jobTitle, company, department, note, favorited, addresses[], phones[], emails[], urls[], socialMedia[], anniversaries[], labelNames[](없으면 라벨 생성)",
    },
  },
  {
    command: "admin service contacts delete",
    description: "사용자 주소록 연락처 하나 삭제",
    method: "DELETE", path: "admin/v1/services/contacts/members/{member-id}/contacts/{contact-id}",
  },
  {
    command: "admin service project task list",
    description: "사용자의 담당/참조 업무 최근 7건 (toMemberId, ccMemberId 중 하나 필수, 둘 다 주면 toMemberId)",
    method: "GET", path: "admin/v1/services/project/projects/*/tasks",
    query: [
      { name: "toMemberId", description: "담당 업무를 조회할 멤버 ID" },
      { name: "ccMemberId", description: "참조 업무를 조회할 멤버 ID" },
    ],
  },
  {
    command: "admin service task draft create",
    description: "사용자 업무 임시보관함에 업무 생성. 응답 url 은 도메인 없는 쓰기창 경로다",
    method: "POST", path: "admin/v1/services/task/members/{member-id}/drafts",
    body: {
      required: true,
      fields: "users.to[](담당자, member|emailUser), users.cc[](참조자), subject(제목), body.mimeType(text/html|text/x-markdown), body.content, priority(highest|high|normal|low|lowest|none)",
    },
  },
  {
    command: "admin service task draft attach",
    description: "임시보관 업무에 파일 첨부",
    method: "POST", path: "admin/v1/services/task/members/{member-id}/drafts/{draft-id}/files",
    upload: {},
  },
  {
    command: "admin service calendar event list",
    description: "사용자 일정 목록. 기간 51일 미만, 결과 300개 초과면 오류",
    method: "GET", path: "admin/v1/services/calendar/members/{member-id}/calendars/*/events",
    query: [
      { name: "timeMin", description: "이 시각 이후(포함). ISO 8601 예: 2024-01-01T00:00:00+09:00", required: true },
      { name: "timeMax", description: "이 시각 미만. ISO 8601", required: true },
    ],
  },
  {
    command: "admin service calendar busy-hours",
    description: "멤버들의 일정 점유 시간과 근무 시간 조회. 최대 20명, 기간 최대 7일",
    method: "POST", path: "admin/v1/services/calendar/fetch-busy-hours",
    body: { required: true, fields: "organizationMemberIds[](멤버 ID, 이 순서로 응답), beginDateTime(시작 ISO 8601), endDateTime(끝 ISO 8601)" },
  },
  {
    command: "admin service reservation resource list",
    description: "멤버 기준으로 예약 가능한 자원 조회 (현재 회의실만)",
    method: "GET", path: "admin/v1/services/reservation/reservable-resources",
    query: [
      { name: "resourceCategoryType", description: "meetingRoom (현재 이것만 지원)", required: true },
      { name: "timeMin", description: "시작 시각 ISO 8601. 현재보다 앞일 수 없다", required: true },
      { name: "timeMax", description: "끝 시각 ISO 8601. timeMin 보다 앞일 수 없다", required: true },
      { name: "fromOrganizationMemberId", description: "기준 멤버 ID", required: true },
    ],
  },
  {
    command: "admin service reservation create",
    description: "자원 예약",
    method: "POST", path: "admin/v1/services/reservation/resource-reservations",
    body: {
      required: true,
      fields: "resourceId(필수, reservation resource list 의 id), startedAt(필수), endedAt(필수), subject(필수), body.mimeType(text/x-markdown), body.content, users.from(필수, 예약자), users.to[](필수 참석자), users.cc[](선택 참석자), createCalenderEvent(캘린더 일정 등록 여부)",
    },
  },
  {
    command: "admin service reservation delete",
    description: "자원 예약 취소. fromOrganizationMemberId 멤버의 예약만 취소할 수 있다",
    method: "DELETE", path: "admin/v1/services/reservation/resource-reservations/{resource-reservation-id}",
    query: [{ name: "fromOrganizationMemberId", description: "예약자 멤버 ID", required: true }],
  },
  {
    command: "admin service board article recent",
    description: "멤버가 읽을 수 있는 최근 게시글 조회",
    method: "GET", path: "admin/v1/services/board/members/{member-id}/articles/recent",
    query: [
      { name: "board_id", description: "게시판 ID. 없으면 접근 가능한 전체 게시판" },
      { name: "createdWithIn", description: "생성 기간 1d ~ 7d (기본 7d)" },
    ],
  },
  {
    command: "admin service board article list",
    description: "특정 게시판에서 멤버가 읽을 수 있는 게시글 목록",
    method: "GET", path: "admin/v1/services/board/members/{member-id}/organizations/{organization-id}/boards/{board-id}/articles",
    query: [
      { name: "page", description: "페이지 번호 0 ~ n-1 (기본 0)" },
      { name: "size", description: "페이지당 개수 1 ~ 20 (기본 5)" },
    ],
  },
  {
    command: "admin service board article generate-id",
    description: "게시판 마이그레이션 1단계: 게시글 ID 생성. 이 ID 로 article migrate, migrate-file 을 부른다. board-id 는 웹 게시판 URL /home/{board-id}",
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/generate-article-id",
  },
  {
    command: "admin service board article migrate",
    description: "게시판 마이그레이션: generate-id 로 만든 ID 에 게시글 작성. 말머리는 게시판에 있는 것만, 작성자 이메일이 멤버 한 명과 맞으면 그 멤버로 등록",
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/{article-id}/migrate-article",
    headers: [DLP_HEADER],
    body: {
      required: true,
      fields: "subject(제목), heading.value(말머리, null 이면 없음), creator.emailAddress, creator.name, body.mimeType(필수, text/html|text/x-markdown), body.content, createdAt(ISO-8601)",
    },
  },
  {
    command: "admin service board article migrate-file",
    description: `게시판 마이그레이션: 게시글에 첨부파일 업로드. ${ATTACH_LIMIT}`,
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/{article-id}/migrate-file",
    headers: [DLP_HEADER],
    query: [MIGRATE_FILE_TYPE],
    upload: { fields: [MIGRATE_FILE_BODY] },
  },
  {
    command: "admin service board comment generate-id",
    description: "게시판 마이그레이션: 게시글의 댓글 ID 생성. 이 ID 로 comment migrate, migrate-file 을 부른다",
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/{article-id}/comments/generate-comment-id",
  },
  {
    command: "admin service board comment migrate",
    description: "게시판 마이그레이션: generate-id 로 만든 ID 에 댓글 작성",
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/{article-id}/comments/{comment-id}/migrate-comment",
    headers: [DLP_HEADER],
    body: {
      required: true,
      fields: "creator.emailAddress, creator.name, body.mimeType(필수, text/html|text/x-markdown), body.content(댓글 본문), createdAt(ISO-8601)",
    },
  },
  {
    command: "admin service board comment migrate-file",
    description: `게시판 마이그레이션: 댓글에 첨부파일 업로드. ${ATTACH_LIMIT}`,
    method: "POST", path: "admin/v1/services/boards/{board-id}/articles/{article-id}/comments/{comment-id}/migrate-file",
    headers: [DLP_HEADER],
    query: [MIGRATE_FILE_TYPE],
    upload: { fields: [MIGRATE_FILE_BODY] },
  },
];
