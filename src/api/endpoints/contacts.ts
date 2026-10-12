import type { EndpointSpec } from "../endpoint-spec.js";

export const contactsEndpoints: EndpointSpec[] = [
  {
    command: "contacts list",
    description: "내 주소록 목록",
    method: "GET", path: "contacts/v1/contacts",
    query: [
      { name: "page", description: "페이지 번호 (기본 0)" },
      { name: "size", description: "페이지 크기 (기본 20)" },
    ],
  },
  {
    command: "contacts get",
    description: "내 주소록 단건 조회",
    method: "GET", path: "contacts/v1/contacts/{contact-id}",
  },
  {
    command: "contacts search",
    description: "내 주소록 안에서 검색",
    method: "POST", path: "contacts/v1/contacts/search",
    body: { required: true, fields: 'all(검색어 배열, 예: ["홍길동"])' },
  },
];
