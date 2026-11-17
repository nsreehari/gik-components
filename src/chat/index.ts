import type { CapabilityDescriptor } from "gik-kernel";
import { defineProjectionProvider } from "../shared/provider-set";
import { chatMessageDefinition } from "./ChatMessage";
import { chatComposerDefinition } from "./ChatComposer";
import { chatActivityDefinition } from "./ChatActivity";
import { chatPaneDefinition } from "./ChatPane";

export { ChatMessage, chatMessageDefinition } from "./ChatMessage";
export { ChatComposer, chatComposerDefinition } from "./ChatComposer";
export { ChatActivity, chatActivityDefinition } from "./ChatActivity";
export { ChatPane, chatPaneDefinition } from "./ChatPane";
export type { ChatAttachment, ChatMessageRecord, ComposerProps } from "./contracts";

export const chatComponentDefinitions = {
  message: chatMessageDefinition, composer: chatComposerDefinition,
  activity: chatActivityDefinition, pane: chatPaneDefinition,
} as const;
export const chatComponentViews = Object.fromEntries(
  Object.entries(chatComponentDefinitions).map(([name, definition]) => [name, definition.component]),
);
export const chatComponentCapabilities: Record<string, CapabilityDescriptor> = Object.fromEntries(
  Object.entries(chatComponentDefinitions).map(([name, definition]) => [name, {
    propsSchema: definition.getSchema(), emits: [...definition.events],
    ...(definition.dataProp ? { dataProp: definition.dataProp } : {}),
  }]),
);
export const chatProjectionProvider = defineProjectionProvider({ id: "chat", definitions: chatComponentDefinitions });
