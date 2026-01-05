import { execSync } from "child_process";

// Normalize and filter branches list from git output
export function parseBranchList(raw: string): string[] {
  return raw
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

// Fetch local and remote branches sorted by committer date (most recent first)
export function getBranches(workspacePath: string): string[] {
  const branchesRaw = execSync(
    'git for-each-ref --sort=-committerdate --format="%(refname:short)" refs/heads/ refs/remotes/',
    { cwd: workspacePath }
  );
  return parseBranchList(branchesRaw.toString());
}

// For target branch selection, pin common default branches to the top
// Pinned order: master, production (including remote variants like origin/master)
export function sortTargetBranches(branches: string[]): string[] {
  const pinnedPriority = ["master", "production"];

  const variants = (name: string) => [name, `origin/${name}`];
  const included: string[] = [];
  const includedSet = new Set<string>();

  for (const name of pinnedPriority) {
    for (const v of variants(name)) {
      if (branches.includes(v) && !includedSet.has(v)) {
        included.push(v);
        includedSet.add(v);
      }
    }
  }

  const remaining = branches.filter((b) => !includedSet.has(b));
  return [...included, ...remaining];
}
