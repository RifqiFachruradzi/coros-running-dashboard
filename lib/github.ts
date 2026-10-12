// Commits updated data files back to the dashboard's own GitHub repo so the
// JSON in /data stays the single source of truth and version history.
//
// IMPORTANT: this uses a GitHub Personal Access Token stored as a Vercel env
// var (GITHUB_TOKEN) — this is a *separate* credential from "Claude connected
// to GitHub" in the chat UI. That connector lets Claude push code from this
// session; it has no bearing on what the deployed app can do at runtime. The
// deployed cron job needs its own token because it runs independently, long
// after this conversation ends.
//
// Recommended: a fine-grained PAT scoped to just this repo, "Contents:
// Read and write" permission only.

import { Octokit } from "@octokit/rest";

const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;
const branch = process.env.GITHUB_BRANCH || "main";

function client() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN env var is not set on the Vercel project.");
  }
  return new Octokit({ auth: token });
}

export interface FileToCommit {
  path: string; // e.g. "data/runs.json"
  content: string; // raw file content (will be base64-encoded)
}

/**
 * Creates or updates one or more files in a single commit-per-file (the
 * GitHub Contents API doesn't support multi-file atomic commits without the
 * lower-level Git Data API — fine for our low-frequency data updates).
 * Returns false (no-op) if none of the files actually changed content.
 */
export async function commitDataFiles(
  files: FileToCommit[],
  message: string
): Promise<boolean> {
  const octokit = client();
  let committedAny = false;

  for (const file of files) {
    const encoded = Buffer.from(file.content, "utf-8").toString("base64");

    let existingSha: string | undefined;
    let existingContent: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: branch,
      });
      if (!Array.isArray(data) && data.type === "file") {
        existingSha = data.sha;
        existingContent = data.content?.replace(/\n/g, "");
      }
    } catch (err: any) {
      if (err.status !== 404) throw err;
      // File doesn't exist yet — will be created.
    }

    if (existingContent === encoded) {
      continue; // no change, skip the commit entirely
    }

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message,
        content: encoded,
        sha: existingSha,
        branch,
      });
    } catch (err: any) {
      // GitHub answers 404 (not 403) when the token can't see a private repo.
      throw new Error(
        `Commit ${file.path} ke ${owner}/${repo}@${branch} gagal (${err.status}): ${err.message}. ` +
          "Cek GITHUB_OWNER/GITHUB_REPO/GITHUB_BRANCH dan akses GITHUB_TOKEN ke repo ini (Contents: Read and write)."
      );
    }
    committedAny = true;
  }

  return committedAny;
}

/** For /api/health: can the token see the repo and branch, and may it push? */
export async function checkGitHubAccess(): Promise<{
  target: string;
  ok: boolean;
  canPush?: boolean;
  error?: string;
}> {
  const target = `${owner}/${repo}@${branch}`;
  try {
    const octokit = client();
    const { data } = await octokit.repos.get({ owner, repo });
    await octokit.repos.getBranch({ owner, repo, branch });
    return { target, ok: true, canPush: data.permissions?.push };
  } catch (err: any) {
    return {
      target,
      ok: false,
      error:
        err.status === 404
          ? "Repo atau branch tidak ditemukan — nama salah, atau GITHUB_TOKEN tidak punya akses ke repo ini."
          : err.status === 401
          ? "GITHUB_TOKEN tidak valid atau sudah kedaluwarsa."
          : err.message,
    };
  }
}
