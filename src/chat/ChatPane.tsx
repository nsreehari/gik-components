import React from "react";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import type { Json } from "gik-kernel";
import type { ProjectionView } from "gik-react";
import { componentRootProps } from "../shared/component";
import { componentNode, eventContract } from "../shared/definition";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer, composerEvents } from "./ChatComposer";
import { ChatActivity } from "./ChatActivity";
import { chatSchema, composerProperties, defineChatComponent, messageSchema, readChatProps, type ChatMessageRecord, type ComposerProps } from "./contracts";

const schema = chatSchema({
  ...composerProperties, messages: { type: "array", items: messageSchema },
  conversationId: { type: "string", minLength: 1 }, title: { type: "string" },
  readOnly: { type: "boolean" }, compact: { type: "boolean" },
  hasMore: { type: "boolean" }, loadingHistory: { type: "boolean" },
  busy: { type: "boolean" }, activity: { type: "string" }, cancellable: { type: "boolean" },
}, ["messages", "conversationId"]);
interface PaneProps extends ComposerProps {
  messages: ChatMessageRecord[];
  conversationId: string;
  title?: string;
  readOnly?: boolean;
  compact?: boolean;
  hasMore?: boolean;
  loadingHistory?: boolean;
  busy?: boolean;
  activity?: string;
  cancellable?: boolean;
}
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", gap: tokens.spacingVerticalS, color: tokens.colorNeutralForeground1 },
  messages: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, flex: "1 1 0", minHeight: 0, overflowY: "auto", overflowAnchor: "none", padding: tokens.spacingVerticalM },
  compact: { gap: tokens.spacingVerticalXS, padding: tokens.spacingVerticalXS },
  heading: { margin: 0, fontSize: tokens.fontSizeBase500 },
});

export const ChatPane: ProjectionView = ({ node, emit }) => {
  const props = readChatProps<PaneProps>(node, schema), styles = useStyles();
  const messages = node.props.messages;
  if (!Array.isArray(messages)) throw new Error("Chat messages must be an array.");
  const scroll = React.useRef<HTMLDivElement>(null), sticky = React.useRef(true);
  const previous = React.useRef({ conversation: "", first: "", last: "", height: 0 });
  React.useEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const first = props.messages[0]?.id ?? "", last = props.messages.at(-1)?.id ?? "";
    const prior = previous.current;
    if (prior.conversation !== props.conversationId || sticky.current) {
      element.scrollTop = element.scrollHeight;
      sticky.current = true;
    } else if (prior.first !== first && prior.last === last) {
      element.scrollTop += element.scrollHeight - prior.height;
    }
    previous.current = { conversation: props.conversationId, first, last, height: element.scrollHeight };
  }, [props.conversationId, props.messages, props.busy, props.activity, props.loadingHistory]);
  const composer: Record<string, Json> = {};
  for (const key of Object.keys(composerProperties)) {
    const value = node.props[key];
    if (value !== undefined) composer[key] = value;
  }
  return <section {...componentRootProps(node, styles.root)} aria-label={props.title ?? "Chat"}>
    {props.title ? <h2 className={styles.heading}>{props.title}</h2> : null}
    <div ref={scroll} className={`${styles.messages} ${props.compact ? styles.compact : ""}`} role="log" aria-label="Conversation"
      aria-live="polite" aria-relevant="additions text"
      onScroll={() => { const element = scroll.current; if (element) sticky.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 72; }}>
      {props.hasMore ? <Button type="button" disabled={props.loadingHistory} onClick={() => void emit("loadPrevious", {})}>
        {props.loadingHistory ? "Loading..." : "Load Previous Messages"}
      </Button> : null}
      {!props.messages.length ? <p>No messages yet.</p> : null}
      {props.messages.map((message, index) => <ChatMessage key={message.id}
        node={componentNode(`${node.id}-message-${message.id}`, "chat:message", { message: messages[index]! })}
        emit={emit} children={null} />)}
    </div>
    {props.busy ? <ChatActivity node={componentNode(`${node.id}-activity`, "chat:activity", {
      label: props.activity ?? "Working...", cancellable: props.cancellable ?? false,
    })} emit={emit} children={null} /> : null}
    {!props.readOnly ? <ChatComposer key={props.conversationId} node={componentNode(`${node.id}-composer`, "chat:composer", composer)} emit={emit} children={null} /> : null}
    {props.readOnly && props.error ? <div role="alert">{props.error}</div> : null}
  </section>;
};

export const chatPaneDefinition = defineChatComponent({
  capability: "chat:pane", summary: "A host-driven conversation pane with history, sticky scrolling, activity and an optional composer.",
  dataProp: "messages", events: [...Object.keys(composerEvents), "loadPrevious", "cancel"],
  eventContracts: {
    ...composerEvents, loadPrevious: eventContract("The user requested an older page of messages."),
    attachmentSelect: eventContract("A message or staged attachment was selected.", {
      attachmentId: { type: "string" }, messageId: { type: "string" },
    }, ["attachmentId"]),
    cancel: eventContract("The user requested cancellation."),
  },
  semanticTokens: [], variants: [],
  authoring: {
    useWhen: ["Displaying a complete conversation"], avoidWhen: ["Owning an agent loop, session store or transport"],
    rules: ["Use a stable conversationId and unique message IDs", "Bind host-owned messages and submission acknowledgements; typing stays in the composer", "Busy indicates activity; the host separately decides whether to disable submissions", "Reject stale results in the host before updating this view"],
  },
}, ChatPane, schema, { conversationId: "example", messages: [], value: "", allowAttachments: true });
