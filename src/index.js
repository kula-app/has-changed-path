const core = require("@actions/core");
const github = require("@actions/github");

const hasChanged = require("./hasChanged");

async function run() {
  try {
    const paths = core.getInput("paths", { required: true });
    core.info("Checking the following paths for changes:");
    for (const path of paths.split(" ")) {
      core.info("  " + path);
    }

    const onlyDetectChangesInWorktree = core.getBooleanInput("only_worktree", {
      required: false,
    });
    console.log(
      `Only detect changes in worktree? ${onlyDetectChangesInWorktree}`
    );
    const isPullRequest = github.context.eventName === "pull_request";
    console.log(`Triggered by pull request? ${isPullRequest}`);

    const shouldIgnorePullRequest = core.getBooleanInput("ignore_pull_request");
    console.log(
      `Should ignore pull request and only check files in current branch? ${shouldIgnorePullRequest}`
    );

    let targetBranch;
    if (isPullRequest && !shouldIgnorePullRequest) {
      targetBranch = github.context.payload.pull_request.base.ref;
      core.info(`Comparing to pull request target branch: ${targetBranch}`);
    }

    const changed = await hasChanged({
      paths: paths,
      targetBranch: targetBranch,
      detectChangesInWorktree: onlyDetectChangesInWorktree,
    });

    if (changed) {
      core.info(`Code in the following paths changed: ${paths}`);
    } else {
      core.info(`Code in the following paths hasn't changed: ${paths}`);
    }

    core.setOutput("changed", changed);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
