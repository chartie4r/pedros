import { Octokit } from "octokit";

const token = process.env.GITHUB_TOKEN;
let octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  if (!octokit) octokit = new Octokit({ auth: token });
  return octokit;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

export function parseRepo(repoUrlOrSlug: string): RepoRef {
  const slug = process.env.GITHUB_REPO ?? repoUrlOrSlug;
  const match = slug.match(/^(?:https?:\/\/github\.com\/)?([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Invalid repo: ${slug}`);
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export interface FileChange {
  path: string;
  content: string;
  mode?: "100644" | "100755" | "040000" | "160000";
}

/**
 * Create a branch from default, apply file changes, push, and open a PR.
 */
export async function createBranchWithChangesAndPr(
  repoRef: RepoRef,
  baseBranch: string,
  branchName: string,
  title: string,
  body: string,
  changes: FileChange[]
): Promise<{ prUrl: string; branch: string }> {
  const gh = getOctokit();

  const { data: ref } = await gh.rest.git.getRef({
    ...repoRef,
    ref: `heads/${baseBranch}`,
  });
  const baseSha = ref.object.sha;

  await gh.rest.git.createRef({
    ...repoRef,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  for (const file of changes) {
    let currentSha: string | undefined;
    try {
      const { data } = await gh.rest.repos.getContent({
        ...repoRef,
        path: file.path,
        ref: branchName,
      });
      if (!Array.isArray(data) && "sha" in data) currentSha = data.sha;
    } catch {
      // file doesn't exist
    }

    await gh.rest.repos.createOrUpdateFileContents({
      ...repoRef,
      path: file.path,
      message: `Update ${file.path}`,
      content: Buffer.from(file.content, "utf8").toString("base64"),
      sha: currentSha,
      branch: branchName,
    });
  }

  const { data: pr } = await gh.rest.pulls.create({
    ...repoRef,
    title,
    body,
    head: branchName,
    base: baseBranch,
  });

  return { prUrl: pr.html_url ?? "", branch: branchName };
}
