#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/sites-env.sh"
npx vinext build
"$(dirname "$0")/validate-artifact.sh"
