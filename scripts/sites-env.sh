#!/usr/bin/env bash
set -euo pipefail

export WRANGLER_WRITE_LOGS="${WRANGLER_WRITE_LOGS:-false}"
export WRANGLER_LOG_PATH="${WRANGLER_LOG_PATH:-.wrangler/logs}"
export MINIFLARE_REGISTRY_PATH="${MINIFLARE_REGISTRY_PATH:-.wrangler/registry}"
