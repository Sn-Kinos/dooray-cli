import type { EndpointSpec } from "../endpoint-spec.js";

const page = [
  { name: "page", description: "페이지 번호, 기본 0" },
  { name: "size", description: "페이지 크기, 기본 20" },
];

export const adminMemberEndpoints: EndpointSpec[] = [
  {
    command: "admin email-address get",
    description: "테넌트 안의 이메일 주소 확인 (account, distribution_list, project_email, channel_email, forward_only_member 중 어떤 주소인지)",
    method: "GET", path: "admin/v1/email-addresses/{email-address}",
  },
  {
    command: "admin member create",
    description: "멤버 생성. 계약 인원을 넘거나 userCode·idProviderUserId 가 겹치면 409",
    method: "POST", path: "admin/v1/members",
    body: {
      required: true,
      fields:
        "name(이름, 필수), userCode(아이디, 필수, 소문자·숫자·.-_ 20자), idProviderType(sso|service), idProviderUserId, externalEmailAddress, extensionNumber, defaultOrganizationId, tenantMemberRole(member|guest), locale, timezoneName, englishName, nativeName, nickname, displayMemberId, officeHours{begin,end}, expirationDate(게스트만), gender, additional{phoneList[], telList[], faxList[], jobRankId, jobRankExternalKey, departmentPositionList[], duty, entryDate, birthday, workplace}, employmentTypeId, employmentType, externalKey",
    },
  },
  {
    command: "admin member list",
    description: "멤버 목록. 탈퇴자는 --tenant-member-role leaver 로만 나온다",
    method: "GET", path: "admin/v1/members",
    query: [
      { name: "externalEmailAddress", description: "외부 이메일 주소로 필터" },
      { name: "idProviderUserId", description: "idProviderUserId 로 필터" },
      { name: "idProviderUserIds", description: "idProviderUserId 완전 일치, 쉼표로 최대 100개" },
      { name: "userCode", description: "userCode 부분 일치" },
      { name: "userCodeExact", description: "userCode 완전 일치 (deprecated, exactUserCode 를 쓴다)" },
      { name: "exactUserCode", description: "userCode 완전 일치" },
      { name: "exactUserCodes", description: "userCode 완전 일치, 쉼표로 최대 100개" },
      { name: "externalKey", description: "externalKey 완전 일치" },
      { name: "tenantMemberRole", description: "leaver 를 주면 탈퇴자만" },
      ...page,
    ],
  },
  {
    command: "admin member get",
    description: "멤버 한 명 조회",
    method: "GET", path: "admin/v1/members/{member-id}",
  },
  {
    command: "admin member update",
    description: "멤버 정보 수정. 바꿀 필드만 보낸다. sso 에서 service 로 바꾸면 비밀번호를 따로 설정해야 한다",
    method: "PUT", path: "admin/v1/members/{member-id}",
    body: {
      required: true,
      fields:
        "idProviderType, idProviderUserId(이미 쓰는 값이면 409), name, externalEmailAddress, extensionNumber, defaultOrganizationId, locale, timezoneName, englishName, nativeName, nickname, displayMemberId, officeHours{begin,end}, gender, additional{phoneList[], telList[], faxList[], jobRankId, jobRankExternalKey, departmentPositionList[], duty, entryDate, birthday, workplace}, employmentTypeId, employmentType, externalKey",
    },
  },
  {
    command: "admin member change-user-code",
    description: "멤버의 userCode(아이디) 변경",
    method: "POST", path: "admin/v1/members/{member-id}/change-user-code",
    body: { required: true, fields: "userCode(새 아이디, 소문자·숫자·.-_ 20자)" },
  },
  {
    command: "admin member leave",
    description: "멤버 탈퇴 처리",
    method: "POST", path: "admin/v1/members/{member-id}/leave",
    destructive: true,
  },
  {
    command: "admin member set-dormant",
    description: "멤버를 일시정지 상태로 변경",
    method: "POST", path: "admin/v1/members/{member-id}/set-dormant",
    destructive: true,
  },
  {
    command: "admin member set-active",
    description: "일시정지된 멤버 활성화",
    method: "POST", path: "admin/v1/members/{member-id}/set-active",
  },
  {
    command: "admin member set-role",
    description: "멤버의 테넌트 role 변경 (admin, member, guest, dummy). 계약 인원을 넘으면 409",
    method: "POST", path: "admin/v1/members/{member-id}/set-tenant-member-role",
    body: { required: true, fields: "tenantMemberRole(admin|member|guest|dummy)" },
    destructive: true,
  },
  {
    command: "admin member set-expiration-date",
    description: "게스트 멤버의 만료일 지정",
    method: "POST", path: "admin/v1/members/{member-id}/set-expiration-date",
    body: { required: true, fields: "expirationDate(ISO8601)" },
  },
  {
    command: "admin member set-managers",
    description: "게스트·업무계정 멤버의 매니저 목록을 통째로 교체. 빈 배열이면 모두 해제",
    method: "POST", path: "admin/v1/members/{member-id}/managers/organize",
    body: { required: true, fields: '["<매니저 organizationMemberId>", ...]' },
    destructive: true,
  },
  {
    command: "admin member profile-image",
    description: "멤버 프로필 이미지 업로드",
    method: "POST", path: "admin/v1/members/{member-id}/profile-image",
    upload: {},
  },
  {
    command: "admin member send-password-setup-mail",
    description: "비밀번호 설정 메일 발송. idProviderType 이 sso 인 멤버는 400",
    method: "POST", path: "admin/v1/members/{member-id}/send-password-setup-mail",
    body: { fields: "locale(예: ko_KR)" },
  },
  {
    command: "admin member send-welcome-mail",
    description: "가입 환영 안내 메일 발송",
    method: "POST", path: "admin/v1/members/{member-id}/send-welcome-mail",
  },
  {
    command: "admin member is-creatable",
    description: "주어진 userCode 로 멤버를 만들 수 있는지 확인. 겹치면 409",
    method: "POST", path: "admin/v1/members/is-creatable",
    body: { required: true, fields: "userCode" },
  },
  {
    command: "admin member logout",
    description: "멤버의 agentType 별 세션을 모두 로그아웃",
    method: "POST", path: "admin/v1/members/{member-id}/logout",
    body: { required: true, fields: "agentType(browser|mobile_app|desktop_messenger|desktop_drive, 필수), reason(사유, 필수)" },
    destructive: true,
  },
  {
    command: "admin member change-password",
    description: "멤버 비밀번호 변경. dooray-idp 테넌트의 service 멤버만 가능",
    method: "POST", path: "admin/v1/members/{member-id}/change-password",
    body: { required: true, fields: "password(새 비밀번호)" },
    destructive: true,
  },
  {
    command: "admin member mail-draft create",
    description: "멤버 메일 임시보관함에 메일 생성. 응답의 url 앞에 도메인을 붙이면 쓰기창이 열린다",
    method: "POST", path: "admin/v1/members/{member-id}/mail-drafts",
    body: {
      required: true,
      fields: "users.to[]{name,emailAddress}, users.cc[], users.bcc[], subject(제목), body{mimeType(text/html),content}, appendDefaultSignature(서명 추가, 기본 false)",
    },
  },
  {
    command: "admin member mail-draft attach",
    description: "임시보관 메일에 파일 첨부",
    method: "POST", path: "admin/v1/members/{member-id}/mail-drafts/{draft-id}/files",
    upload: {},
  },
  {
    command: "admin member vacation get",
    description: "멤버의 부재 설정 조회",
    method: "GET", path: "admin/v1/members/{member-id}/settings/common.vacation",
  },
  {
    command: "admin member vacation update",
    description: "멤버의 부재 설정 변경",
    method: "PUT", path: "admin/v1/members/{member-id}/settings/common.vacation",
    body: {
      required: true,
      fields:
        "displayProfileFlag, autoReplyMailFlag, type(business_trip|education|sick_leave|vacation|temporary_rest|etc|hidden), startedAt, endedAt(ISO8601), message, comment, workflowApprovalType(hold|delegation|skip), delegatedMemberId, delegatedDepartmentId, mailApproval{delegated,message,delegateeIds[]}, workflowDelegations[]{type,departmentId,delegatee}",
    },
  },
  {
    command: "admin member reset-mail-signature",
    description: "멤버 메일 서명을 기본 서명으로 초기화. 기존 서명은 모두 지워진다",
    method: "POST", path: "admin/v1/members/{member-id}/settings/initialize-mail-signature",
    body: { fields: "options{new,reply,forward} (없으면 모두 true)" },
    destructive: true,
  },
  {
    command: "admin member messenger-notification get",
    description: "멤버의 메신저 알림 설정 조회",
    method: "GET", path: "admin/v1/members/{member-id}/messenger-settings/notification",
  },
  {
    command: "admin member messenger-notification update",
    description: "멤버의 메신저 알림 설정 변경",
    method: "PUT", path: "admin/v1/members/{member-id}/messenger-settings/notification",
    body: { required: true, fields: "newMsgSound, push(모바일), notification(PC)" },
  },
  {
    command: "admin member set-departments",
    description: "멤버의 소속 부서를 통째로 교체. 대표 부서는 하나만",
    method: "PUT", path: "admin/v1/members/{member-id}/departments",
    body: {
      required: true,
      fields: "[{departmentId 또는 departmentExternalKey, jobPositionId 또는 jobPositionExternalKey, primaryFlag(필수), leaderFlag}]",
    },
  },
  {
    command: "admin member set-primary-department",
    description: "멤버의 주 부서 변경",
    method: "POST", path: "admin/v1/members/{member-id}/set-primary-department",
    body: { required: true, fields: "departmentId 또는 departmentExternalKey, jobPositionId 또는 jobPositionExternalKey, leaderFlag" },
  },
  {
    command: "admin member count mail",
    description: "멤버의 안 읽은 메일 수",
    method: "GET", path: "admin/v1/members/{member-id}/counts/mail",
  },
  {
    command: "admin member count project",
    description: "멤버의 프로젝트 업무 현황",
    method: "GET", path: "admin/v1/members/{member-id}/counts/project",
    query: [{ name: "fields", description: "workflow, dueDate, post 중 쉼표로. 없으면 workflow,dueDate" }],
  },
  {
    command: "admin member email-address create",
    description: "멤버 이메일 주소 생성. 등록된 도메인 주소만 가능",
    method: "POST", path: "admin/v1/members/{member-id}/email-addresses",
    body: { required: true, fields: "emailAddress, type(general|alias)" },
  },
  {
    command: "admin member email-address list",
    description: "멤버의 이메일 주소 목록",
    method: "GET", path: "admin/v1/members/{member-id}/email-addresses",
    query: page,
  },
  {
    command: "admin member email-address get",
    description: "멤버의 이메일 주소 하나 조회",
    method: "GET", path: "admin/v1/members/{member-id}/email-addresses/{email-address}",
  },
  {
    command: "admin member email-address delete",
    description: "멤버의 이메일 주소 삭제",
    method: "DELETE", path: "admin/v1/members/{member-id}/email-addresses/{email-address}",
  },
  {
    command: "admin member email-forward list",
    description: "멤버가 직접 만든 개인 메일 포워드 설정 목록",
    method: "GET", path: "admin/v1/members/{member-id}/email-forwards",
  },
  {
    command: "admin member api-key create",
    description: "멤버 개인 API 키 생성. 키 값은 응답에 한 번만 나온다. 관리 API 로는 삭제할 수 없다",
    method: "POST", path: "admin/v1/members/{member-id}/api-keys/generate",
    body: { required: true, fields: "description(키 용도)" },
  },
  {
    command: "admin member api-key list",
    description: "멤버에게 발급된 API 키 목록 (키 값은 보이지 않는다)",
    method: "GET", path: "admin/v1/members/{member-id}/api-keys",
  },
];
