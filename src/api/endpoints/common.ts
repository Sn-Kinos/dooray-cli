import type { EndpointSpec } from "../endpoint-spec.js";

export const commonEndpoints: EndpointSpec[] = [
  {
    command: "hook create",
    description: "수신 웹훅(incoming hook) 생성",
    method: "POST", path: "common/v1/incoming-hooks",
    body: {
      required: true,
      fields: 'name(봇 이름), serviceType(github|jenkins|trello|newrelic|jira|bitbucket|ifttt|incoming), projectIds(["<projectId>"])',
    },
  },
  {
    command: "hook get",
    description: "수신 웹훅 조회",
    method: "GET", path: "common/v1/incoming-hooks/{incoming-hook-id}",
  },
  {
    command: "hook delete",
    description: "수신 웹훅 삭제",
    method: "DELETE", path: "common/v1/incoming-hooks/{incoming-hook-id}",
  },
  {
    command: "stream list",
    description: "최근 2주 활동(피드) 목록. 최신순이며, 다음 페이지는 응답의 cursor 를 --before 로 넘긴다",
    method: "GET", path: "common/v1/streams",
    query: [
      { name: "size", description: "기본 20, 최대 200. 응답 건수가 size 보다 적어도 끝이 아니다" },
      { name: "before", description: "직전 응답의 cursor" },
      { name: "read", description: "읽음 여부 필터 (true/false)" },
    ],
  },
];
