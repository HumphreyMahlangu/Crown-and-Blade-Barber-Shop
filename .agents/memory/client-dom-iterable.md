---
name: Generated client DOM typings
description: A shared generated API client uses Headers.entries during workspace typechecking.
---

The shared API client package must include `dom.iterable` in its TypeScript `lib` list because generated fetch helpers call `Headers.entries()`.

**Why:** The generated client can be correct at runtime but fail the workspace composite typecheck when only `dom` is enabled.

**How to apply:** If API codegen introduces `Headers.entries` errors, fix the client package TypeScript lib configuration rather than editing generated output.