import React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import type { ProjectionView } from "gik-react";
import { FileList } from "../primitives/file-list";
import { Markdown } from "../primitives/markdown";
import { componentRootProps } from "../shared/component";
import { componentNode, eventContract } from "../shared/definition";
import { attachmentRecords, chatSchema, defineChatComponent, messageSchema, readChatProps, selectedAttachmentId, type ChatMessageRecord } from "./contracts";

const schema = chatSchema({ message: messageSchema }, ["message"]);
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS, alignSelf: "flex-start", maxWidth: "90%", padding: tokens.spacingVerticalM, borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground2, overflowWrap: "anywhere", minWidth: 0 },
  user: { alignSelf: "flex-end", backgroundColor: tokens.colorBrandBackground2 },
  system: { alignSelf: "center", backgroundColor: "transparent", color: tokens.colorNeutralForeground2 },
  header: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalS, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
});

export const ChatMessage: ProjectionView = ({ node, emit }) => {
  const { message } = readChatProps<{ message: ChatMessageRecord }>(node, schema);
  const attachments = message.attachments ?? [];
  const styles = useStyles();
  return <article {...componentRootProps(node, styles.root, message.role === "user" && styles.user, message.role === "system" && styles.system)} aria-label={`${message.author || message.role} message`}>
    <header className={styles.header}>
      <strong>{message.author || { user: "You", assistant: "Assistant", system: "System" }[message.role]}</strong>
      {message.timestamp ? <time>{message.timestamp}</time> : null}
    </header>
    <Markdown node={componentNode(`${node.id}-body`, "primitive:markdown", { value: message.text })} emit={emit} children={null} />
    {attachments.length ? <FileList
      node={componentNode(`${node.id}-files`, "primitive:file-list", { files: attachmentRecords(attachments) })}
      emit={(_, payload) => emit("attachmentSelect", { messageId: message.id, attachmentId: selectedAttachmentId(attachments, payload) })}
      children={null}
    /> : null}
  </article>;
};

export const chatMessageDefinition = defineChatComponent({
  capability: "chat:message", summary: "Displays a user, assistant or system message with Markdown and opaque attachment references.",
  dataProp: "message", events: ["attachmentSelect"],
  eventContracts: { attachmentSelect: eventContract("An attachment was selected.", { messageId: { type: "string" }, attachmentId: { type: "string" } }) },
  semanticTokens: [], variants: [],
  authoring: {
    useWhen: ["Displaying one conversation message"], avoidWhen: ["Editing or sending a message"],
    rules: ["Use stable message and attachment IDs", "Resolve document access in the host, not through public URLs"],
  },
}, ChatMessage, schema, { message: { id: "example", role: "assistant", text: "How can I help?" } });
