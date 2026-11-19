declare module "@cashfreepayments/cashfree-js" {
  export type CashfreeMode = "sandbox" | "production";

  export type CashfreeCheckoutResult = {
    error?: unknown;
    paymentDetails?: {
      paymentStatus?: string;
      paymentMessage?: string;
    };
  };

  export type CashfreeInstance = {
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
    }) => Promise<CashfreeCheckoutResult | undefined>;
  };

  export function load(options: { mode: CashfreeMode }): Promise<CashfreeInstance | null>;
}
