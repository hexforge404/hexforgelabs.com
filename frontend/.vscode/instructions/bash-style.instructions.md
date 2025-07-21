---
applyTo: "**/*.sh"
description: "Bash scripting rules for secure scripts"
---
Always start with `#!/usr/bin/env bash`

Use `set -euo pipefail` to catch errors.

Avoid unquoted variables. Prefer `"${var}"`.
