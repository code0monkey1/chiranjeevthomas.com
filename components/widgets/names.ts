/**
 * Every widget a post or case study may place with <!-- widget:name -->. Plain data, so content loading
 * (lib/content.ts) can reject an unknown name at build time instead of the widget silently vanishing.
 */
export const WIDGET_NAMES = ["tool-gating", "approval", "invoice-architecture", "search-examples", "search-pipeline", "rag-pipeline"] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];
