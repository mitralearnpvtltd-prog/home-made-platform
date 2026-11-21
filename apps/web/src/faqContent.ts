export const FAQ_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "pickup", label: "Pickup & Journey" },
  { id: "payments", label: "Payments" },
] as const;

export type FaqCategory = Exclude<
  (typeof FAQ_CATEGORIES)[number]["id"],
  "all"
>;

type FaqSurface = "support" | "faq" | "landing";

export type FaqEntry = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string | null;
  surfaceOrder: Partial<Record<FaqSurface, number>>;
};

export const FAQ_CONTENT: readonly FaqEntry[] = [
  {
    id: "track-order-from-my-orders",
    category: "orders",
    question: "How can I track my order?",
    answer:
      "Open My Orders and select View details on an ongoing order to see its latest status.",
    surfaceOrder: { support: 0 },
  },
  {
    id: "cancel-order",
    category: "orders",
    question: "Can I cancel my order?",
    answer:
      "If your order is still being prepared, open its details and contact support for help with cancellation.",
    surfaceOrder: { support: 1 },
  },
  {
    id: "accepted-payment-methods",
    category: "payments",
    question: "What payment methods are accepted?",
    answer:
      "You can pay using UPI apps such as Google Pay, PhonePe and Paytm, or enter another UPI ID.",
    surfaceOrder: { support: 2, faq: 2 },
  },
  {
    id: "contact-home-cook",
    category: "orders",
    question: "How do I contact a home cook?",
    answer:
      "Open your order details to find the pickup information and available order support options.",
    surfaceOrder: { support: 3 },
  },
  {
    id: "place-an-order",
    category: "orders",
    question: "How can I place an order?",
    answer:
      "Choose a kitchen along your route, add meals to your bag, confirm pickup details, and complete payment on Cashfree.",
    surfaceOrder: { faq: 0 },
  },
  {
    id: "collect-my-order",
    category: "pickup",
    question: "Where do I collect my order?",
    answer:
      "Collect your order at the pickup point shown on your order summary, usually near the main entrance of the bus stand.",
    surfaceOrder: { faq: 1 },
  },
  {
    id: "cancel-or-modify-order",
    category: "orders",
    question: "Can I cancel or modify my order?",
    answer:
      "If your order is still being prepared, open its details and contact support for help with cancellation or changes.",
    surfaceOrder: { faq: 3 },
  },
  {
    id: "know-when-order-is-ready",
    category: "orders",
    question: "How will I know when my order is ready?",
    answer:
      "You’ll get order status updates in the app and notifications when your meal is ready for pickup.",
    surfaceOrder: { faq: 4 },
  },
  {
    id: "does-aahaa-arrange-bus-stop",
    category: "pickup",
    question: "Does Aahaa arrange a stop for my bus?",
    answer:
      "No. Choose a supported pickup point where your bus already stops, and confirm the stop with your bus operator.",
    surfaceOrder: { landing: 0 },
  },
  {
    id: "bus-delayed",
    category: "pickup",
    question: "What if my bus is delayed?",
    answer: null,
    surfaceOrder: { landing: 1 },
  },
  {
    id: "find-delivery-partner",
    category: "orders",
    question: "How do I find my delivery partner?",
    answer: null,
    surfaceOrder: { landing: 2 },
  },
  {
    id: "change-pickup-point",
    category: "pickup",
    question: "Can I change my pickup point?",
    answer: null,
    surfaceOrder: { landing: 3 },
  },
  {
    id: "cancel-order-or-request-refund",
    category: "orders",
    question: "Can I cancel my order or request a refund?",
    answer: null,
    surfaceOrder: { landing: 4 },
  },
  {
    id: "track-food-delivery-order",
    category: "orders",
    question: "How can I track my food delivery order?",
    answer: null,
    surfaceOrder: { landing: 5 },
  },
];

export function getFaqsForSurface(surface: FaqSurface): readonly FaqEntry[] {
  return FAQ_CONTENT.filter((faq) => faq.surfaceOrder[surface] !== undefined).sort(
    (left, right) =>
      (left.surfaceOrder[surface] ?? 0) - (right.surfaceOrder[surface] ?? 0),
  );
}
