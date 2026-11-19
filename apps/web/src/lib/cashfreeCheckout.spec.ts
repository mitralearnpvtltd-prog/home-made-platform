import { mapCashfreePayResultForTest } from "./cashfreeCheckout";

describe("mapCashfreePayResultForTest", () => {
  it("maps success statuses to paid", () => {
    expect(
      mapCashfreePayResultForTest({
        paymentDetails: { paymentStatus: "SUCCESS" },
      }),
    ).toBe("paid");
    expect(
      mapCashfreePayResultForTest({
        paymentDetails: { paymentStatus: "PAID" },
      }),
    ).toBe("paid");
  });

  it("maps pending finished message to pending", () => {
    expect(
      mapCashfreePayResultForTest({
        paymentDetails: { paymentMessage: "Payment finished. Check status." },
      }),
    ).toBe("pending");
  });

  it("maps cancel and expire errors", () => {
    expect(
      mapCashfreePayResultForTest({
        error: { message: "Payment cancelled by user" },
      }),
    ).toBe("cancelled");
    expect(
      mapCashfreePayResultForTest({
        error: { message: "Session expired" },
      }),
    ).toBe("expired");
    expect(
      mapCashfreePayResultForTest({
        paymentDetails: { paymentStatus: "USER_DROPPED" },
      }),
    ).toBe("cancelled");
  });
});
