import { createServer, type IncomingMessage, type Server } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EndpointSpec } from "../api/endpoint-spec.js";
import { ENDPOINTS, GROUP_DESCRIPTIONS } from "../api/endpoints/index.js";

const { config } = vi.hoisted(() => ({
  config: { version: 1, apiKey: "svc-key", baseUrl: "", adminApiKey: "admin-key" as string | undefined, adminBaseUrl: "" },
}));
vi.mock("../config/store.js", () => ({ getConfigOrThrow: async () => config }));
vi.mock("../cache/store.js", async (orig) => ({
  ...(await orig<typeof import("../cache/store.js")>()),
  clearCache: vi.fn(async () => true),
}));

const { mountEndpoints } = await import("./endpoint-command.js");

interface Seen {
  method: string;
  url: string;
  auth: string;
  contentType: string;
  dlp: string;
  body: string;
}
let seen: Seen[] = [];
let server: Server;
let base = "";
let dir = "";

function readAll(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const body = await readAll(req);
    seen.push({
      method: req.method!,
      url: req.url!,
      auth: req.headers.authorization ?? "",
      contentType: req.headers["content-type"] ?? "",
      dlp: String(req.headers["x-dlp-inspection"] ?? ""),
      body,
    });
    if (req.url!.startsWith("/redirect/")) {
      res.writeHead(307, { location: `${base}/files${req.url!.slice("/redirect".length)}` }).end();
      return;
    }
    if (req.url!.startsWith("/files/")) {
      res.writeHead(200, { "content-disposition": 'attachment; filename="a.txt"' }).end("file-body");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"header":{"isSuccessful":true},"result":{"id":1234567890123456789}}');
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}`;
  config.baseUrl = base;
  config.adminBaseUrl = `${base}/`;
  dir = await mkdtemp(join(tmpdir(), "endpoint-cmd-"));
});

afterAll(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

let stdout = "";
beforeEach(() => {
  seen = [];
  stdout = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
});

async function run(specs: EndpointSpec[], argv: string[]): Promise<void> {
  const program = new Command().option("--json").option("--quiet").exitOverride();
  mountEndpoints(program, specs, {});
  await program.parseAsync(argv, { from: "user" });
}

describe("mountEndpoints 로 만든 명령", () => {
  it("path 인자와 query 옵션과 --data 본문을 그대로 실어 보낸다", async () => {
    const spec: EndpointSpec = {
      command: "thing update",
      description: "갱신",
      method: "PUT", path: "x/v1/things/{thing-id}/parts/{part-id}",
      query: [{ name: "parentId", description: "상위" }, { name: "board_id", description: "게시판" }],
      body: { fields: "name" },
    };
    await run([spec], ["thing", "update", "a b", "7", "--parent-id", "9", "--board-id", "3", "--data", '{"name":"n","id":1234567890123456789}']);
    expect(seen).toEqual([
      {
        method: "PUT",
        url: "/x/v1/things/a%20b/parts/7?parentId=9&board_id=3",
        auth: "dooray-api svc-key",
        contentType: "application/json",
        dlp: "",
        body: '{"name":"n","id":"1234567890123456789"}',
      },
    ]);
    expect(stdout).toBe("id: '1234567890123456789'\n");
  });

  it("경로 값의 `:` 와 `@` 는 그대로, 나머지 예약 문자는 인코딩해 넣는다", async () => {
    const spec: EndpointSpec = { command: "thing get", description: "조회", method: "GET", path: "x/{a}/{b}" };
    await run([spec], ["thing", "get", "external-key:k/1", "user@example.com"]);
    expect(seen.map((s) => s.url)).toEqual(["/x/external-key:k%2F1/user@example.com"]);
  });

  it("admin/ 경로는 관리 API 토큰과 주소로 부른다", async () => {
    const spec: EndpointSpec = { command: "admin thing get", description: "조회", method: "GET", path: "admin/v1/things/{id}" };
    await run([spec], ["--quiet", "admin", "thing", "get", "5"]);
    expect(seen.map((s) => [s.url, s.auth])).toEqual([["/admin/v1/things/5", "dooray-api admin-key"]]);
    expect(stdout).toBe("1234567890123456789\n");
  });

  it("관리 API 토큰이 없으면 호출하지 않고 설정 방법을 알린다", async () => {
    const spec: EndpointSpec = { command: "admin thing get", description: "조회", method: "GET", path: "admin/v1/things/{id}" };
    config.adminApiKey = undefined;
    try {
      await expect(run([spec], ["admin", "thing", "get", "5"])).rejects.toThrow("dooray config set admin-api-key -");
    } finally {
      config.adminApiKey = "admin-key";
    }
    expect(seen).toEqual([]);
  });

  it("삭제는 -y 없이 non-TTY 에서 호출 전에 멈춘다", async () => {
    const spec: EndpointSpec = { command: "thing delete", description: "삭제", method: "DELETE", path: "x/v1/things/{id}" };
    await expect(run([spec], ["thing", "delete", "5"])).rejects.toThrow("--yes(-y)");
    expect(seen).toEqual([]);
    await run([spec], ["thing", "delete", "5", "-y"]);
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual(["DELETE /x/v1/things/5"]);
  });

  it("업로드는 307 을 따라가 form 필드를 file 보다 먼저 보낸다", async () => {
    const file = join(dir, "up.txt");
    await writeFile(file, "hello");
    const spec: EndpointSpec = {
      command: "thing upload",
      description: "올리기",
      method: "POST", path: "redirect/{id}",
      upload: { fields: [{ name: "type", description: "종류" }] },
    };
    await run([spec], ["thing", "upload", "5", file, "--type", "general"]);
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual(["POST /redirect/5?", "POST /files/5?"]);
    const form = seen[1].body;
    expect(form.indexOf('name="type"')).toBeLessThan(form.indexOf('name="file"'));
    expect(form).toContain("hello");
  });

  it("명세의 헤더를 옵션으로 받아 JSON 호출과 업로드에 싣는다", async () => {
    const file = join(dir, "dlp.txt");
    await writeFile(file, "x");
    const headers = [{ name: "X-DLP-Inspection", description: "DLP" }];
    const json: EndpointSpec = { command: "thing post", description: "쓰기", method: "POST", path: "x", headers };
    const upload: EndpointSpec = { command: "thing up", description: "올리기", method: "PUT", path: "redirect/1", headers, upload: {} };
    await run([json, upload], ["thing", "post", "--x-dlp-inspection", "required"]);
    await run([json, upload], ["thing", "up", file, "--x-dlp-inspection", "skip"]);
    expect(seen.map((s) => `${s.method} ${s.dlp}`)).toEqual(["POST required", "PUT skip", "PUT skip"]);
  });

  it("다운로드는 307 을 따라가 받은 파일 이름으로 저장한다", async () => {
    const spec: EndpointSpec = {
      command: "thing download", description: "받기", method: "GET", path: "redirect/{id}", download: true, fixedQuery: { media: "raw" },
    };
    await run([spec], ["thing", "download", "5", "-o", dir]);
    expect(seen[0].url).toBe("/redirect/5?media=raw");
    expect(await readFile(join(dir, "a.txt"), "utf8")).toBe("file-body");
    expect(stdout).toBe(`${join(dir, "a.txt")}\n`);
  });

  it("필수 본문이 없으면 호출하지 않는다", async () => {
    const spec: EndpointSpec = { command: "thing create", description: "생성", method: "POST", path: "x", body: { fields: "name", required: true } };
    await expect(run([spec], ["thing", "create"])).rejects.toThrow("요청 본문이 필요합니다");
    expect(seen).toEqual([]);
  });

  it("이미 있는 명령과 이름이 겹치면 등록할 때 던진다", () => {
    const program = new Command();
    program.addCommand(new Command("thing").addCommand(new Command("get")));
    const spec: EndpointSpec = { command: "thing get", description: "조회", method: "GET", path: "x" };
    expect(() => mountEndpoints(program, [spec], {})).toThrow("명령이 겹칩니다: thing get");
  });
});

describe("등록된 명세 표", () => {
  it("명령 경로와 endpoint 가 겹치지 않는다", () => {
    const commands = ENDPOINTS.map((s) => s.command);
    // 같은 경로라도 `media=meta` 와 `media=raw` 는 다른 명령이다.
    const endpoints = ENDPOINTS.map((s) => `${s.method} ${s.path} ${JSON.stringify(s.fixedQuery ?? {})}`);
    expect(commands.filter((c, i) => commands.indexOf(c) !== i)).toEqual([]);
    expect(endpoints.filter((e, i) => endpoints.indexOf(e) !== i)).toEqual([]);
  });

  it("명세가 새로 만드는 그룹마다 설명이 있다", () => {
    const groups = new Set(ENDPOINTS.flatMap((s) => {
      const words = s.command.split(" ").slice(0, -1);
      return words.map((_, i) => words.slice(0, i + 1).join(" "));
    }));
    const existing = ["project", "post", "wiki", "wiki page", "messenger", "calendar", "calendar event", "member"];
    const missing = [...groups].filter((g) => !existing.includes(g) && !(g in GROUP_DESCRIPTIONS));
    expect(missing).toEqual([]);
  });
});
