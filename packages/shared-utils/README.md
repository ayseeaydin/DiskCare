# @diskcare/shared-utils

Shared utilities used across DiskCare packages.

## What it provides

- Result helpers (`ok`, `err`, `fromPromise`, etc.)
- Error message formatting (`toErrorMessage`, `toOneLine`)
- PathResolver for platform-aware path handling

## Usage

```ts
import { ok, err, fromPromise, toErrorMessageOneLine, PathResolver } from "@diskcare/shared-utils";

const resolver = new PathResolver(process.platform);
const path = resolver.join(process.cwd(), "config", "rules.json");
```
