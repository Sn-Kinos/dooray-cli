import type { EndpointSpec } from "../endpoint-spec.js";

const SCOPE = "member(손님 제외 조직 내) | memberAndGuest(조직 내 전체) | memberAndGuestAndExternal(외부 포함)";

export const driveEndpoints: EndpointSpec[] = [
  {
    command: "drive list",
    description: "드라이브 목록. 기본은 내 개인 드라이브",
    method: "GET", path: "drive/v1/drives",
    query: [
      { name: "projectId", description: "프로젝트 ID" },
      { name: "type", description: "private(개인, 기본) | project" },
      { name: "scope", description: "type=project 일 때 private(일반 프로젝트, 기본) | public(공개 프로젝트)" },
      { name: "state", description: "프로젝트 상태 active | archived | deleted, 쉼표로 여럿 (기본 active)" },
    ],
  },
  {
    command: "drive get",
    description: "드라이브 하나 조회",
    method: "GET", path: "drive/v1/drives/{drive-id}",
  },
  {
    command: "drive change list",
    description: "드라이브 변경사항 목록. 다음 페이지는 마지막 항목의 revision 과 fileId 를 넘긴다",
    method: "GET", path: "drive/v2/drives/{drive-id}/changes",
    query: [
      { name: "latestRevision", description: "이 revision 이후 변경사항 (기본 0)" },
      { name: "fileId", description: "latestRevision 과 함께 쓰면 이 파일 이후부터" },
      { name: "size", description: "기본 20, 최대 200" },
    ],
  },
  {
    command: "drive file find",
    description: "드라이브 ID 없이 파일 ID 로 메타 조회. 다운로드는 응답의 driveId 로 drive file download",
    method: "GET", path: "drive/v1/files/{file-id}",
    fixedQuery: { media: "meta" },
  },
  {
    command: "drive file list",
    description: "드라이브의 파일·폴더 목록",
    method: "GET", path: "drive/v1/drives/{drive-id}/files",
    query: [
      { name: "type", description: "folder | file" },
      { name: "subTypes", description: "root,trash,users (폴더) 또는 etc,doc,photo,movie,music,zip (파일), 쉼표로 여럿" },
      { name: "parentId", description: "이 폴더 아래 목록" },
      { name: "page", description: "페이지 번호 (0부터)" },
      { name: "size", description: "페이지 크기" },
    ],
  },
  {
    command: "drive file upload",
    description: "파일 하나를 폴더에 업로드 (파일 서버로 자동 리다이렉트)",
    method: "POST", path: "drive/v1/drives/{drive-id}/files",
    query: [{ name: "parentId", description: "올릴 폴더 ID", required: true }],
    upload: {},
  },
  {
    command: "drive file get",
    description: "파일 메타 조회",
    method: "GET", path: "drive/v1/drives/{drive-id}/files/{file-id}",
    fixedQuery: { media: "meta" },
  },
  {
    command: "drive file download",
    description: "파일 다운로드 (파일 서버로 자동 리다이렉트)",
    method: "GET", path: "drive/v1/drives/{drive-id}/files/{file-id}",
    fixedQuery: { media: "raw" },
    download: true,
  },
  {
    command: "drive file rename",
    description: "파일·폴더 이름 변경",
    method: "PUT", path: "drive/v1/drives/{drive-id}/files/{file-id}",
    fixedQuery: { media: "meta" },
    body: { required: true, fields: "name(새 이름)" },
  },
  {
    command: "drive file update",
    description: "파일 새 버전 업로드 (파일 서버로 자동 리다이렉트)",
    method: "PUT", path: "drive/v1/drives/{drive-id}/files/{file-id}",
    fixedQuery: { media: "raw" },
    upload: {},
  },
  {
    command: "drive file delete",
    description: "휴지통에 있는 파일 영구 삭제. 휴지통으로 옮기려면 drive file move 로 destinationFileId=trash",
    method: "DELETE", path: "drive/v1/drives/{drive-id}/files/{file-id}",
  },
  {
    command: "drive folder create",
    description: "폴더 아래에 새 폴더 생성",
    method: "POST", path: "drive/v1/drives/{drive-id}/files/{folder-id}/create-folder",
    body: { required: true, fields: "name(폴더 이름)" },
  },
  {
    command: "drive file copy",
    description: "파일 복사",
    method: "POST", path: "drive/v1/drives/{drive-id}/files/{file-id}/copy",
    body: { required: true, fields: "destinationDriveId(대상 드라이브), destinationFileId(대상 폴더)" },
  },
  {
    command: "drive file move",
    description: "파일 이동. destinationFileId 를 trash 로 주면 휴지통으로",
    method: "POST", path: "drive/v1/drives/{drive-id}/files/{file-id}/move",
    body: { required: true, fields: "destinationFileId(대상 폴더 ID 또는 trash)" },
  },
  {
    command: "drive shared-link create",
    description: "파일 공유링크 생성. 프로젝트 관리자와 파일 생성자만 가능",
    method: "POST", path: "drive/v1/drives/{drive-id}/files/{file-id}/shared-links",
    body: { required: true, fields: `scope(${SCOPE}), expiredAt(만료 시각 ISO 8601, 필수)` },
  },
  {
    command: "drive shared-link list",
    description: "파일의 공유링크 목록. 프로젝트 관리자는 전체, 그 외는 자신이 만든 것만",
    method: "GET", path: "drive/v1/drives/{drive-id}/files/{file-id}/shared-links",
    query: [{ name: "valid", description: "true(유효한 링크, 기본) | false(만료된 링크)" }],
  },
  {
    command: "drive shared-link get",
    description: "공유링크 하나 조회",
    method: "GET", path: "drive/v1/drives/{drive-id}/files/{file-id}/shared-links/{link-id}",
  },
  {
    command: "drive shared-link update",
    description: "공유링크 범위·만료 시각 수정",
    method: "PUT", path: "drive/v1/drives/{drive-id}/files/{file-id}/shared-links/{link-id}",
    body: { required: true, fields: `expiredAt(만료 시각 ISO 8601), scope(${SCOPE})` },
  },
  {
    command: "drive shared-link delete",
    description: "공유링크 삭제",
    method: "DELETE", path: "drive/v1/drives/{drive-id}/files/{file-id}/shared-links/{link-id}",
  },
];
