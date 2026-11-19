import { load } from "@cashfreepayments/cashfree-js";
import {
  mapCashfreePayResult,
  type CashfreePaymentOutcome,
} from "./cashfreePayOutcome";

export type CashfreeCheckoutMode = "sandbox" | "production";
export type { CashfreePaymentOutcome };

function resolveCheckoutMode(mode: CashfreeCheckoutMode): CashfreeCheckoutMode {
  // Sandbox-only integration for local development. Never open production from the web app.
  return mode === "production" ? "sandbox" : "sandbox";
}

export async function openCashfreeHostedCheckout(input: {
  paymentSessionId: string;
  mode: CashfreeCheckoutMode;
}): Promise<CashfreePaymentOutcome> {
  const mode = resolveCheckoutMode(input.mode);
  const cashfree = await load({ mode });
  if (!cashfree) {
    throw new Error("Cashfree checkout could not be loaded in this environment.");
  }

  // Cashfree WAF blocks loopback return_url values, so the API omits them for
  // localhost. Use an in-page modal locally (avoids popup blockers after async
  // order/session creation). Deployed envs use same-tab redirect (_self), which
  // is also not subject to popup blockers.
  const isLoopbackHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]");

  const result = await cashfree.checkout({
    paymentSessionId: input.paymentSessionId,
    redirectTarget: isLoopbackHost ? "_modal" : "_self",
  });

  // Redirect checkout usually navigates away before this resolves.
  if (!result || typeof result !== "object") {
    return "redirect";
  }

  return mapCashfreePayResult(result);
}
