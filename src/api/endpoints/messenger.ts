import type { EndpointSpec } from "../endpoint-spec.js";

export const messengerEndpoints: EndpointSpec[] = [
  {
    command: "messenger channel create",
    description: "대화방 생성 (direct|private). 이미 있으면 CHANNEL_ALREADY_EXISTS_ERROR(-300101)",
    method: "POST", path: "messenger/v1/channels",
    query: [{ name: "idType", description: "memberIds 의 종류 (email|member-id)", required: true }],
    body: { required: true, fields: "type(direct|private), capacity(인원), memberIds[](멤버 id 또는 이메일), title(이름)" },
  },
  {
    command: "messenger channel member join",
    description: "대화방에 멤버 추가",
    method: "POST", path: "messenger/v1/channels/{channel-id}/members/join",
    body: { required: true, fields: "memberIds[](멤버 id)" },
  },
  {
    command: "messenger channel member leave",
    description: "대화방에서 멤버 제거",
    method: "POST", path: "messenger/v1/channels/{channel-id}/members/leave",
    body: { required: true, fields: "memberIds[](멤버 id)" },
  },
  {
    command: "messenger log update",
    description: "메시지 수정",
    method: "PUT", path: "messenger/v1/channels/{channel-id}/logs/{log-id}",
    body: { required: true, fields: "text(새 내용, 필수)" },
  },
  {
    command: "messenger log delete",
    description: "메시지 삭제",
    method: "DELETE", path: "messenger/v1/channels/{channel-id}/logs/{log-id}",
  },
  {
    command: "messenger log reply",
    description: "특정 메시지에 답장",
    method: "POST", path: "messenger/v1/channels/{channel-id}/logs/{log-id}/reply",
    body: { required: true, fields: "text(답장 내용, 필수)" },
  },
];
