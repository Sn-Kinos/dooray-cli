import type { EndpointSpec } from "../endpoint-spec.js";

const eventFields =
  "users.to[]/users.cc[](참석자: member.organizationMemberId 또는 emailUser.emailAddress), subject(제목), body(mimeType, content), startedAt, endedAt, wholeDayFlag(종일이면 날짜만 2015-09-08+09:00), location, recurrenceRule(frequency, interval, until, byday, bymonth, bymonthday, timezoneName), personalSettings(alarms[], busy, class)";

export const calendarEndpoints: EndpointSpec[] = [
  {
    command: "calendar create",
    description: "캘린더 생성. 개인(private) 또는 구독(subscription) 캘린더만 되고 프로젝트 캘린더는 안 된다",
    method: "POST", path: "calendar/v1/calendars",
    body: {
      required: true,
      fields: "name(이름), type(private|subscription), calendarMemberList[](공유 멤버, private 만), me(color, notification), calendarUrl(구독 주소, subscription 만)",
    },
  },
  {
    command: "calendar get",
    description: "캘린더 상세 조회",
    method: "GET", path: "calendar/v1/calendars/{calendar-id}",
  },
  {
    command: "calendar delete",
    description: "캘린더 삭제",
    method: "DELETE", path: "calendar/v1/calendars/{calendar-id}",
  },
  {
    command: "calendar member set",
    description: "캘린더 멤버 설정. 마스터 외 멤버 전체를 주어진 목록으로 덮어쓴다 (마스터는 바꿀 수 없다)",
    method: "PUT", path: "calendar/v1/calendars/{calendar-id}/members",
    destructive: true,
    body: {
      required: true,
      fields: "calendarMemberList[](type(member|distributionList), member.organizationMemberId 또는 distributionList.emailAddress, role(delegatee|all|read_write|view|opaque_view))",
    },
  },
  {
    command: "calendar event create",
    description: "일정 등록",
    method: "POST", path: "calendar/v1/calendars/{calendar-id}/events",
    body: { required: true, fields: eventFields },
  },
  {
    command: "calendar event update",
    description: "일정 수정. 빈 값이 아닌 필드만 바뀐다",
    method: "PUT", path: "calendar/v1/calendars/{calendar-id}/events/{event-id}",
    body: { required: true, fields: eventFields },
  },
  {
    command: "calendar event delete",
    description: "일정 삭제. 반복 일정은 event-id 에 -20240228T013000Z 처럼 회차를 붙이고 deleteType 을 준다",
    method: "POST", path: "calendar/v1/calendars/{calendar-id}/events/{event-id}/delete",
    destructive: true,
    body: { fields: "deleteType(this|wholeFromThis|whole, 반복 일정만)" },
  },
  {
    command: "calendar busy-hours",
    description: "사용자별 바쁨·근무·부재 시간 조회. 최대 20명, 기간은 7일 미만",
    method: "POST", path: "calendar/v1/fetch-busy-hours",
    body: {
      required: true,
      fields: "organizationMemberIds[](최대 20), beginDateTime(ISO8601), endDateTime(begin 으로부터 7일 미만)",
    },
  },
];
