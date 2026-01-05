import * as https from "node:https";

export type AzureDevopsPrRef = {
  organization: string;
  project: string;
  repository: string;
  pullRequestId: number;
  baseUrl: string;
  prUrl: string;
};

export type AzureDevopsPullRequest = {
  pullRequestId: number;
  title?: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseAzureDevopsPrUrl(raw: string): AzureDevopsPrRef {
  const url = new URL(raw);

  // Supported format:
  // https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}
  if (url.hostname !== "dev.azure.com") {
    throw new Error('Only "dev.azure.com" PR URLs are supported right now.');
  }

  const parts = url.pathname.split("/").filter(Boolean);
  // [org, project, "_git", repo, "pullrequest", id]
  if (parts.length < 6) {
    throw new Error("Unrecognized Azure DevOps PR URL path.");
  }

  const [organization, project, gitMarker, repository, prMarker, prIdRaw] = parts;
  if (!isNonEmptyString(organization) || !isNonEmptyString(project) || !isNonEmptyString(repository)) {
    throw new Error("Unrecognized Azure DevOps PR URL path.");
  }
  if (gitMarker !== "_git" || prMarker !== "pullrequest") {
    throw new Error("Unrecognized Azure DevOps PR URL path.");
  }
  const pullRequestId = Number(prIdRaw);
  if (!Number.isFinite(pullRequestId) || pullRequestId <= 0) {
    throw new Error("Invalid pull request id in URL.");
  }

  const baseUrl = `https://dev.azure.com/${organization}`;

  return {
    organization,
    project,
    repository,
    pullRequestId,
    baseUrl,
    prUrl: url.toString(),
  };
}

export function getAzureDevopsPat(
  configuredEnvVarName: string | undefined
): { pat: string; sourceEnvVar: string } {
  const preferred = isNonEmptyString(configuredEnvVarName)
    ? configuredEnvVarName.trim()
    : undefined;

  const candidates = [
    preferred,
    "AZURE_DEVOPS_EXT_PAT",
    "AZURE_DEVOPS_PAT",
    "AZDO_PAT",
    "ADO_PAT",
  ].filter((x): x is string => isNonEmptyString(x));

  for (const name of candidates) {
    const value = process.env[name];
    if (isNonEmptyString(value)) {
      return { pat: value, sourceEnvVar: name };
    }
  }

  const hint = preferred ? `Set env var ${preferred}.` : "Set env var AZURE_DEVOPS_EXT_PAT.";
  throw new Error(
    `Azure DevOps PAT not found in environment. ${hint} (You may need to restart VS Code after setting it.)`
  );
}

function basicAuthHeaderFromPat(pat: string): string {
  // Azure DevOps uses Basic auth where PAT is the "password" portion.
  // username can be empty. value is base64(":PAT")
  const token = Buffer.from(`:${pat}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function adoGetJson<T>(url: string, pat: string): Promise<T> {
  const parsed = new URL(url);

  return await new Promise<T>((resolve, reject) => {
    const req = https.request(
      {
        method: "GET",
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          Accept: "application/json",
          Authorization: basicAuthHeaderFromPat(pat),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`Azure DevOps API error (${status}): ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("Azure DevOps API returned non-JSON response."));
          }
        });
      }
    );

    req.on("error", (e) => reject(e));
    req.end();
  });
}

export async function fetchAzureDevopsPullRequest(
  pr: AzureDevopsPrRef,
  pat: string
): Promise<AzureDevopsPullRequest> {
  const apiVersion = "7.1-preview.1";
  const url =
    `${pr.baseUrl}/${pr.project}/_apis/git/repositories/${encodeURIComponent(pr.repository)}` +
    `/pullrequests/${pr.pullRequestId}?api-version=${encodeURIComponent(apiVersion)}`;

  const data = await adoGetJson<AzureDevopsPullRequest>(url, pat);
  if (!isNonEmptyString(data.sourceRefName) || !isNonEmptyString(data.targetRefName)) {
    throw new Error("Azure DevOps API response missing source/target ref names.");
  }
  return data;
}

export function refNameToRemoteBranch(refName: string, remoteName: string): string {
  // Expecting refs/heads/foo
  const prefix = "refs/heads/";
  if (refName.startsWith(prefix)) {
    return `${remoteName}/${refName.slice(prefix.length)}`;
  }
  // Fallback: allow already-short names
  return `${remoteName}/${refName}`;
}


