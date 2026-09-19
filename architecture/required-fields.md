# Required fields

## One contract, three responsibilities

For every new or changed field, including shared controls and changes introduced by merges:

1. Client and server validation enforce the intended input contract.
2. A visible label or associated instruction identifies required entry before submission.
3. The interactive control exposes native `required` where applicable and appropriate accessibility semantics.

A label marker alone does not make a control accessible, and `aria-required` does not validate input. Associate labels, instructions, and errors with the actual focusable control. Apply only attributes supported by that control's role.

## Value and interaction semantics

- Inspect the value a widget emits when cleared: empty text, `null`, `undefined`, and empty arrays are distinct inputs.
- Preserve valid zero and false values. Reject missing required values before coercion can turn them into a number or date.
- Omission from a partial update means something different from clearing a value in a full editor. Do not infer that every field is optional from a PATCH schema.
- Keep disabled/read-only states, conditional requirements, and draft versus final-submit behavior explicit.
- For an at-least-one group, associate the instruction with the group instead of incorrectly requiring every member.
- A composite lookup's search box must not inherit the selected-value requirement.
- A local prerequisite may be required without being a submitted field. Do not invent a server schema path for it.

Centralize requirement metadata and accessibility behavior in shared adapters when the component system is established. Unknown requirements need inspection; they are not automatically optional.

## Verification

Check schema behavior and rendered labels, native/ARIA attributes, error associations, and successful recovery. Changes to shared controls warrant a representative browser journey. Static inventories can help find missing coverage but cannot prove runtime accessibility. No automated form-audit script has been installed in this project.
