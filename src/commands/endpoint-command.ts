/**
 * `api/endpoints/` 의 명세 표로 명령을 만들어 기존 명령 나무에 단다 (ADR-069).
 */
import { Command } from "commander";
import { dump as yamlDump } from "js-yaml";
import { DoorayApiClient } from "../api/client.js";
import type { EndpointSpec, ParamSpec } from "../api/endpoint-spec.js";
import { parseJsonPreservingLargeIntegers } from "../api/json-large-integer.js";
import { clearCache } from "../cache/store.js";
import { getConfigOrThrow } from "../config/store.js";
import type { Config } from "../config/types.js";
import { printJson, printQuiet, type OutputOptions } from "../formatters/table.js";
import { resolveProject } from "../resolvers/project.js";
import { readTextInput } from "../utils/body-input.js";
import { authorizeDeletion, promptDeletion } from "../utils/delete-confirmation.js";
import { checkOutputFile, saveDownload } from "../utils/download-target.js";
import { DoorayCliError } from "../utils/errors.js";
import { EXIT_CONFIG_ERROR, EXIT_PARAM_ERROR } from "../utils/exit-codes.js";

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/[._]/g, "-");
const headerFlag = (name: string): string => name.toLowerCase();
const camel = (flag: string): string => flag.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** 경로 한 칸으로 넣는다. `:` 와 `@` 는 경로에 그대로 써도 되는 문자라 살린다 (`external-key:{키}`, 이메일 주소). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ":").replace(/%40/g, "@");
}

export function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

export function isDestructive(spec: EndpointSpec): boolean {
  return spec.destructive === true || spec.method === "DELETE";
}

export function adminClient(config: Config): DoorayApiClient {
  if (!config.adminApiKey) {
    throw new DoorayCliError(
      "관리 API 토큰이 없습니다. 발급받은 토큰을 저장하세요:\n  dooray config set admin-api-key -",
      EXIT_CONFIG_ERROR,
    );
  }
  const baseUrl = config.adminBaseUrl ?? config.baseUrl.replace("://api.", "://admin-api.");
  return new DoorayApiClient(config.adminApiKey, baseUrl);
}

function addParamOption(cmd: Command, p: ParamSpec, flagName = kebab(p.name)): void {
  const flag = `--${flagName} <value>`;
  if (p.required) cmd.requiredOption(flag, p.description);
  else cmd.option(flag, p.description);
}

function collect(
  params: ParamSpec[] | undefined,
  opts: Record<string, string>,
  flagName: (name: string) => string = kebab,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of params ?? []) {
    const v = opts[camel(flagName(p.name))];
    if (v !== undefined) out[p.name] = v;
  }
  return out;
}

async function readBody(spec: EndpointSpec, opts: Record<string, string>): Promise<unknown> {
  const text = await readTextInput({ text: opts.data, file: opts.dataFile, textFlag: "--data", fileFlag: "--data-file" });
  if (text.trim() === "") {
    if (spec.body?.required) {
      throw new DoorayCliError(`요청 본문이 필요합니다. --data 또는 --data-file 로 JSON 을 주세요.\n  필드: ${spec.body.fields}`, EXIT_PARAM_ERROR);
    }
    return spec.method === "GET" || spec.method === "DELETE" ? undefined : {};
  }
  try {
    return parseJsonPreservingLargeIntegers(text);
  } catch (e) {
    throw new DoorayCliError(`--data 가 올바른 JSON 이 아닙니다: ${(e as Error).message}`, EXIT_PARAM_ERROR);
  }
}

function ids(result: unknown): string[] {
  const items = Array.isArray(result) ? result : [result];
  return items
    .map((item) => (item && typeof item === "object" ? (item as { id?: unknown }).id : undefined))
    .filter((id): id is string | number => id !== undefined && id !== null)
    .map(String);
}

function print(res: unknown, opts: OutputOptions): void {
  const result = res && typeof res === "object" && "result" in res ? (res as { result: unknown }).result : res;
  if (opts.json) printJson(res);
  else if (opts.quiet) printQuiet(ids(result));
  else if (result === null || result === undefined) process.stdout.write("완료\n");
  else process.stdout.write(yamlDump(result, { lineWidth: -1, noRefs: true }));
  const cursor = (res as { cursor?: unknown } | null)?.cursor;
  if (!opts.json && cursor !== undefined && cursor !== null) process.stderr.write(`cursor: ${cursor}\n`);
}

export function buildEndpointCommand(name: string, spec: EndpointSpec): Command {
  const cmd = new Command(name).description(`${spec.description}\n  ${spec.method} /${spec.path}`);
  const params = pathParams(spec.path);
  for (const p of params) cmd.argument(`<${p}>`, p === "project-id" ? "프로젝트 ID 또는 코드" : p);
  if (spec.upload) {
    cmd.argument("<file>", "올릴 파일 경로");
    for (const f of spec.upload.fields ?? []) addParamOption(cmd, f);
  }
  for (const q of spec.query ?? []) addParamOption(cmd, q);
  for (const h of spec.headers ?? []) addParamOption(cmd, h, headerFlag(h.name));
  if (spec.body) {
    cmd.option("--data <json>", `JSON 요청 본문 (\`-\` 이면 stdin). 필드: ${spec.body.fields}`);
    cmd.option("--data-file <path>", "JSON 요청 본문 파일 (`-` 이면 stdin)");
  }
  if (spec.download) {
    cmd.option("-o, --output <dir>", "저장 디렉토리", ".");
    cmd.option("--output-file <path>", "저장할 파일 경로 (지정하면 -o, --output 는 무시)");
  }
  if (isDestructive(spec)) cmd.option("-y, --yes", "확인 없이 실행 (자동화용)");

  cmd.action(async (...args: unknown[]) => {
    const values = args.slice(0, params.length + (spec.upload ? 1 : 0)) as string[];
    const opts = cmd.opts<Record<string, string>>();
    const globalOpts = cmd.optsWithGlobals<OutputOptions>();

    if (isDestructive(spec)) {
      const ok = await authorizeDeletion(!!opts.yes, !!process.stdin.isTTY, () =>
        promptDeletion(`${spec.description}. 되돌릴 수 없습니다. 진행할까요?`),
      );
      if (!ok) {
        process.stderr.write("취소되었습니다.\n");
        return;
      }
    }
    if (spec.download) {
      await checkOutputFile({ command: cmd, dirKey: "output", dirFlag: "--output", outputFile: opts.outputFile });
    }
    const body = spec.body ? await readBody(spec, opts) : undefined;

    const config = await getConfigOrThrow();
    const isAdmin = spec.path.startsWith("admin/");
    const client = isAdmin ? adminClient(config) : new DoorayApiClient(config.apiKey, config.baseUrl);

    let path = spec.path;
    for (const [i, p] of params.entries()) {
      const raw = p === "project-id" && !isAdmin ? await resolveProject(client, values[i]) : values[i];
      path = path.replace(`{${p}}`, encodePathSegment(raw));
    }
    const query = { ...spec.fixedQuery, ...collect(spec.query, opts) };
    const headers = collect(spec.headers, opts, headerFlag);

    if (spec.download) {
      const { buffer, fileName } = await client.downloadEndpointFile(path, query);
      const saved = await saveDownload(
        { command: cmd, dirKey: "output", dirFlag: "--output", dirValue: opts.output, outputFile: opts.outputFile, fileName },
        new Uint8Array(buffer),
      );
      process.stdout.write(`${saved}\n`);
      return;
    }

    const res = spec.upload
      ? await client.uploadEndpointFile(spec.method, path, query, collect(spec.upload.fields, opts), values[params.length], headers)
      : await client.callEndpoint(spec.method, path, query, body, headers);

    if (spec.method !== "GET") {
      // ponytail: 쓰기 한 번에 캐시 전체를 비운다. 다시 받는 비용이 문제가 되면 엔티티별로 좁힌다.
      await clearCache().catch(() => undefined);
    }
    print(res, globalOpts);
  });
  return cmd;
}

/** 명세마다 명령 경로를 따라 그룹을 찾거나 만들고 끝에 명령을 단다. 같은 이름의 명령이 이미 있으면 던진다. */
export function mountEndpoints(root: Command, specs: EndpointSpec[], groupDescriptions: Record<string, string>): void {
  for (const spec of specs) {
    const words = spec.command.split(" ");
    const leaf = words.pop()!;
    let parent = root;
    for (const [i, w] of words.entries()) {
      let next = parent.commands.find((c) => c.name() === w);
      if (!next) {
        const key = words.slice(0, i + 1).join(" ");
        next = new Command(w).description(groupDescriptions[key] ?? `${key} 관련 명령`);
        parent.addCommand(next);
      }
      parent = next;
    }
    if (parent.commands.some((c) => c.name() === leaf)) {
      throw new Error(`명령이 겹칩니다: ${spec.command}`);
    }
    parent.addCommand(buildEndpointCommand(leaf, spec));
  }
}
