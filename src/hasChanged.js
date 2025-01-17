const exec = require("@actions/exec");
const core = require("@actions/core");

async function main({ paths = "", targetBranch, detectChangesInWorktree }) {
  throwsForInvalidPaths(paths);

  return hasChanged(paths, targetBranch, detectChangesInWorktree);
}

function throwsForInvalidPaths(pathsToSearch) {
  if (pathsToSearch && typeof pathsToSearch === "string") return;
  throw new Error("pathsToSearch needs to be a string");
}

async function hasChanged(
  pathsToSearch,
  targetBranch,
  detectChangesInWorktree
) {
  const paths = pathsToSearch.split(" ");
  const cwd = process.env.GITHUB_WORKSPACE || ".";

  // Add the directory as a git safe directory
  await exec.getExecOutput(
    "git",
    [
      "config",
      "--global",
      "--add",
      "safe.directory",
      process.env.GITHUB_WORKSPACE,
    ],
    {
      ignoreReturnCode: true,
      silent: false,
      cwd: cwd,
    }
  );

  // Detect the target hash to compare to
  if (targetBranch) {
    core.info(`Comparing against destination branch: ${targetBranch}`);
    core.info(`Fetching remote branch`);
    await exec.exec(
      "git",
      [
        "fetch",
        "--jobs=10",
        "--no-tags",
        "--depth=1",
        "--no-recurse-submodules",
        "origin",
        `${targetBranch}:${targetBranch}`,
      ],
      {
        ignoreReturnCode: true,
        silent: false,
        cwd: cwd,
      }
    );
    core.info(`Comparing HEAD to branch ${targetBranch}`);
    const output = await exec.getExecOutput(
      "git",
      ["diff", "--quiet", "HEAD", targetBranch, "--", ...paths],
      {
        ignoreReturnCode: true,
        silent: false,
        cwd: cwd,
      }
    );
    // If there is output in the stderr, something went wrong
    if (output.stderr.length > 0) {
      throw new Error(`git diff had an failed. Output:\n${output.stderr}`);
    }
    return output.exitCode === 1;
  } else if (detectChangesInWorktree) {
    // Print information about current commit
    core.info(`Detecting changes in current worktree`);
    core.info(`Current working directory: ${cwd}`);
    // Detect changes in existing files
    core.info(`Detect changes in paths`);
    const output = await exec.getExecOutput(
      "git",
      ["status", "--porcelain", "--", ...paths],
      {
        ignoreReturnCode: true,
        silent: false,
        cwd: cwd,
      }
    );
    // If there is output in the stderr, something went wrong
    if (output.stderr.length > 0) {
      throw new Error(`git status had an failed. Output:\n${output.stderr}`);
    }
    return output.stdout.length > 0;
  } else {
    // Print information about current commit
    core.info(`Current working directory: ${cwd}`);
    const currentCommit = await exec.getExecOutput(
      "git",
      ["--no-pager", "log"],
      {
        ignoreReturnCode: true,
        silent: false,
        cwd: cwd,
      }
    );
    if (currentCommit.exitCode != 0) {
      core.info(
        `Failed to detect previous commit, exit code ${currentCommit.exitCode}`
      );
    }

    // Get hash of previous commit
    const previousCommitHash = await exec.getExecOutput(
      "git",
      ["log", "-1", "--format=%H", "HEAD~1"],
      {
        ignoreReturnCode: true,
        silent: true,
        cwd: cwd,
      }
    );

    if (previousCommitHash.exitCode != 0) {
      throw new Error(
        `Failed to detect previous commit, exit code ${previousCommitHash.exitCode}`
      );
    }
    core.info(
      `Comparing against previous commit:\n${previousCommitHash.stdout}`
    );
    const targetHash = previousCommitHash.stdout.trim();
    //  --quiet: exits with 1 if there were differences (https://git-scm.com/docs/git-diff)
    const output = await exec.getExecOutput(
      "git",
      ["diff", "--quiet", "HEAD", targetHash, "--", ...paths],
      {
        ignoreReturnCode: true,
        silent: false,
        cwd: cwd,
      }
    );
    // If there is output in the stderr, something went wrong
    if (output.stderr.length > 0) {
      throw new Error(`git diff had an failed. Output:\n${output.stderr}`);
    }
    return output.exitCode === 1;
  }
}

module.exports = main;
