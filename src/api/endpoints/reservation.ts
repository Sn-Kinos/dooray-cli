import type { EndpointSpec } from "../endpoint-spec.js";

const reservationFields =
  "resourceId(자원 id), subject(내용), startedAt, endedAt, wholeDayFlag, class(public|private), alarms[](action: mail, trigger), recurrenceRule(frequency, interval, until, byday, bymonthday, bymonth, timezoneName)";

export const reservationEndpoints: EndpointSpec[] = [
  {
    command: "reservation category list",
    description: "사용함 상태의 자원 유형 목록 (공간, 사무기기, 휴대폰, 차량)",
    method: "GET", path: "reservation/v1/resource-categories",
    query: [
      { name: "size", description: "기본 20, 최대 20" },
      { name: "page", description: "페이지 번호 (기본 0)" },
    ],
  },
  {
    command: "reservation resource list",
    description: "사용함 상태의 자원 목록 (권한 무관, 자원예약 관리자용, 페이지 크기 20)",
    method: "GET", path: "reservation/v1/resources",
    query: [{ name: "resourceCategoryId", description: "자원 유형 id" }],
  },
  {
    command: "reservation resource get",
    description: "자원 단건 조회",
    method: "GET", path: "reservation/v1/resources/{resource-id}",
  },
  {
    command: "reservation resource reservable",
    description: "내가 예약할 수 있는 자원 목록",
    method: "GET", path: "reservation/v1/reservable-resources",
    query: [{ name: "resourceCategoryId", description: "자원 유형 id. 문서엔 필수 표시가 없지만 빠지면 400", required: true }],
  },
  {
    command: "reservation list",
    description: "기간 안의 자원 예약 목록",
    method: "GET", path: "reservation/v1/resource-reservations",
    query: [
      { name: "size", description: "기본 20, 최대 20" },
      { name: "page", description: "페이지 번호 (기본 0)" },
      { name: "timeMin", description: "시작 시각 ISO8601 (예: 2022-06-01T00:00:00+09:00)", required: true },
      { name: "timeMax", description: "끝 시각 ISO8601", required: true },
      { name: "resourceIds", description: "자원 id 쉼표 목록. 없으면 전체 자원" },
    ],
  },
  {
    command: "reservation create",
    description: "자원 예약",
    method: "POST", path: "reservation/v1/resource-reservations",
    body: { required: true, fields: reservationFields },
  },
  {
    command: "reservation get",
    description: "자원 예약 조회. 반복 예약의 한 회차는 id 에 -20230202T090000Z 처럼 붙인다",
    method: "GET", path: "reservation/v1/resource-reservations/{resource-reservation-id}",
  },
  {
    command: "reservation update",
    description: "자원 예약 수정. recurrenceRule 을 바꾸면 updateType 은 whole 이어야 한다",
    method: "PUT", path: "reservation/v1/resource-reservations/{resource-reservation-id}",
    body: { required: true, fields: `${reservationFields.replace("resourceId(자원 id), ", "")}, updateType(whole|this|wholeFromThis)` },
  },
  {
    command: "reservation delete",
    description: "자원 예약 삭제",
    method: "DELETE", path: "reservation/v1/resource-reservations/{resource-reservation-id}",
    body: { fields: "deleteType(whole|this|wholeFromThis, 반복 예약만)" },
  },
];
