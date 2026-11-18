import React from "react";
import { Button, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import type { ProjectionView } from "gik-react";
import { componentRootProps } from "../shared/component";
import { eventContract } from "../shared/definition";
import { chatSchema, defineChatComponent, readChatProps } from "./contracts";

export const activityProperties = {
  label: { type: "string" }, details: { type: "string" },
  cancellable: { type: "boolean" }, disabled: { type: "boolean" },
} as const;
const schema = chatSchema(activityProperties);
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", flexShrink: 0, gap: tokens.spacingVerticalXS, padding: tokens.spacingVerticalXS },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: tokens.spacingHorizontalM },
  details: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 },
});

export const ChatActivity: ProjectionView = ({ node, emit }) => {
  const props = readChatProps<{ label?: string; details?: string; cancellable?: boolean; disabled?: boolean }>(node, schema);
  const styles = useStyles();
  return <div {...componentRootProps(node, styles.root)}>
    <div className={styles.row}>
      <div role="status"><Spinner size="tiny" label={props.label ?? "Working..."} /></div>
      {props.cancellable ? <Button type="button" size="small" disabled={props.disabled} onClick={() => void emit("cancel", {})}>Cancel</Button> : null}
    </div>
    {props.details ? <details><summary>Activity Details</summary><pre className={styles.details}>{props.details}</pre></details> : null}
  </div>;
};

export const chatActivityDefinition = defineChatComponent({
  capability: "chat:activity", summary: "Displays host-supplied progress, optional details and a cancellation request.",
  events: ["cancel"], eventContracts: { cancel: eventContract("The user requested cancellation; the host decides its outcome.") },
  semanticTokens: [], variants: [],
  authoring: {
    useWhen: ["An agent or service is processing"], avoidWhen: ["Claiming an operation has completed"],
    rules: ["Provide safe user-facing activity summaries, not hidden reasoning or raw diagnostic logs", "The host owns cancellation and its receipt"],
  },
}, ChatActivity, schema, { label: "Checking sources...", cancellable: true });
