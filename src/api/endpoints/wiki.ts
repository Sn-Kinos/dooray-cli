import type { EndpointSpec } from "../endpoint-spec.js";

export const wikiEndpoints: EndpointSpec[] = [
  {
    command: "wiki page referrer set",
    description: "위키 페이지 참조자를 주어진 목록으로 바꾼다",
    method: "PUT", path: "wiki/v1/wikis/{wiki-id}/pages/{page-id}/referrers",
    body: { required: true, fields: "referrers[](type: member, member.organizationMemberId)" },
  },
  {
    command: "wiki page shared-link list",
    description: "위키 페이지의 공유 링크 목록",
    method: "GET", path: "wiki/v1/wikis/{wiki-id}/pages/{page-id}/shared-links",
    query: [
      { name: "size", description: "기본 20, 최대 200" },
      { name: "page", description: "페이지 번호 (기본 0)" },
      { name: "valid", description: "유효한 링크만 (true/false, 기본 true)" },
    ],
  },
  {
    command: "wiki file download",
    description: "위키 첨부 파일 다운로드. attach-file-id 는 페이지 상세의 files[].attachFileId 또는 images[].attachFileId",
    method: "GET", path: "wiki/v1/wikis/{wiki-id}/attachFiles/{attach-file-id}",
    download: true,
  },
  {
    command: "wiki file upload",
    description: "위키에 파일 1개 올림 (페이지에 붙지 않은 첨부)",
    method: "POST", path: "wiki/v1/wikis/{wiki-id}/files",
    upload: { fields: [{ name: "type", description: "파일 종류. general", required: true }] },
  },
];
