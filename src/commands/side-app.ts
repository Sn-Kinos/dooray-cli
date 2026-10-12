/**
 * `dooray side-app` — 커스텀 사이드 앱의 서버 쪽을 돌리고 Dooray 가 보낸 JWT 를 검증한다.
 * Dooray 는 사이드 앱 URL 을 `Authorization: Bearer <JWT>` 로 GET 하고, 앱은 A·B 포맷 JSON 으로 답한다.
 */
import { Command } from "commander";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { resolveConfigValue } from "../utils/config-value.js";
import { DoorayCliError } from "../utils/errors.js";
import { EXIT_PARAM_ERROR } from "../utils/exit-codes.js";

export interface SideAppClaims {
  email?: string;
  idpUserId?: string;
  doorayMemberId?: string;
  iat?: number;
}

const b64url = (buf: Buffer): string => buf.toString("base64url");

/**
 * HS512 서명을 확인하고 payload 를 돌려준다. 실패하면 이유를 담아 던진다.
 * 문서는 인증 토큰을 키로 쓴다고만 한다. 문자열 그대로와 base64 로 푼 바이트 둘 다 시도한다.
 */
export function verifySideAppJwt(jwt: string, token: string, maxAgeSec: number, nowSec = Date.now() / 1000): SideAppClaims {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("JWT 형식이 아닙니다");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string };
  if (header.alg !== "HS512") throw new Error(`지원하지 않는 alg: ${header.alg}`);
  const signed = `${parts[0]}.${parts[1]}`;
  const given = Buffer.from(parts[2], "base64url");
  const keys = [Buffer.from(token, "utf8"), Buffer.from(token, "base64")];
  const ok = keys.some((key) => {
    const expected = createHmac("sha512", key).update(signed).digest();
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
  if (!ok) throw new Error("서명이 인증 토큰과 맞지 않습니다");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as SideAppClaims;
  if (maxAgeSec > 0 && (typeof claims.iat !== "number" || Math.abs(nowSec - claims.iat) > maxAgeSec)) {
    throw new Error(`iat 가 현재 시각과 ${maxAgeSec}초 넘게 차이 납니다`);
  }
  return claims;
}

/** 테스트와 로컬 시험용으로 Dooray 와 같은 모양의 JWT 를 만든다. */
export function signSideAppJwt(claims: SideAppClaims, token: string): string {
  const head = b64url(Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha512", Buffer.from(token, "utf8")).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

/** 문서의 필수 필드만 본다. 틀린 곳을 모두 모아 돌려준다. */
export function validateSideAppJson(value: unknown): string[] {
  const errors: string[] = [];
  const v = value as { version?: unknown; layout?: unknown; contents?: unknown };
  if (v?.version !== 1) errors.push("version 은 1 이어야 합니다");
  if (v?.layout !== "A" && v?.layout !== "B") errors.push('layout 은 "A" 또는 "B" 여야 합니다');
  if (!Array.isArray(v?.contents)) return [...errors, "contents 배열이 필요합니다"];
  const checkItem = (item: { id?: unknown; title?: unknown }, at: string): void => {
    if (typeof item?.id !== "string") errors.push(`${at}.id 가 필요합니다`);
    if (typeof item?.title !== "string") errors.push(`${at}.title 이 필요합니다`);
  };
  v.contents.forEach((c: { id?: unknown; title?: unknown; items?: unknown }, i: number) => {
    checkItem(c, `contents[${i}]`);
    if (v.layout === "B") {
      if (!Array.isArray(c?.items)) errors.push(`contents[${i}].items 배열이 필요합니다`);
      else c.items.forEach((item, j) => checkItem(item as { id?: unknown }, `contents[${i}].items[${j}]`));
    }
  });
  return errors;
}

async function readSideAppJson(file: string): Promise<unknown> {
  const value: unknown = JSON.parse(await readFile(file, "utf8"));
  const errors = validateSideAppJson(value);
  if (errors.length > 0) throw new DoorayCliError(`${file}: ${errors.join(", ")}`, EXIT_PARAM_ERROR);
  return value;
}

export function startSideAppServer(opts: { token: string; file: string; port: number; maxAge: number }): Server {
  return createServer(async (req, res) => {
    const auth = req.headers.authorization ?? "";
    try {
      const claims = verifySideAppJwt(auth.replace(/^Bearer\s+/i, ""), opts.token, opts.maxAge);
      // 파일을 요청마다 읽어 서버를 켠 채로 내용을 고칠 수 있게 한다.
      const body = JSON.stringify(await readSideAppJson(opts.file));
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(body);
      process.stderr.write(`200 ${claims.email ?? claims.doorayMemberId ?? "(사용자 정보 없음)"}\n`);
    } catch (e) {
      const status = e instanceof DoorayCliError ? 500 : 401;
      res.writeHead(status).end();
      process.stderr.write(`${status} ${(e as Error).message}\n`);
    }
  }).listen(opts.port);
}

export const sideAppCommand = new Command("side-app").description("커스텀 사이드 앱 서버 실행과 JWT 검증");

sideAppCommand
  .command("serve")
  .description("Dooray 가 부르는 사이드 앱 서버를 띄운다. JWT 를 검증하고 JSON 파일을 응답한다")
  .requiredOption("--token <token>", "앱을 만들 때 받은 인증 토큰 (`-` 이면 stdin)")
  .requiredOption("--file <path>", "응답할 A·B 포맷 JSON 파일. 요청마다 다시 읽는다")
  .option("--port <port>", "들을 포트", "8080")
  .option("--max-age <seconds>", "iat 허용 오차 (0 이면 보지 않음)", "300")
  .action(async (opts: { token: string; file: string; port: string; maxAge: string }) => {
    await readSideAppJson(opts.file);
    const token = await resolveConfigValue(opts.token);
    startSideAppServer({ token, file: opts.file, port: Number(opts.port), maxAge: Number(opts.maxAge) });
    process.stderr.write(`사이드 앱 서버: http://0.0.0.0:${opts.port} (종료: Ctrl+C)\n`);
  });

sideAppCommand
  .command("verify")
  .description("Dooray 가 보낸 JWT 의 서명과 iat 를 확인하고 payload 를 출력한다")
  .argument("<jwt>", "Authorization 헤더의 Bearer 뒤 값")
  .requiredOption("--token <token>", "앱을 만들 때 받은 인증 토큰 (`-` 이면 stdin)")
  .option("--max-age <seconds>", "iat 허용 오차 (0 이면 보지 않음)", "0")
  .action(async (jwt: string, opts: { token: string; maxAge: string }) => {
    try {
      const claims = verifySideAppJwt(jwt, await resolveConfigValue(opts.token), Number(opts.maxAge));
      process.stdout.write(JSON.stringify(claims, null, 2) + "\n");
    } catch (e) {
      if (e instanceof DoorayCliError) throw e;
      throw new DoorayCliError(`JWT 검증 실패: ${(e as Error).message}`, EXIT_PARAM_ERROR);
    }
  });

sideAppCommand
  .command("check")
  .description("응답 JSON 파일이 A·B 포맷의 필수 필드를 갖췄는지 확인한다")
  .argument("<file>", "JSON 파일")
  .action(async (file: string) => {
    await readSideAppJson(file);
    process.stdout.write("형식 확인 통과\n");
  });
