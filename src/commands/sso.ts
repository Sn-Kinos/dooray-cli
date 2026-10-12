/**
 * `dooray sso check` — 고객사 SSO(OIDC)를 Dooray 에 연결하기 전에 넘길 값을 모으고 빠진 것을 찾는다.
 * Dooray 는 OAuth 클라이언트(RP)이고, 연결 설정은 Dooray 담당자가 한다. CLI 는 넘길 정보를 확인해 준다.
 */
import { Command } from "commander";
import { DoorayCliError } from "../utils/errors.js";
import { EXIT_API_ERROR } from "../utils/exit-codes.js";

interface Metadata {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  scopes_supported?: string[];
}

export interface SsoReport {
  metadataUrl: string;
  values: Record<string, string | undefined>;
  problems: string[];
  doorayClient: Record<string, string>;
}

const WELL_KNOWN = ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"];

export async function checkSso(issuer: string, tenant: string, fetchFn: typeof fetch = fetch): Promise<SsoReport> {
  const base = issuer.replace(/\/+$/, "");
  let meta: Metadata | undefined;
  let metadataUrl = "";
  for (const path of WELL_KNOWN) {
    const res = await fetchFn(base + path).catch(() => undefined);
    if (res?.ok) {
      meta = (await res.json()) as Metadata;
      metadataUrl = base + path;
      break;
    }
  }
  if (!meta) throw new DoorayCliError(`메타데이터를 찾지 못했습니다: ${WELL_KNOWN.map((p) => base + p).join(", ")}`, EXIT_API_ERROR);

  const values = {
    authorize_uri: meta.authorization_endpoint,
    token_url: meta.token_endpoint,
    jwks_uri: meta.jwks_uri,
    userinfo_uri: meta.userinfo_endpoint,
    logout_uri: meta.end_session_endpoint,
  };
  const problems: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!v && k !== "logout_uri") problems.push(`${k} 가 메타데이터에 없습니다`);
  }
  if (!values.logout_uri) problems.push("logout_uri(end_session_endpoint)가 없습니다. Dooray 로그아웃 때 SSO 로그아웃은 되지 않습니다");
  if (meta.response_types_supported && !meta.response_types_supported.includes("code")) problems.push("response_type code 를 지원하지 않습니다");
  if (meta.grant_types_supported && !meta.grant_types_supported.includes("authorization_code")) problems.push("grant_type authorization_code 를 지원하지 않습니다");
  if (meta.scopes_supported && !meta.scopes_supported.includes("openid")) problems.push("scope openid 를 지원하지 않습니다");

  if (meta.jwks_uri) {
    const res = await fetchFn(meta.jwks_uri).catch(() => undefined);
    const keys = res?.ok ? ((await res.json()) as { keys?: Array<Record<string, unknown>> }).keys : undefined;
    if (!keys || keys.length === 0) problems.push("jwks_uri 에서 공개키를 받지 못했습니다");
    else if (!keys.some((k) => k.kid && k.kty)) problems.push("jwks 의 키에 kid·kty 가 없습니다");
  }

  return {
    metadataUrl,
    values,
    problems,
    doorayClient: {
      redirect_uri: `https://${tenant}/idp/login/oauth/callback`,
      post_logout_redirect_uri: `https://${tenant}/idp/login/oauth/logout`,
      grant_type: "authorization_code",
      response_type: "code",
      scope: "openid",
    },
  };
}

export const ssoCommand = new Command("sso").description("SSO(OAuth·OIDC) 연동 준비");

ssoCommand
  .command("check")
  .description("고객사 SSO 메타데이터를 읽어 Dooray 에 넘길 값을 모으고, SSO 에 등록할 Dooray 클라이언트 값을 출력한다")
  .argument("<issuer>", "고객사 SSO 주소 (/.well-known/... 앞부분)")
  .requiredOption("--tenant <domain>", "Dooray 테넌트 도메인 (예: example.dooray.com)")
  .action(async (issuer: string, opts: { tenant: string }) => {
    const report = await checkSso(issuer, opts.tenant);
    if (ssoCommand.optsWithGlobals<{ json?: boolean }>().json) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      return;
    }
    const lines = [
      `메타데이터: ${report.metadataUrl}`,
      "",
      "Dooray 담당자에게 넘길 값 (client_id, client_secret 은 SSO 에 클라이언트를 등록한 뒤 함께 넘긴다):",
      ...Object.entries(report.values).map(([k, v]) => `  ${k}: ${v ?? "(없음)"}`),
      "",
      "SSO 에 Dooray 를 클라이언트로 등록할 때 쓸 값:",
      ...Object.entries(report.doorayClient).map(([k, v]) => `  ${k}: ${v}`),
      "",
      report.problems.length === 0 ? "문제 없음" : `확인할 것:\n${report.problems.map((p) => `  - ${p}`).join("\n")}`,
    ];
    process.stdout.write(lines.join("\n") + "\n");
  });
