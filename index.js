import { runDevTask } from "./dev/index.mjs";
import { runPMTask } from "./pm/index.mjs";
import { runQATask } from "./qa/index.mjs";
import { DevEnvironment } from "./environment.mjs";
import path from "path";
import { reviewQABugReport } from "./teamlead/index.mjs";

// const localEnv = new DevEnvironment(path.join(process.cwd(), 'sample'));

// await localEnv.WriteToFile({
//   filePath: 'constants.js',
//   content: 'module.exports = {\n\tdefault: {\n\t\tPORT: 3000\n\t}\n};',
//   summary: "Adding the missing 'PORT' property in 'constants.js' to resolve the bug"
// });

// const ans = await localEnv.OpenURLInBrowserAndAskQuestion({"url": "https://github.com/actions/github-script", "question": "How to retry?"})
// console.log("ANSWER", ans);

// process.exit(0);

// await localEnv.OpenURLInBrowserAndAskQuestion({url: "https://nextjs.org/docs/pages/building-your-application/routing/custom-error", question: "How do I reuse the built-in error page?"})

// localEnv.destroy();
const overallTaskContext = `
Context:
NEW MESSAGES:
User: I want a github action here that runs the index.js on every new issue or issue comment.
Also log the issue and all its comments to the console in index.js

Use npm package @actions/github to get the issue and its comments from the current action's context.


`;

// const overallTaskContext = `
// Context:
// NEW MESSAGES:
// User: Write a README that explains what this project does.

// `;

// const overallTaskContext = `Create a basic http server that listens on port 3333`
const taskList = await runPMTask(overallTaskContext);

let taskListSummaries = [];
for (const task of taskList) {
    const resultSummary = await runDevTask(task, overallTaskContext + "\n\nWork done so far:\n"  + taskListSummaries.map(s=> `Dev: ${s}`).join("\n\n"));
    taskListSummaries.push(resultSummary);
}


let bugList = [];
do{
  bugList = [];
  // const bugs = ["There is no code implementation found for an API endpoint for user login using Firebase Authentication."]
  let summary = "";
  let bugs = [];
  let runnable = "";

  try{
    const resp = await runQATask(overallTaskContext);
    summary = resp.summary;
    bugs = resp.bugs;
    runnable = resp.runnable;
  }
  catch(e){
    console.log("QA TASK ERROR", e);
    continue;
  }
  // console.log("QA Summary", summary, "runnable?", runnable)
  for (const bug of bugs){
    try{
      const leadInstruction = await reviewQABugReport(bug, overallTaskContext);
      bugList.push({bug, leadInstruction});
    }
    catch(e){
      console.log("BUG REJECTED", e);
    }
  }

  for (const bug of bugList){
    const rep = `Bug Report:\n${bug.bug} \n\nTeam Lead Instructions:\n${bug.leadInstruction}`;
    await runDevTask(rep, overallTaskContext + "\n\n" + rep);
  }
}
while(bugList.length > 0);
