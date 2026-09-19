# Authentication and authorization

The authentication provider, roles, scopes, tenancy, and ownership model have not been selected. The source project's permission and assignment model is not inherited.

## Trust boundaries

- Authenticate and authorize protected server operations. Explicitly document intentionally public or delegated routes.
- Client route guards and permission-aware controls improve presentation but never enforce access.
- Resolve the actual resource and its owner before evaluating scoped access. Parent identifiers, URL nesting, and related foreign keys do not automatically grant authority.
- Define authorization targets explicitly. Child, sibling, collection, lookup, export, and attachment access need deliberate policies.
- Recheck mutable permissions and resource state inside sensitive write transactions under appropriate concurrency control.

Before adding a resource, document its allowed actions, ownership and scopes, creation authority, inheritance rules, and exceptional operations. Resolve ambiguous product policy with the user rather than copying permissions from an adjacent feature.

## Verification

Test allowed and denied operations, inactive identities where applicable, wrong-owner access, child/sibling isolation, and permission changes during sensitive operations. Test concrete ownership resolution using expectations authored independently from the policy implementation. Document deliberate global/public classifications instead of using them as fallback for missing ownership.
