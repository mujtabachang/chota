import 'dotenv/config'
import { openai } from '../../common/openai.mjs';
import fn from "./fns.mjs";

const functions = fn;
const MODEL = "gpt-4-0613" //"gpt-3.5-turbo";
// const MODEL = "gpt-3.5-turbo";

export async function reviewTerminalCommand(originalTask, command, overallTask) {
    console.log("✋ $", command)
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing commands being executed by your team in your project directory. Does the following change make sense, given the Reason at bottom and overall goal of the project?

        Make sure the command does only what's written as reason. If you think the change breaks something or damages the system, reject the change with reason.
        
        Call the SubmitReview function with your decision and reason.

        The reason should propose the solution if you are rejecting the change. If you are approving the change, the reason can be short.
        `},
        { "role": "user", "content": `Overall Project Context And Larger Goal:\n${overallTask}\n\nCurrent Task:\n${originalTask}\nCommand being sent to shell terminal:\n${command}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewChange(change, overallTask) {
    console.log("✋", change.changeType, change.reason);
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing changes by your team to your project. Does the following change make sense, given the Reason at bottom and overall goal of the project?

        Make sure the change does only what's written as reason. If you think the change breaks something, reject the change with reason.

        Do note that the reason may be a step in a larger goal. If you think the change is not a step in the larger goal, reject the change with reason.
        
        Call the SubmitReview function with your decision and reason.

        The reason should propose the solution if you are rejecting the change. If you are approving the change, the reason can be short.
        `},
        { "role": "user", "content": `Overall Project Context And Larger Goal:\n${overallTask}\n\nChangeType:\n${change.changeType}\nReason:\n${change.reason} \n Old State:\n${change.old}\nNew State:\n${change.new}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewSummaryLite(originalTask, summary) {
    console.log("✋", "reviewSummary(", summary, ")");
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing job completion by your team to your project. After the job is done, the following is the final summary message by the developer. Does the following message make sense, given the Reason at bottom and overall goal of the project?
        
            Sometimes the task is a no-op and nothing needs to be done. If you think the task is a no-op, approve the summary so the developer can move on to the next task.
        Call the SubmitReview function with your decision and reason.

        Do note that even if developer explains the solution in the summary, you should still reject the summary if you think the developer has not yet completed the task.

        The reason should propose the solution if you are rejecting the summary of job. If you are approving, the reason can be short.
        `},
        { "role": "user", "content": `Task:\n${originalTask}\nTask Done Summary:\n${summary}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewSummary(originalTask, summary, overallTask) {
    console.log("✋", "reviewSummary(", summary, ")");
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for reviewing job completion by your team to your project. After the job is done, the following is the final summary message by the developer. Does the following message make sense, given the Reason at bottom and overall goal of the project?
        
            Sometimes the task is a no-op and nothing needs to be done. If you think the task is a no-op, approve the summary so the developer can move on to the next task.
        Call the SubmitReview function with your decision and reason.

        Do note that even if developer explains the solution in the summary, you should still reject the summary if you think the developer has not yet completed the task.

        The reason should propose the solution if you are rejecting the summary of job. If you are approving, the reason can be short.
        `},
        { "role": "user", "content": `Overall Project Context And Larger Goal:\n${overallTask}\n\nCurrent Task:\n${originalTask}\nTask Done Summary:\n${summary}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewQABugReport(bugReport, overallTask) {
    console.log("✋", "reviewQABugReport(", bugReport, ")");
    const messages = [
        {
            "role": "system", "content": `You are a team lead of a programming team responsible for responding to bug report by QA against your team's work. Does the following bug report make sense? If it does, approve the bug report so it is assigned to your team. If it doesn't, reject the bug report with reason.
        
        Call the SubmitReview function with your decision and reason.

        If Rejecting the bug: The reason should defend your decision to reject the bug report, if you are rejecting the summary of job. 
        If you are approving, the reason should include instructions and guidance for the developer to fix the bug.
        `},
        { "role": "user", "content": `Overall Project Context And Larger Goal:\n${overallTask}\n\n Bug Report:\n${bugReport}` },
    ];
    
    return askReviewer(messages);
}

export async function reviewAskQuestionFromUser(overallTaskContext, questionForUser) {
    console.log("✋", "reviewAskQuestionFromUser(", questionForUser, ")");
    const messages = [
        {
            "role": "system", "content": `You are the proxy between the user and the contractor who the user has hired to do a job task.
        
            Sometimes the contractor asks questions that they can infer from context or search from internet. If you think the question is specific to the task itself and can only be answered by the user. Only then approve the question.

            If you think the question can be answered by searching on internet, or can be assumed for now. Reject with the instruction on what contractor should do.

        Call the SubmitReview function with your decision and reason.

        The reason should propose the solution (like: search for this on internet, etc.) if you are rejecting the question. If you are approving, the reason can be short.
        `},
        { "role": "user", "content": `Overall Project Context And Larger Goal:\n${overallTaskContext}\n\nQuestion:\n${questionForUser}` },
    ];
    
    return askReviewer(messages);
}

function askReviewer(messages){
    return new Promise(async (resolve, reject) => {

        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: messages,
            functions: functions,
            function_call: { "name": "SubmitReview" },
        });
        const responseMessage = response.choices[0].message;
        // Step 2: check if GPT wanted to call a function

        console.log("LEAD: ", JSON.stringify(response), "\n");

        if (responseMessage.function_call) {
            // Step 3: call the function
            // Note: the JSON response may not always be valid; be sure to handle errors
            const availableFunctions = {
                SubmitReview: ({approved, reason}) => {
                    if (approved) {
                        resolve(reason);
                    }
                    else {
                        reject(new Error(reason));
                    }
                },

            };  // only one function in this example, but you can have multiple
            const functionName = responseMessage.function_call.name;
            const functionToCall = availableFunctions[functionName];
            if (!functionToCall) {
                throw new Error(`Function ${functionName} not found`);
            }
            try {
                const functionArgs = JSON.parse(responseMessage.function_call.arguments);
                functionToCall(
                    functionArgs
                );
            }
            catch (e) {
                reject(e.message)
            }
        }
    });
}