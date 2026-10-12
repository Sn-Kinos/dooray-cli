import { afterEach, describe, expect, it, vi } from "vitest";
import { DoorayApiClient } from "./client.js";

// fetch 가 Latin-1 로 읽은 헤더와 307 redirect 를 흉내 내 클라이언트 전체 경로를 확인한다.
function stubDownload(disposition: string | null, list: unknown) {
  const fileRes = new Response("x", {
    headers: disposition ? { "content-disposition": disposition } : {},
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (String(url).includes("/redirected")) return fileRes;
    return new Response(JSON.stringify(list), { headers: { "content-type": "application/json" } });
  }));
}

function client() {
  const c = new DoorayApiClient("key", "https://example.dooray.com");
  const api = {
    get: vi.fn((url: string) => {
      if (url.endsWith("/files")) return { json: async () => ({ result: [{ id: "f1", name: "목록 이름.pdf".normalize("NFD") }] }) };
      return Promise.resolve(new Response(null, { status: 307, headers: { location: "https://example.dooray.com/redirected" } }));
    }),
  };
  (c as unknown as { api: unknown }).api = api;
  return { c, api };
}

afterEach(() => vi.unstubAllGlobals());

describe("downloadPostFile 파일명", () => {
  it("mojibake 이름을 복원한다", async () => {
    stubDownload(`attachment; filename="${Buffer.from("한글.txt").toString("latin1")}"`, {});
    const { c, api } = client();
    expect((await c.downloadPostFile("p", "q", "f1")).fileName).toBe("한글.txt");
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("디코딩 실패 시 목록 name 으로 대체한다", async () => {
    stubDownload('attachment; filename="=?X-UNKNOWN?Q?a?="', {});
    const { c } = client();
    expect((await c.downloadPostFile("p", "q", "f1")).fileName).toBe("목록 이름.pdf");
  });

  it("호출자가 이름을 주면 목록을 다시 조회하지 않는다", async () => {
    stubDownload(null, {});
    const { c, api } = client();
    expect((await c.downloadPostFile("p", "q", "f1", "known.txt")).fileName).toBe("known.txt");
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
