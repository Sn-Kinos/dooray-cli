import type { EndpointSpec } from "../endpoint-spec.js";

const page = [
  { name: "page", description: "페이지 번호, 기본 0" },
  { name: "size", description: "페이지 크기, 기본 20" },
];

const serviceNameNote = "service-name 은 mail-web, project-mobile, drive-sync 처럼 서비스·접속 경로 이름";

export const adminOrgEndpoints: EndpointSpec[] = [
  {
    command: "admin mail-domain list",
    description: "테넌트가 메일 수신용으로 등록한 자체 도메인 목록",
    method: "GET", path: "admin/v1/mail-domains",
    query: page,
  },
  {
    command: "admin organization list",
    description: "테넌트의 하위 조직(organization) 목록",
    method: "GET", path: "admin/v1/organizations",
  },
  {
    command: "admin organization domain list",
    description: "조직의 메일 도메인 (doorayMailDomain, customMailDomain)",
    method: "GET", path: "admin/v1/organizations/{organization-id}/domains",
  },
  {
    command: "admin organization domain set",
    description: "조직의 customMailDomain 설정. admin mail-domain list 에 있는 도메인만 가능",
    method: "PUT", path: "admin/v1/organizations/{organization-id}/domains/customMailDomain",
    body: { required: true, fields: "domain" },
  },
  {
    command: "admin organization department organize",
    description: "조직의 부서 전체를 재구성. 조직 아래 모든 부서를 빠짐없이 보내야 한다",
    method: "POST", path: "admin/v1/organizations/{organization-id}/departments/organize",
    body: {
      required: true,
      fields: "departments[]{externalKey(필수), name(필수), parentDepartmentExternalKey(최상위는 생략), displayOrder, emailLocalPart}",
    },
    destructive: true,
  },
  {
    command: "admin organization job-position organize",
    description: "조직 단위로 직책 전체를 재구성. 빠진 직책은 삭제되고 가진 사람은 직책 없음이 된다",
    method: "POST", path: "admin/v1/organizations/{organization-id}/job-positions/organize",
    body: { required: true, fields: "[{name, externalKey(테넌트에서 유일), displayOrder(쓰면 전부)}]" },
    destructive: true,
  },
  {
    command: "admin organization job-rank organize",
    description: "조직 단위로 직위 전체를 재구성. 빠진 직위는 삭제되고 가진 사람은 직위 없음이 된다",
    method: "POST", path: "admin/v1/organizations/{organization-id}/job-ranks/organize",
    body: { required: true, fields: "[{name, externalKey(테넌트에서 유일), displayOrder(쓰면 전부)}]" },
    destructive: true,
  },
  {
    command: "admin organization member-acl create",
    description: `서비스 member-acl 에 규칙 추가. ${serviceNameNote}`,
    method: "POST", path: "admin/v1/organizations/{organization-id}/services/{service-name}/member-acl",
    body: { required: true, fields: "organizationMemberId, allow(true 면 접속 허용)" },
  },
  {
    command: "admin organization member-acl list",
    description: `서비스 member-acl 목록. ${serviceNameNote}`,
    method: "GET", path: "admin/v1/organizations/{organization-id}/services/{service-name}/member-acl",
    query: [{ name: "organizationMemberId", description: "이 멤버의 설정만 본다" }],
  },
  {
    command: "admin organization member-acl update",
    description: "서비스 member-acl 전체를 요청 내용으로 교체. 요청에 없는 규칙은 사라진다",
    method: "PUT", path: "admin/v1/organizations/{organization-id}/services/{service-name}/member-acl",
    body: { required: true, fields: "[{organizationMemberId, allow}]" },
    destructive: true,
  },
  {
    command: "admin organization member-acl delete",
    description: "서비스 member-acl 에서 멤버 제거",
    method: "POST", path: "admin/v1/organizations/{organization-id}/services/{service-name}/member-acl/delete",
    body: { required: true, fields: "organizationMemberIdList[]" },
    destructive: true,
  },
  {
    command: "admin organization ip-acl get",
    description: `서비스의 접근 허용·차단 IP 규칙 조회. ${serviceNameNote}`,
    method: "GET", path: "admin/v1/organizations/{organization-id}/services/{service-name}/ip-acl",
  },
  {
    command: "admin organization ip-acl update",
    description: "서비스의 IP 규칙 전체를 교체. 배열 앞 규칙부터 적용되므로 순서가 중요하다",
    method: "PUT", path: "admin/v1/organizations/{organization-id}/services/{service-name}/ip-acl",
    body: { required: true, fields: "[{ipCidr(IP 또는 CIDR), allow, comment}]" },
    destructive: true,
  },
  {
    command: "admin email-forward create",
    description: "멤버에게 오는 메일 전체를 다른 주소로 포워딩 등록. 멤버는 등록 사실을 알 수 없다",
    method: "POST", path: "admin/v1/email-forwards",
    body: { required: true, fields: "organizationMemberId(수신자), emailAddress(전달할 주소), localSaveFlag(저장 후 포워딩), applyMailRelayRuleId" },
  },
  {
    command: "admin email-forward list",
    description: "포워드 설정 목록",
    method: "GET", path: "admin/v1/email-forwards",
    query: [{ name: "organizationMemberIds", description: "멤버 ID 들, 쉼표로" }],
  },
  {
    command: "admin email-forward update",
    description: "포워드 설정 수정",
    method: "PUT", path: "admin/v1/email-forwards/{email-forward-id}",
    body: { required: true, fields: "emailAddress(전달할 주소), localSaveFlag, applyMailRelayRuleId" },
  },
  {
    command: "admin email-forward delete",
    description: "포워드 설정 삭제",
    method: "DELETE", path: "admin/v1/email-forwards/{email-forward-id}",
  },
  {
    command: "admin forward-only-member create",
    description: "포워딩만 하는 메일 주소 등록",
    method: "POST", path: "admin/v1/forward-only-members",
    body: { required: true, fields: "emailAddress(수신 주소), forwardEmailAddress(전달할 주소), applyMailRelayRuleId(보통 null)" },
  },
  {
    command: "admin forward-only-member list",
    description: "포워딩 전용 메일 주소 목록",
    method: "GET", path: "admin/v1/forward-only-members",
    query: [...page, { name: "emailAddress", description: "이 주소와 정확히 같은 것만" }],
  },
  {
    command: "admin forward-only-member get",
    description: "포워딩 전용 메일 주소 하나 조회",
    method: "GET", path: "admin/v1/forward-only-members/{forward-only-member-id}",
  },
  {
    command: "admin forward-only-member update",
    description: "포워딩 전용 메일 주소 수정. applyMailRelayRuleId 를 빈 문자열로 주면 비운다",
    method: "PUT", path: "admin/v1/forward-only-members/{forward-only-member-id}",
    body: { required: true, fields: "forwardEmailAddress, applyMailRelayRuleId" },
  },
  {
    command: "admin forward-only-member delete",
    description: "포워딩 전용 메일 주소 삭제",
    method: "DELETE", path: "admin/v1/forward-only-members/{forward-only-member-id}",
  },
  {
    command: "admin department-member list",
    description: "부서 소속 정보 목록 (멤버·부서·직책)",
    method: "GET", path: "admin/v1/department-members",
    query: [...page, { name: "organizationMemberId", description: "멤버 ID 로 필터" }],
  },
  {
    command: "admin distribution-list create",
    description: "메일 그룹(DL) 생성",
    method: "POST", path: "admin/v1/distribution-lists",
    body: {
      required: true,
      fields:
        "name, emailAddress(소문자), description, startedAt, endedAt(ISO8601), allowReceiveExternalMailFlag, externalKey, organizationId, distributionItemList[]{type(distributionMember|distributionList), distributionMember{emailAddress}, distributionList{id}}, displayOrder",
    },
  },
  {
    command: "admin distribution-list list",
    description: "메일 그룹(DL) 목록. displayOrder 순",
    method: "GET", path: "admin/v1/distribution-lists",
    query: [
      { name: "externalKeys", description: "externalKey 들, 쉼표로" },
      { name: "emailAddresses", description: "이메일 주소들, 쉼표로" },
      ...page,
    ],
  },
  {
    command: "admin distribution-list get",
    description: "메일 그룹(DL) 하나 조회",
    method: "GET", path: "admin/v1/distribution-lists/{distribution-list-id}",
  },
  {
    command: "admin distribution-list update",
    description: "메일 그룹(DL) 수정",
    method: "PUT", path: "admin/v1/distribution-lists/{distribution-list-id}",
    body: {
      required: true,
      fields:
        "emailAddress, name, description, startedAt, endedAt, allowReceiveExternalMailFlag, externalKey, organizationId, distributionItemList[], displayOrder",
    },
  },
  {
    command: "admin distribution-list delete",
    description: "메일 그룹(DL) 삭제",
    method: "DELETE", path: "admin/v1/distribution-lists/{distribution-list-id}",
  },
  {
    command: "admin department create",
    description: "부서 생성",
    method: "POST", path: "admin/v1/departments",
    body: {
      required: true,
      fields: "name, parentDepartmentId, nextToDepartmentId(앞 부서, null 이면 맨 앞), externalKey, emailLocalPart, useEmailAddress, displayOrder",
    },
  },
  {
    command: "admin department list",
    description: "부서 목록",
    method: "GET", path: "admin/v1/departments",
    query: [
      ...page,
      { name: "order", description: "createdAt(기본) 또는 displayOrder. displayOrder 면 --parent-department-id 필수" },
      { name: "type", description: "organization 이면 조직의 최상위 부서만" },
      { name: "parentDepartmentId", description: "부모 부서 ID" },
      { name: "externalKeys", description: "externalKey 들, 쉼표로" },
    ],
  },
  {
    command: "admin department get",
    description: "부서 하나 조회",
    method: "GET", path: "admin/v1/departments/{department-id}",
  },
  {
    command: "admin department update",
    description: "부서 수정. null 인 필드는 바꾸지 않는다. emailLocalPart 가 비면 부서 메일을 지운다",
    method: "PUT", path: "admin/v1/departments/{department-id}",
    body: { required: true, fields: "name, externalKey, emailLocalPart, useEmailAddress, displayOrder" },
  },
  {
    command: "admin department delete",
    description: "부서 삭제",
    method: "DELETE", path: "admin/v1/departments/{department-id}",
  },
  {
    command: "admin department move",
    description: "조직도에서 부서 위치 변경",
    method: "POST", path: "admin/v1/departments/{department-id}/move",
    body: { required: true, fields: "parentDepartmentId, nextToDepartmentId(null 이면 같은 단계 맨 앞)" },
  },
  {
    command: "admin department member create",
    description: "부서에 멤버 추가",
    method: "POST", path: "admin/v1/departments/{department-id}/members",
    body: { required: true, fields: "organizationMemberId, jobPositionId, primaryFlag, leaderFlag" },
  },
  {
    command: "admin department member list",
    description: "부서의 멤버 목록",
    method: "GET", path: "admin/v1/departments/{department-id}/members",
    query: page,
  },
  {
    command: "admin department member get",
    description: "부서 멤버 하나 조회",
    method: "GET", path: "admin/v1/departments/{department-id}/members/{department-member-id}",
  },
  {
    command: "admin department member update",
    description: "부서 멤버 정보 수정",
    method: "PUT", path: "admin/v1/departments/{department-id}/members/{department-member-id}",
    body: { required: true, fields: "jobPositionId, primaryFlag, leaderFlag" },
  },
  {
    command: "admin department member delete",
    description: "부서에서 멤버 제거",
    method: "DELETE", path: "admin/v1/departments/{department-id}/members/{department-member-id}",
  },
  {
    command: "admin department member set-display-order",
    description: "부서 멤버 정렬 순서 변경. 부서의 모든 멤버를 보내야 하며, 두레이와 협의 전에는 반영되지 않는다. department-id 자리에 external-key:{키} 도 된다",
    method: "POST", path: "admin/v1/departments/{department-id}/members/set-display-order",
    body: { required: true, fields: "[{organizationMemberId, displayOrder}]" },
  },
  {
    command: "admin job-position list",
    description: "직책 목록",
    method: "GET", path: "admin/v1/job-positions",
    query: [...page, { name: "externalKey", description: "externalKey 로 필터" }],
  },
  {
    command: "admin job-position get",
    description: "직책 하나 조회",
    method: "GET", path: "admin/v1/job-positions/{job-position-id}",
  },
  {
    command: "admin job-position organize",
    description: "직책 전체를 재구성. 빠진 직책은 삭제되고 가진 사람은 직책 없음이 된다",
    method: "POST", path: "admin/v1/job-positions/organize",
    body: { required: true, fields: "[{name, externalKey, displayOrder(쓰면 전부)}]" },
    destructive: true,
  },
  {
    command: "admin job-rank list",
    description: "직위 목록",
    method: "GET", path: "admin/v1/job-ranks",
    query: [...page, { name: "externalKey", description: "externalKey 로 필터" }],
  },
  {
    command: "admin job-rank get",
    description: "직위 하나 조회",
    method: "GET", path: "admin/v1/job-ranks/{job-rank-id}",
  },
  {
    command: "admin job-rank organize",
    description: "직위 전체를 재구성. 빠진 직위는 삭제되고 가진 사람은 직위 없음이 된다",
    method: "POST", path: "admin/v1/job-ranks/organize",
    body: { required: true, fields: "[{name, externalKey, displayOrder(쓰면 전부)}]" },
    destructive: true,
  },
  {
    command: "admin quota get",
    description: "멤버 개인 사용 쿼터 조회",
    method: "GET", path: "admin/v1/metering/members/{member-id}/limit-setting",
  },
  {
    command: "admin quota update",
    description: "멤버 개인 사용 쿼터 변경",
    method: "PUT", path: "admin/v1/metering/members/{member-id}/limit-setting",
    body: { required: true, fields: "limitBytes" },
  },
  {
    command: "admin meeting create",
    description: "화상회의 개설. callbackUrl 은 https 443 만 허용",
    method: "POST", path: "admin/v2/meetings",
    body: {
      required: true,
      fields:
        "subject(필수), callbackUrl, host{emailAddress(필수), name(필수), externalKey, timezoneName, locale}, externalKey, config{password(6자리, 빈 문자열이면 자동 생성)}",
    },
  },
  {
    command: "admin meeting get",
    description: "화상회의 상태 조회 (notExist, process, end)",
    method: "GET", path: "admin/v2/meetings/{meeting-id}",
  },
  {
    command: "admin mail-relay-rule create",
    description: "메일 포워딩에 쓸 릴레이 규칙 생성",
    method: "POST", path: "admin/v1/mail-relay-rules",
    body: { required: true, fields: "name, relaySmtps[](앞에서부터 발송 시도)" },
  },
  {
    command: "admin mail-relay-rule list",
    description: "메일 릴레이 규칙 목록",
    method: "GET", path: "admin/v1/mail-relay-rules",
  },
  {
    command: "admin mail-relay-rule get",
    description: "메일 릴레이 규칙 하나 조회",
    method: "GET", path: "admin/v1/mail-relay-rules/{mail-relay-rule-id}",
  },
  {
    command: "admin mail-relay-rule update",
    description: "메일 릴레이 규칙 수정",
    method: "PUT", path: "admin/v1/mail-relay-rules/{mail-relay-rule-id}",
    body: { required: true, fields: "name, relaySmtps[]" },
  },
  {
    command: "admin mail-relay-rule delete",
    description: "메일 릴레이 규칙 삭제",
    method: "DELETE", path: "admin/v1/mail-relay-rules/{mail-relay-rule-id}",
  },
  {
    command: "admin tls-forced-domain list",
    description: "TLS 로만 메일을 보내야 하는 도메인 목록",
    method: "GET", path: "admin/v1/settings/mail.smtp-tls-forced-domains",
  },
  {
    command: "admin tls-forced-domain update",
    description: "TLS 강제 도메인 목록 전체를 덮어쓴다. 두레이에 기능을 먼저 켜 달라고 해야 동작한다",
    method: "PUT", path: "admin/v1/settings/mail.smtp-tls-forced-domains",
    body: { required: true, fields: "smtpTlsForcedDomains[]{domain,name}" },
    destructive: true,
  },
  {
    command: "admin employment-type create",
    description: "고용형태 생성",
    method: "POST", path: "admin/v1/employment-types",
    body: { required: true, fields: "name(필수)" },
  },
  {
    command: "admin employment-type list",
    description: "고용형태 목록",
    method: "GET", path: "admin/v1/employment-types",
  },
  {
    command: "admin employment-type update",
    description: "고용형태 수정",
    method: "PUT", path: "admin/v1/employment-types/{employment-type-id}",
    body: { required: true, fields: "name" },
  },
  {
    command: "admin employment-type delete",
    description: "고용형태 삭제",
    method: "DELETE", path: "admin/v1/employment-types/{employment-type-id}",
  },
  {
    command: "admin mfa-disabled-member list",
    description: "로그인 2차 인증에서 제외된 멤버 목록",
    method: "GET", path: "admin/v1/mfa-disabled-members",
  },
  {
    command: "admin mfa-disabled-member create",
    description: "멤버를 로그인 2차 인증에서 제외",
    method: "POST", path: "admin/v1/mfa-disabled-members",
    body: { required: true, fields: "organizationMemberId" },
  },
  {
    command: "admin mfa-disabled-member delete",
    description: "멤버의 2차 인증 제외 설정 제거",
    method: "DELETE", path: "admin/v1/mfa-disabled-members/{member-id}",
  },
  {
    command: "admin workplace list",
    description: "테넌트의 근무지 목록",
    method: "GET", path: "admin/v1/workplaces",
  },
  {
    command: "admin workplace organize",
    description: "근무지 전체를 재구성. externalKey 로 수정·생성하고 빠진 근무지는 삭제한다 (멤버가 있으면 적용 안 됨)",
    method: "POST", path: "admin/v1/workplaces/organize",
    body: { required: true, fields: "[{externalKey(필수), name, address, postalCode, displayOrder(쓰면 전부), visibility, organizationIds[]}]" },
    destructive: true,
  },
  {
    command: "admin license grant",
    description: "AI 라이선스를 멤버들에게 부여 (license-name: aiLite, aiStandard, aiPremium). 부분 성공이 있으니 항목별 errorInfo 를 확인한다",
    method: "POST", path: "admin/v1/licenses/{license-name}/members/grant",
    body: { required: true, fields: '["<organizationMemberId>", ...]' },
  },
  {
    command: "admin license revoke",
    description: "AI 라이선스를 멤버들에게서 회수 (license-name: aiLite, aiStandard, aiPremium)",
    method: "POST", path: "admin/v1/licenses/{license-name}/members/revoke",
    body: { required: true, fields: '["<organizationMemberId>", ...]' },
    destructive: true,
  },
];
