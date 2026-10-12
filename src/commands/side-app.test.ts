import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { signSideAppJwt, startSideAppServer, validateSideAppJson, verifySideAppJwt } from "./side-app.js";
import { checkSso } from "./sso.js";

const SAMPLE_A = { version: 1, layout: "A", contents: [{ id: "2", title: "공지" }] };

describe("verifySideAppJwt", () => {
  const claims = { email: "user@example.com", doorayMemberId: "1", iat: 1000 };

  it("인증 토큰으로 서명한 JWT 의 payload 를 돌려준다", () => {
    expect(verifySideAppJwt(signSideAppJwt(claims, "secret"), "secret", 60, 1030)).toEqual(claims);
  });

  it("다른 토큰이면 거절한다", () => {
    expect(() => verifySideAppJwt(signSideAppJwt(claims, "secret"), "other", 0)).toThrow("서명이 인증 토큰과 맞지 않습니다");
  });

  it("iat 가 허용 오차를 넘으면 거절한다", () => {
    expect(() => verifySideAppJwt(signSideAppJwt(claims, "secret"), "secret", 60, 1061)).toThrow("60초");
  });
});

describe("validateSideAppJson", () => {
  it("A 포맷 필수 필드가 있으면 통과한다", () => {
    expect(validateSideAppJson(SAMPLE_A)).toEqual([]);
  });

  it("B 포맷은 탭마다 items 를 요구한다", () => {
    expect(validateSideAppJson({ version: 1, layout: "B", contents: [{ id: "t", title: "탭" }] })).toEqual([
      "contents[0].items 배열이 필요합니다",
    ]);
  });
});

describe("startSideAppServer", () => {
  let dir = "";
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("올바른 JWT 에는 JSON 을, 아니면 401 을 준다", async () => {
    dir = await mkdtemp(join(tmpdir(), "side-app-"));
    const file = join(dir, "a.json");
    await writeFile(file, JSON.stringify(SAMPLE_A));
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const server = startSideAppServer({ token: "secret", file, port: 0, maxAge: 300 });
    await new Promise((r) => server.once("listening", r));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/app1`;
    const jwt = signSideAppJwt({ email: "user@example.com", iat: Math.floor(Date.now() / 1000) }, "secret");

    const good = await fetch(url, { headers: { authorization: `Bearer ${jwt}` } });
    const bad = await fetch(url, { headers: { authorization: "Bearer a.b.c" } });
    server.close();

    expect([good.status, await good.json(), bad.status]).toEqual([200, SAMPLE_A, 401]);
  });
});

describe("checkSso", () => {
  it("메타데이터에서 넘길 값을 모으고 빠진 logout 을 알린다", async () => {
    const responses: Record<string, unknown> = {
      "https://other.example.com/.well-known/openid-configuration": {
        authorization_endpoint: "https://other.example.com/auth",
        token_endpoint: "https://other.example.com/token",
        jwks_uri: "https://other.example.com/jwks",
        userinfo_endpoint: "https://other.example.com/userinfo",
        response_types_supported: ["code"],
      },
      "https://other.example.com/jwks": { keys: [{ kid: "k1", kty: "RSA" }] },
    };
    const fakeFetch = (async (url: string) =>
      url in responses ? new Response(JSON.stringify(responses[url])) : new Response("", { status: 404 })) as typeof fetch;

    const report = await checkSso("https://other.example.com/", "example.dooray.com", fakeFetch);

    expect(report.values.token_url).toBe("https://other.example.com/token");
    expect(report.doorayClient.redirect_uri).toBe("https://example.dooray.com/idp/login/oauth/callback");
    expect(report.problems).toEqual(["logout_uri(end_session_endpoint)가 없습니다. Dooray 로그아웃 때 SSO 로그아웃은 되지 않습니다"]);
  });
});
