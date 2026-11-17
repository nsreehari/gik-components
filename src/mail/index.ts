import type { CapabilityDescriptor } from "gik-kernel";
import { defineProjectionProvider } from "../shared/provider-set";
import { mailSendDefinition } from "./MailSend";

export { MailSend, mailSendDefinition } from "./MailSend";
export type { MailSendProps, MailSendStatus } from "./MailSend";

export const mailComponentDefinitions = {
  send: mailSendDefinition,
} as const;
export const mailComponentViews = Object.fromEntries(
  Object.entries(mailComponentDefinitions).map(([name, definition]) => [name, definition.component]),
);
export const mailComponentCapabilities: Record<string, CapabilityDescriptor> = Object.fromEntries(
  Object.entries(mailComponentDefinitions).map(([name, definition]) => [name, {
    propsSchema: definition.getSchema(), emits: [...definition.events],
    ...(definition.dataProp ? { dataProp: definition.dataProp } : {}),
  }]),
);
export const mailProjectionProvider = defineProjectionProvider({ id: "mail", definitions: mailComponentDefinitions });
