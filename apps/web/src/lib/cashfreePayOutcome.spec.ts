import { mapCashfreePayResult } from "./cashfreePayOutcome";

describe("mapCashfreePayResult", () => {
  it("maps success statuses to paid", () => {
    expect(
      mapCashfreePayResult({
        paymentDetails: { paymentStatus: "SUCCESS" },
      }),
    ).toBe("paid");
    expect(
      mapCashfreePayResult({
        paymentDetails: { paymentStatus: "PAID" },
      }),
    ).toBe("paid");
  });

  it("maps pending finished message to pending", () => {
    expect(
      mapCashfreePayResult({
        paymentDetails: { paymentMessage: "Payment finished. Check status." },
      }),
    ).toBe("pending");
  });

  it("maps cancel and expire errors", () => {
    expect(
      mapCashfreePayResult({
        error: { message: "Payment cancelled by user" },
      }),
    ).toBe("cancelled");
    expect(
      mapCashfreePayResult({
        error: { message: "Session expired" },
      }),
    ).toBe("expired");
    expect(
      mapCashfreePayResult({
        paymentDetails: { paymentStatus: "USER_DROPPED" },
      }),
    ).toBe("cancelled");
  });
});
