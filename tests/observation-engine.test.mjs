import test from "node:test";
import assert from "node:assert/strict";
import {
  describeGithubChange,
  discoverGithubRepository,
  normalizeGithubRepositoryUrl,
  observationFingerprint,
  readGithubRepository,
} from "../lib/observation-engine.ts";

test("GitHub repository discovery normalizes only public repository URLs", () => {
  assert.equal(normalizeGithubRepositoryUrl("https://github.com/ancientboy/atlas.git"), "https://github.com/ancientboy/atlas");
  assert.equal(discoverGithubRepository("Source: https://github.com/ancientboy/atlas#readme"), "https://github.com/ancientboy/atlas");
  assert.equal(discoverGithubRepository("No repository here"), null);
  assert.throws(() => normalizeGithubRepositoryUrl("https://gitlab.com/ancientboy/atlas"), /Only public GitHub/);
});

test("observation fingerprints are stable and change with normalized source data", async () => {
  const first = await observationFingerprint("website", { title: "Atlas", body: "v1" });
  const same = await observationFingerprint("website", { title: "Atlas", body: "v1" });
  const changed = await observationFingerprint("website", { title: "Atlas", body: "v2" });
  assert.equal(first, same);
  assert.notEqual(first, changed);
});

test("public GitHub observer reads bounded repository and release metadata", async () => {
  const fetcher = async (url) => {
    if (String(url).endsWith("/releases/latest")) return Response.json({ tag_name: "v2.0.0", name: "Atlas V2", published_at: "2026-07-15T00:00:00Z", html_url: "https://github.com/ancientboy/atlas/releases/tag/v2.0.0" });
    return Response.json({ full_name: "ancientboy/atlas", html_url: "https://github.com/ancientboy/atlas", description: "AI Founder Operator", stargazers_count: 42, forks_count: 7, open_issues_count: 3, pushed_at: "2026-07-15T01:00:00Z", updated_at: "2026-07-15T01:00:00Z", default_branch: "main" });
  };
  const snapshot = await readGithubRepository("https://github.com/ancientboy/atlas", fetcher);
  assert.equal(snapshot.fullName, "ancientboy/atlas");
  assert.equal(snapshot.stars, 42);
  assert.equal(snapshot.latestRelease?.tag, "v2.0.0");
});

test("GitHub change analysis emits only evidence-backed deltas", () => {
  const changes = describeGithubChange(
    { stars: 10, forks: 2, pushedAt: "old", releaseTag: "v1" },
    { stars: 14, forks: 3, pushedAt: "new", releaseTag: "v2" },
  );
  assert.deepEqual(changes, ["+4 stars", "+1 forks", "new release v2", "new repository activity"]);
  assert.deepEqual(describeGithubChange({ stars: 1 }, { stars: 1 }), []);
});
