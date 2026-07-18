#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "dist/server/index.js"
  "dist/.openai/hosting.json"
  "dist/.openai/drizzle/0001_bent_spirit.sql"
  "dist/.openai/drizzle/0002_lumeword_workspace_product_analysis.sql"
  "dist/.openai/drizzle/0003_growth_campaign_agent.sql"
  "dist/.openai/drizzle/0004_distribution_attribution.sql"
  "dist/.openai/drizzle/0005_workspace_oauth_connections.sql"
  "dist/.openai/drizzle/0006_atlas_multi_provider_auth.sql"
  "dist/.openai/drizzle/0007_agent_runtime.sql"
  "dist/.openai/drizzle/0008_growth_operator_decisions.sql"
  "dist/.openai/drizzle/0009_observation_engine.sql"
  "dist/.openai/drizzle/0010_posthog_growth_metrics.sql"
  "dist/.openai/drizzle/0011_autonomy_loop.sql"
  "dist/.openai/drizzle/0012_workspace_autonomy_control.sql"
  "dist/.openai/drizzle/0013_company_runtime.sql"
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
