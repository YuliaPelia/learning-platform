import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  applyPaymentEvent: vi.fn(),
  getWfpConfig: vi.fn(),
  parseCallbackBody: vi.fn(),
  verifyCallback: vi.fn(),
  acceptResponse: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing", () => ({ applyPaymentEvent: m.applyPaymentEvent }));
vi.mock("@/lib/wayforpay", () => ({
  getWfpConfig: m.getWfpConfig,
  parseCallbackBody: m.parseCallbackBody,
  verifyCallback: m.verifyCallback,
  acceptResponse: m.acceptResponse,
}));

import { POST } from "@/app/api/payments/wayforpay/callback/route";

const req = () => new Request("http://x/api", { method: "POST", body: "{}" });

describe("POST /api/payments/wayforpay/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.getWfpConfig.mockReturnValue({ merchantAccount: "m", secretKey: "k" });
    m.parseCallbackBody.mockReturnValue({ merchantAccount: "m", orderReference: "ITC-1" });
    m.verifyCallback.mockReturnValue(true);
    m.applyPaymentEvent.mockResolvedValue("applied");
    m.acceptResponse.mockReturnValue({ status: "accept" });
  });

  it("неправильний підпис → 400 і applyPaymentEvent не викликається", async () => {
    m.verifyCallback.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(m.applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("чужий merchantAccount → 400 і applyPaymentEvent не викликається", async () => {
    m.parseCallbackBody.mockReturnValue({ merchantAccount: "other", orderReference: "ITC-1" });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(m.applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("нерозбірливе тіло → 400", async () => {
    m.parseCallbackBody.mockReturnValue(null);
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(m.applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("amount_mismatch → 400 і acceptResponse не викликається", async () => {
    m.applyPaymentEvent.mockResolvedValue("amount_mismatch");
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(m.acceptResponse).not.toHaveBeenCalled();
  });

  it("валідний callback → applyPaymentEvent викликано, 200", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(m.applyPaymentEvent).toHaveBeenCalledTimes(1);
  });
});
