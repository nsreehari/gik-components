import React from "react";
import { Button, Field, Input, makeStyles, Textarea, tokens } from "@fluentui/react-components";
import { runDeclarativeValidators } from "gik-evaluators";
import type { Json } from "gik-kernel";
import type { ProjectionView } from "gik-react";
import { componentRootProps, componentStylePropsSchema } from "../shared/component";
import { defineComponent, eventContract, trialNode } from "../shared/definition";

export type MailSendStatus = "pending-approval" | "sending" | "sent" | "cancelled" | "failed";

export interface MailSendProps {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  status?: MailSendStatus;
  editable?: boolean;
  title?: string;
  error?: string;
  messageId?: string;
}

const mailPayloadProperties = {
  to: { type: "string", minLength: 1 },
  cc: { type: "string" },
  bcc: { type: "string" },
  subject: { type: "string", minLength: 1 },
  body: { type: "string", minLength: 1 },
} as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["to", "subject", "body"],
  properties: {
    ...componentStylePropsSchema,
    ...mailPayloadProperties,
    status: { enum: ["pending-approval", "sending", "sent", "cancelled", "failed"] },
    editable: { type: "boolean" },
    title: { type: "string" },
    error: { type: "string" },
    messageId: { type: "string" },
  },
} as const;

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  heading: { margin: 0, fontSize: tokens.fontSizeBase400 },
  actions: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center", flexWrap: "wrap" },
  status: { margin: 0, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  error: { margin: 0, fontSize: tokens.fontSizeBase200, color: tokens.colorPaletteRedForeground1 },
});

export const MailSend: ProjectionView = ({ node, emit }) => {
  const validation = runDeclarativeValidators([{ kind: "ajv-schema", schema }], node.props);
  if (!validation.ok) throw new Error(validation.errors.map(error => error.detail).join("; ") || "Invalid mail:send props.");
  const props = node.props as unknown as MailSendProps;
  const styles = useStyles();
  const status: MailSendStatus = props.status ?? "pending-approval";
  const canEdit = (props.editable ?? true) && (status === "pending-approval" || status === "failed");
  const canAct = status === "pending-approval" || status === "failed";

  const [to, setTo] = React.useState(props.to);
  const [cc, setCc] = React.useState(props.cc ?? "");
  const [bcc, setBcc] = React.useState(props.bcc ?? "");
  const [subject, setSubject] = React.useState(props.subject);
  const [body, setBody] = React.useState(props.body);

  React.useEffect(() => {
    setTo(props.to);
    setCc(props.cc ?? "");
    setBcc(props.bcc ?? "");
    setSubject(props.subject);
    setBody(props.body);
  }, [props.to, props.cc, props.bcc, props.subject, props.body]);

  const valid = to.trim().length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  return <section {...componentRootProps(node, styles.root)} aria-label={props.title ?? "Approve Outbound Email"}>
    <h3 className={styles.heading}>{props.title ?? "Approve Outbound Email"}</h3>
    <Field label="To" required>
      <Input value={to} readOnly={!canEdit} onChange={(_, data) => setTo(data.value)} />
    </Field>
    {(cc || canEdit) ? <Field label="Cc">
      <Input value={cc} readOnly={!canEdit} onChange={(_, data) => setCc(data.value)} />
    </Field> : null}
    {(bcc || canEdit) ? <Field label="Bcc">
      <Input value={bcc} readOnly={!canEdit} onChange={(_, data) => setBcc(data.value)} />
    </Field> : null}
    <Field label="Subject" required>
      <Input value={subject} readOnly={!canEdit} onChange={(_, data) => setSubject(data.value)} />
    </Field>
    <Field label="Message" required>
      <Textarea value={body} readOnly={!canEdit} rows={6} onChange={(_, data) => setBody(data.value)} />
    </Field>
    {props.error ? <p className={styles.error} role="alert">{props.error}</p> : null}
    {status === "sent" ? <p className={styles.status} role="status">
      {props.messageId ? `Email sent (Message ID: ${props.messageId}).` : "Email sent."}
    </p> : null}
    {status === "cancelled" ? <p className={styles.status} role="status">Cancelled — email was not sent.</p> : null}
    {status === "sending" ? <p className={styles.status} role="status">Sending approved email...</p> : null}
    {canAct ? <div className={styles.actions}>
      <Button appearance="primary" type="button" disabled={!valid}
        onClick={() => void emit("approve", {
          to: to.trim(),
          ...(cc.trim() ? { cc: cc.trim() } : {}),
          ...(bcc.trim() ? { bcc: bcc.trim() } : {}),
          subject: subject.trim(),
          body,
        })}>
        Approve &amp; Send
      </Button>
      <Button type="button" onClick={() => void emit("cancel", {})}>Cancel</Button>
    </div> : null}
  </section>;
};

const approveSchema = {
  type: "object",
  additionalProperties: false,
  required: ["to", "subject", "body"],
  properties: mailPayloadProperties,
} as const;

const description = {
  capability: "mail:send",
  summary: "Outbound email review and per-message approval view; emits approve only on explicit user confirmation.",
  events: ["approve", "cancel"],
  eventContracts: {
    approve: eventContract("The user reviewed and approved sending this complete email.", approveSchema.properties, ["to", "subject", "body"]),
    cancel: eventContract("The user cancelled sending this email."),
  },
  semanticTokens: [],
  variants: [],
  authoring: {
    useWhen: ["An outbound email requires explicit user review and per-message approval before sending"],
    avoidWhen: ["Sending an email automatically without showing the complete recipient, subject, and body"],
    rules: ["Only emit approve when the user clicks Approve & Send", "Never invoke network or OAuth operations from the component"],
  },
} as const;

export const mailSendDefinition = defineComponent({
  version: "1.0.0",
  description,
  component: MailSend,
  getSchema: () => schema,
  validate: props => runDeclarativeValidators([{ kind: "ajv-schema", schema }], props as Json),
  materializeTrial: () => trialNode(description.capability, {
    to: "advisor@example.test", subject: "Quarterly Summary", body: "Please find the summary attached.",
    status: "pending-approval",
  }),
});
