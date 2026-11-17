import assert from "node:assert/strict";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Input, Textarea } from "@fluentui/react-components";
import { test } from "vitest";
import type { Json, ResolvedNode } from "gik-kernel";
import { ChatComposer, ChatPane, chatComponentDefinitions } from "../src/chat";
import { MailSend, mailSendDefinition } from "../src/mail";

function node(capability: string, props: Record<string, Json>): ResolvedNode {
  return { id: "test", capability, props, visible: true, fallback: false, children: [] };
}

test("chat and mail definitions validate trials and reject attachment bytes", () => {
  for (const definition of [...Object.values(chatComponentDefinitions), mailSendDefinition]) {
    assert.equal(definition.validate(definition.materializeTrial().props).ok, true);
  }
  assert.equal(chatComponentDefinitions.composer.validate({
    attachments: [{ id: "a", name: "Synthetic.txt", bytes: "not-an-attachment-reference" }],
  }).ok, false);
});

test("composer keeps newer edits when a submission is acknowledged", () => {
  const events: [string, unknown][] = [];
  const emit = (name: string, payload?: Record<string, unknown>) => { events.push([name, payload]); };
  const view = (props: Record<string, Json>) =>
    <ChatComposer node={node("chat:composer", props)} emit={emit} children={null} />;
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(view({ value: "First" })); });
  act(() => { renderer.root.findByType(Button).props.onClick(); });
  assert.deepEqual(events.at(-1), ["submit", { text: "First", attachments: [] }]);
  act(() => { renderer.root.findByType(Textarea).props.onChange({}, { value: "Newer" }); });
  act(() => { renderer.update(view({ acknowledged: { id: "receipt-1", text: "First" } })); });
  assert.equal(renderer.root.findByType(Textarea).props.value, "Newer");
  act(() => { renderer.root.findByType(Button).props.onClick(); });
  act(() => { renderer.update(view({ acknowledged: { id: "receipt-2", text: "Newer" } })); });
  assert.equal(renderer.root.findByType(Textarea).props.value, "");
  act(() => { renderer.unmount(); });
});

test("composer suppresses IME and Shift+Enter submissions and emits advertised model IDs", () => {
  const events: string[] = [];
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<ChatComposer
    node={node("chat:composer", { value: "Draft", models: [{ id: "local", label: "Local" }] })}
    emit={name => { events.push(name); }} children={null} />); });
  const key = (shiftKey: boolean, isComposing: boolean) => ({
    key: "Enter", shiftKey, nativeEvent: { isComposing }, preventDefault() {},
  });
  act(() => {
    const textarea = renderer.root.findByType(Textarea);
    textarea.props.onKeyDown(key(false, true));
    textarea.props.onKeyDown(key(true, false));
    renderer.root.findByType("select").props.onChange({ target: { value: "unadvertised" } });
  });
  assert.deepEqual(events, []);
  act(() => {
    renderer.root.findByType(Textarea).props.onKeyDown(key(false, false));
    renderer.root.findByType("select").props.onChange({ target: { value: "local" } });
  });
  assert.deepEqual(events, ["submit", "modelChange"]);
  act(() => { renderer.unmount(); });
});

test("pane activity does not disable composing and read-only omits the composer", () => {
  const render = (readOnly: boolean) => renderToStaticMarkup(<ChatPane
    node={node("chat:pane", { conversationId: "synthetic", messages: [], busy: true, readOnly })}
    emit={() => undefined} children={null} />);
  assert.match(render(false), /textarea/);
  assert.doesNotMatch(render(false), /<textarea[^>]*disabled/);
  assert.doesNotMatch(render(true), /textarea/);
});

test("mail emits the reviewed fields and suppresses actions after admission", () => {
  const events: [string, unknown][] = [];
  const emit = (name: string, payload?: Record<string, unknown>) => { events.push([name, payload]); };
  const props = { to: "person@example.test", subject: "Synthetic", body: "Original" };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<MailSend node={node("mail:send", props)} emit={emit} children={null} />); });
  act(() => {
    renderer.root.findAllByType(Input)[0].props.onChange({}, { value: " edited@example.test " });
    renderer.root.findByType(Textarea).props.onChange({}, { value: "Reviewed body\n" });
  });
  act(() => { renderer.root.findAllByType(Button)[0].props.onClick(); });
  assert.deepEqual(events, [["approve", { to: "edited@example.test", subject: "Synthetic", body: "Reviewed body\n" }]]);
  act(() => { renderer.update(<MailSend node={node("mail:send", { ...props, status: "sending" })} emit={emit} children={null} />); });
  assert.equal(renderer.root.findAllByType(Button).length, 0);
  assert.equal(renderer.root.findByType(Textarea).props.readOnly, true);
  act(() => { renderer.unmount(); });
});
