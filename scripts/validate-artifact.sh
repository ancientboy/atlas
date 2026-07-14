#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "dist/server/index.js"
  "dist/.openai/hosting.json"
  "dist/.openai/drizzle/0001_bent_spirit.sql"
  "dist/.openai/drizzle/0002_lumeword_workspace_product_analysis.sql"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required Sites artifact: $file" >&2
    exit 1
  fi
done

node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const hosting = JSON.parse(await readFile("dist/.openai/hosting.json", "utf8"));
assert.equal(hosting.project_id, "appgprj_6a565b4b10d88191a9f7da7089d54c82");
assert.equal(hosting.d1, "DB");
assert.equal(hosting.r2, null);
NODE

echo "Sites artifact validation passed."
