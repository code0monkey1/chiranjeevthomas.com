/**
 * The suggestion bubbles shown in the chat. Shared by the UI and the build step that precomputes
 * their answers (scripts/precompute-answers.ts), so the two can never drift apart.
 */
export const SUGGESTIONS = [
  "What has he shipped with LLMs in production?",
  "How does InvoiceChaser keep a human in the loop?",
  "What’s his experience with RAG?",
  "Is he a fit for a senior full-stack AI role?",
] as const;
