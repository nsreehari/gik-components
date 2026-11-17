import React from "react";
import { Button, Textarea, makeStyles, tokens } from "@fluentui/react-components";
import type { ProjectionView } from "gik-react";
import { FileList } from "../primitives/file-list";
import { componentRootProps } from "../shared/component";
import { componentNode, eventContract } from "../shared/definition";
import { attachmentRecords, attachmentSchema, chatSchema, composerProperties, defineChatComponent, readChatProps, selectedAttachmentId, type ComposerProps } from "./contracts";

export const composerSchema = chatSchema(composerProperties);
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", flexShrink: 0, gap: tokens.spacingVerticalS, minWidth: 0 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: tokens.spacingHorizontalS },
  input: { width: "100%", minWidth: 0, minHeight: "64px", maxHeight: "160px" },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export const composerEvents = {
  modelChange: eventContract("The user requested one of the host-advertised models.", { id: { type: "string", minLength: 1 } }),
  draftChange: eventContract("The component became nonempty or empty; draft text stays local.", { dirty: { type: "boolean" } }),
  submit: eventContract("The user requested submission; the host must acknowledge it before clearing the draft.", {
    text: { type: "string" }, attachments: { type: "array", items: attachmentSchema },
  }),
  attach: eventContract("The host should open its file acquisition UI."),
  attachmentSelect: eventContract("A staged attachment was selected.", { attachmentId: { type: "string" } }),
  attachmentRemove: eventContract("The user requested removal of a staged reference.", { attachmentId: { type: "string" } }),
};

export const ChatComposer: ProjectionView = ({ node, emit }) => {
  const props = readChatProps<ComposerProps>(node, composerSchema);
  const styles = useStyles(), errorId = `${node.id}-error`;
  const [value, setValue] = React.useState(props.value ?? "");
  const latest = React.useRef(value), revision = React.useRef(0);
  const submitted = React.useRef<{ text: string; revision: number }>();
  const attachments = props.attachments ?? [];
  const change = (next: string) => {
    const changed = Boolean(latest.current.trim()) !== Boolean(next.trim());
    latest.current = next;
    revision.current++;
    setValue(next);
    if (changed) void emit("draftChange", { dirty: Boolean(next.trim()) });
  };
  React.useEffect(() => {
    const accepted = submitted.current;
    if (!props.acknowledged || !accepted || props.acknowledged.text !== accepted.text) return;
    if (revision.current === accepted.revision) change("");
    submitted.current = undefined;
  }, [props.acknowledged?.id]);
  const disabled = props.disabled || props.submitting;
  const canSubmit = !disabled && Boolean(value.trim() || attachments.length)
    && (props.maxLength === undefined || value.length <= props.maxLength);
  const submit = () => {
    if (!canSubmit) return;
    submitted.current = { text: latest.current, revision: revision.current };
    void emit("submit", { text: latest.current, attachments: attachmentRecords(attachments) });
  };
  return <div {...componentRootProps(node, styles.root)}>
    {attachments.length ? <FileList
      node={componentNode(`${node.id}-files`, "primitive:file-list", { files: attachmentRecords(attachments), removable: !disabled })}
      emit={(name, payload) => emit(name === "remove" ? "attachmentRemove" : "attachmentSelect", { attachmentId: selectedAttachmentId(attachments, payload) })}
      children={null}
    /> : null}
    <Textarea className={styles.input} aria-label="Message" aria-describedby={props.error ? errorId : undefined}
        value={value} rows={2} resize="vertical" disabled={disabled} maxLength={props.maxLength}
        placeholder={props.placeholder ?? "Write a message..."}
        onChange={(_, data) => change(data.value)}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault(); submit();
          }
        }} />
    <div className={styles.row}>
      {props.allowAttachments ? <Button type="button" size="small" disabled={disabled} onClick={() => void emit("attach", {})}>Attach Files</Button> : <span />}
      {props.models?.length ? <label>Model <select aria-label="Model" value={props.selectedModel ?? ""}
        disabled={props.modelSelectionDisabled || props.submitting}
        title={props.modelSelectionDisabled ? "Start a new empty chat to change its model." : undefined}
        onChange={event => {
          const id = event.target.value;
          if (props.models?.some(model => model.id === id)) void emit("modelChange", { id });
        }}>
        {!props.models.some(model => model.id === props.selectedModel) && <option value="" disabled>Select Model</option>}
        {props.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
      </select></label> : null}
      <Button type="button" size="small" appearance="primary" disabled={!canSubmit} onClick={submit}>{props.submitting ? "Sending..." : "Send"}</Button>
    </div>
    {props.error ? <div id={errorId} role="alert" className={styles.error}>{props.error}</div> : null}
  </div>;
};

export const chatComposerDefinition = defineChatComponent({
  capability: "chat:composer", summary: "A component-local multiline draft with staged attachment references and explicit host acknowledgement.",
  events: Object.keys(composerEvents), eventContracts: composerEvents, semanticTokens: [], variants: [],
  authoring: {
    useWhen: ["Composing text and optional attachments"], avoidWhen: ["Directly uploading or storing documents"],
    rules: ["Value seeds the local draft; keep the component mounted while preserving unsent text", "Bind attachment references and acknowledged submission IDs and text in the host", "Clear only after acknowledged submission and never erase newer edits", "Use Enter to send and Shift+Enter for a newline", "Handle attach with host-owned acquisition; never put File objects or document bytes in events"],
  },
}, ChatComposer, composerSchema, { value: "", allowAttachments: true });
