import type { Json, ResolvedNode } from "gik-kernel";
import { runDeclarativeValidators } from "gik-evaluators";
import type { ProjectionView } from "gik-react";
import { componentStylePropsSchema } from "../shared/component";
import { defineComponent, trialNode, type ComponentDescription } from "../shared/definition";

export interface ChatAttachment {
  id: string;
  name: string;
  size?: number;
  type?: string;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  author?: string;
  timestamp?: string;
  attachments?: ChatAttachment[];
}

export const attachmentSchema = {
  type: "object", additionalProperties: false, required: ["id", "name"],
  properties: {
    id: { type: "string", minLength: 1 }, name: { type: "string", minLength: 1 },
    size: { type: "number", minimum: 0 }, type: { type: "string" },
  },
} as const;

export const messageSchema = {
  type: "object", additionalProperties: false, required: ["id", "role", "text"],
  properties: {
    id: { type: "string", minLength: 1 }, role: { enum: ["user", "assistant", "system"] },
    text: { type: "string" }, author: { type: "string" }, timestamp: { type: "string" },
    attachments: { type: "array", items: attachmentSchema },
  },
} as const;

export const composerProperties = {
  value: { type: "string" },
  models: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "label"],
    properties: { id: { type: "string", minLength: 1 }, label: { type: "string", minLength: 1 } } } },
  selectedModel: { type: "string" },
  modelSelectionDisabled: { type: "boolean" },
  acknowledged: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["id", "text"], properties: {
    id: { type: "string" }, text: { type: "string" },
  } }] },
  attachments: { type: "array", items: attachmentSchema },
  placeholder: { type: "string" },
  disabled: { type: "boolean" },
  submitting: { type: "boolean" },
  allowAttachments: { type: "boolean" },
  maxLength: { type: "integer", minimum: 1 },
  error: { type: "string" },
} as const;

export interface ComposerProps {
  value?: string;
  models?: { id: string; label: string }[];
  selectedModel?: string;
  modelSelectionDisabled?: boolean;
  acknowledged?: { id: string; text: string } | null;
  attachments?: ChatAttachment[];
  placeholder?: string;
  disabled?: boolean;
  submitting?: boolean;
  allowAttachments?: boolean;
  maxLength?: number;
  error?: string;
}

export function chatSchema(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", additionalProperties: false, properties: { ...properties, ...componentStylePropsSchema }, required };
}

export function readChatProps<T>(node: ResolvedNode, schema: Record<string, unknown>): T {
  const report = runDeclarativeValidators([{ kind: "ajv-schema", schema }], node.props);
  if (!report.ok) throw new Error(`Invalid ${node.capability} props: ${report.errors.map(error => error.detail).join("; ")}`);
  return node.props as T;
}

export function attachmentRecords(attachments: readonly ChatAttachment[]): Record<string, Json>[] {
  return attachments.map(file => ({
    id: file.id, name: file.name,
    ...(file.size === undefined ? {} : { size: file.size }),
    ...(file.type === undefined ? {} : { type: file.type }),
  }));
}

export function selectedAttachmentId(attachments: readonly ChatAttachment[], payload?: Record<string, unknown>): string {
  const index = payload?.index;
  if (typeof index !== "number" || !Number.isInteger(index) || !attachments[index])
    throw new Error("Invalid chat attachment selection.");
  return attachments[index].id;
}

export function defineChatComponent(
  description: ComponentDescription, component: ProjectionView,
  schema: Record<string, unknown>, trial: Record<string, Json>,
) {
  return defineComponent({
    description, component, version: "1.0.0", getSchema: () => schema,
    validate: props => runDeclarativeValidators([{ kind: "ajv-schema", schema }], props as Json),
    materializeTrial: () => trialNode(description.capability, trial),
  });
}
