#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/sites-env.sh"
vinext build
"$(dirname "$0")/validate-artifact.sh"
