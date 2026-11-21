export type SupportChatQuestion = {
  id: string;
  question: string;
  answer: string;
};

export const SUPPORT_CHAT_QUESTIONS: readonly SupportChatQuestion[] = [
  {
    id: "place-an-order",
    question: "How can I place an order?",
    answer:
      "Browse the available home cooks and their menus, choose the food you want, add it to your cart, and follow the checkout steps to place your order.",
  },
  {
    id: "track-order",
    question: "How can I track my order?",
    answer:
      "Open My Orders and select your order to view its latest available status.",
  },
  {
    id: "payment-methods",
    question: "What payment methods are accepted?",
    answer: "You can pay using the payment options displayed at checkout.",
  },
  {
    id: "cancel-or-modify-order",
    question: "Can I cancel or modify my order?",
    answer:
      "Cancellation or modification may depend on your order's current status. Please contact support for assistance.",
  },
  {
    id: "pickup-location",
    question: "Where can I collect my order?",
    answer:
      "Check your order details for the pickup information provided for your order.",
  },
  {
    id: "contact-home-cook",
    question: "How do I contact a home cook?",
    answer:
      "Open your order details to find the available contact or support options.",
  },
  {
    id: "payment-problem",
    question: "I have a payment problem. What should I do?",
    answer:
      "Check your payment status in your order details. If the issue continues, contact Aahaa support.",
  },
];

export const UNSUPPORTED_SUPPORT_CHAT_ANSWER =
  "I'm sorry, I don't have an answer for that question yet. Please choose one of the common questions or contact Aahaa support for help.";
