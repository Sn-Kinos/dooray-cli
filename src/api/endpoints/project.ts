import type { EndpointSpec } from "../endpoint-spec.js";

const TEMPLATE_FIELDS =
  "templateName(템플릿 이름, 필수), users.to[]/users.cc[](담당자·참조자, type member|emailUser), body(mimeType text/html|text/x-markdown, content), guide(쓰기 창 가이드, mimeType, content), subject, dueDate, dueDateFlag, milestoneId, tagIds[], priority(highest|high|normal|low|lowest|none), isDefault(기본 템플릿 여부)";
const WORKFLOW_FIELDS =
  "name(상태 이름), order(정렬 순서), names[](다국어 locale, name), class(backlog|registered|working|closed)";

export const projectEndpoints: EndpointSpec[] = [
  {
    command: "project category list",
    description: "프로젝트 카테고리 목록. 카테고리 생성은 admin 페이지에서 한다",
    method: "GET", path: "project/v1/project-categories",
  },
  {
    command: "project create",
    description: "프로젝트 생성. 요청자가 속한 조직 소속으로 만든다",
    method: "POST", path: "project/v1/projects",
    body: { required: true, fields: "code(프로젝트 이름), description, scope(private|public), projectCategoryId(선택)" },
  },
  {
    command: "project get",
    description: "프로젝트 한 개의 정보 조회",
    method: "GET", path: "project/v1/projects/{project-id}",
  },
  {
    command: "project update",
    description: "프로젝트 정보 수정. 프로젝트 어드민 권한 필요, 보관 상태면 수정 불가. 본문에 없는 필드는 그대로 둔다",
    method: "PUT", path: "project/v1/projects/{project-id}",
    body: { required: true, fields: "code(프로젝트 이름, 3~30자, 중복 불가), description, projectCategoryId" },
  },
  {
    command: "project archive",
    description: "프로젝트를 보관(archived) 상태로 변경. 프로젝트 어드민 권한 필요",
    method: "POST", path: "project/v1/projects/{project-id}/set-archive",
  },
  {
    command: "project activate",
    description: "보관 상태인 프로젝트를 사용(active) 상태로 되돌림. 프로젝트 어드민 권한 필요",
    method: "POST", path: "project/v1/projects/{project-id}/set-active",
  },
  {
    command: "project is-creatable",
    description: "프로젝트를 이 이름으로 만들 수 있는지 확인. 400 은 조건에 맞지 않는 이름, 409 는 이미 있는 이름",
    method: "POST", path: "project/v1/projects/is-creatable",
    body: { required: true, fields: "code(프로젝트 이름)" },
  },
  {
    command: "project workflow create",
    description: "업무 상태 추가",
    method: "POST", path: "project/v1/projects/{project-id}/workflows",
    body: { required: true, fields: WORKFLOW_FIELDS },
  },
  {
    command: "project workflow update",
    description: "업무 상태 수정",
    method: "PUT", path: "project/v1/projects/{project-id}/workflows/{workflow-id}",
    body: { required: true, fields: WORKFLOW_FIELDS },
  },
  {
    command: "project workflow delete",
    description: "업무 상태 삭제. 이 상태인 업무는 toBeWorkflowId 상태로 바뀐다",
    method: "POST", path: "project/v1/projects/{project-id}/workflows/{workflow-id}/delete",
    body: { required: true, fields: "toBeWorkflowId(옮겨 갈 업무 상태 id)" },
    destructive: true,
  },
  {
    command: "project email-address create",
    description: "프로젝트 수신 메일 주소 생성. 테넌트 수신 도메인이어야 하고, 이미 쓰이는 로컬 파트면 400",
    method: "POST", path: "project/v1/projects/{project-id}/email-addresses",
    body: { required: true, fields: "emailAddress(수신 메일 주소), name" },
  },
  {
    command: "project email-address get",
    description: "프로젝트 메일 주소 정보 조회",
    method: "GET", path: "project/v1/projects/{project-id}/email-addresses/{email-address-id}",
  },
  {
    command: "project tag get",
    description: "프로젝트 태그 정보 조회",
    method: "GET", path: "project/v1/projects/{project-id}/tags/{tag-id}",
  },
  {
    command: "project milestone create",
    description: "단계(마일스톤) 생성",
    method: "POST", path: "project/v1/projects/{project-id}/milestones",
    body: { required: true, fields: "name(단계 이름), startedAt(예 2015-06-22+09:00), endedAt" },
  },
  {
    command: "project milestone get",
    description: "단계 상세 조회",
    method: "GET", path: "project/v1/projects/{project-id}/milestones/{milestone-id}",
  },
  {
    command: "project milestone update",
    description: "단계 수정",
    method: "PUT", path: "project/v1/projects/{project-id}/milestones/{milestone-id}",
    body: { required: true, fields: "name, status(open|closed), startedAt, endedAt" },
  },
  {
    command: "project milestone delete",
    description: "단계 삭제",
    method: "DELETE", path: "project/v1/projects/{project-id}/milestones/{milestone-id}",
  },
  {
    command: "project hook create",
    description: "프로젝트 Hook 생성. type 에 따라 쓸 수 있는 sendEvents 가 다르다",
    method: "POST", path: "project/v1/projects/{project-id}/hooks",
    body: {
      required: true,
      fields: "url, type(task|project, 기본 task), sendEvents[](task: postCreated 등, project: stateChanged|codeChanged|memberChanged), option.body(include, embedInlineImage)",
    },
  },
  {
    command: "project wiki-hook create",
    description: "위키 Hook 생성. project-id 는 위키가 속한 프로젝트, url 은 https 만",
    method: "POST", path: "project/v1/projects/{project-id}/wiki-hooks",
    body: {
      required: true,
      fields: "url(https, 필수), eventTypes[](pageCreated|pageUpdated|pageDeleted|pageMoved|pageReferrerUpdated|pageFile*|pageComment*, 필수), messageType(dooray|slack, 필수), enabled(기본 false)",
    },
  },
  {
    command: "project member add",
    description: "프로젝트에 멤버 추가",
    method: "POST", path: "project/v1/projects/{project-id}/members",
    body: { required: true, fields: "organizationMemberId, role(admin|member)" },
  },
  {
    command: "project member get",
    description: "프로젝트 멤버 한 명 조회",
    method: "GET", path: "project/v1/projects/{project-id}/members/{member-id}",
  },
  {
    command: "project member delete",
    description: "프로젝트 멤버 삭제",
    method: "DELETE", path: "project/v1/projects/{project-id}/members/{member-id}",
  },
  {
    command: "project member-group get",
    description: "프로젝트 멤버 그룹 조회 (소속 멤버 포함)",
    method: "GET", path: "project/v1/projects/{project-id}/member-groups/{member-group-id}",
  },
  {
    command: "project template create",
    description: "업무 템플릿 등록. templateName 만 필수",
    method: "POST", path: "project/v1/projects/{project-id}/templates",
    body: { required: true, fields: TEMPLATE_FIELDS },
  },
  {
    command: "project template update",
    description: "업무 템플릿 수정",
    method: "PUT", path: "project/v1/projects/{project-id}/templates/{template-id}",
    body: { required: true, fields: TEMPLATE_FIELDS },
  },
  {
    command: "project template delete",
    description: "업무 템플릿 삭제",
    method: "DELETE", path: "project/v1/projects/{project-id}/templates/{template-id}",
  },
  {
    command: "post draft create",
    description: "임시 업무 생성. 응답 url 은 도메인 없는 쓰기 창 경로다",
    method: "POST", path: "project/v1/post-drafts",
    body: {
      required: true,
      fields: "projectId, subject(필수), users.to[]/users.cc[](type member|emailUser), body(mimeType text/html|text/x-markdown, content), dueDate, dueDateFlag, milestoneId, tagIds[], priority(highest|high|normal|low|lowest|none)",
    },
  },
  {
    command: "post draft file upload",
    description: "임시 업무에 첨부파일 추가",
    method: "POST", path: "project/v1/post-drafts/{post-draft-id}/files",
    upload: {},
  },
  {
    command: "post move",
    description: "업무를 다른 프로젝트로 이동. 단계와 태그 정보는 사라진다",
    method: "POST", path: "project/v1/projects/{project-id}/posts/{post-id}/move",
    body: { required: true, fields: "targetProjectId(대상 프로젝트, 없으면 같은 프로젝트), includeSubPosts(기본 true)" },
  },
  {
    command: "post assignee-workflow",
    description: "담당자 한 명의 업무 상태 변경. organization-member-id 자리에 me 를 쓸 수 있다",
    method: "PUT", path: "project/v1/projects/{project-id}/posts/{post-id}/to/{organization-member-id}",
    body: { required: true, fields: "workflowId(업무 상태 id)" },
  },
];
