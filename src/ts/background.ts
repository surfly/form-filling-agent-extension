import { TResponseSchema } from "./agent/schema";
import { log, readEnv } from "./util";
import { Agent } from "./agent/Agent";
import { OpenAIAdapter } from "./agent/Adapter";


log(readEnv("DOM_SNAPSHOTS").boolean, "Use DOM snapshots");


const AGENT = new Agent(
    new OpenAIAdapter(
        readEnv("MODEL_NAME").string || "gpt-4.1",
        readEnv("OPENAI_API_KEY").string
    )
);

let currentTask: string|null = null;
let taskSolved: boolean = false;


async function getCurrentTab(): Promise<number> {
    try {
        const [ tab ] = await browser.tabs.query({
            active: true,
            lastFocusedWindow: true
        });
        return tab.index ?? 0;
    } catch {
        return 0;
    }
};

function propagateError(err: Error) {
    console.error(err);

    browser.runtime
        .sendMessage({
            target: "newtab",
            cmd: "error",
            data: {
                message: (err?.message ?? err.toString())
            }
        });
}

async function requestSnapshot() {
    browser.tabs
        .sendMessage(await getCurrentTab(), {
            target: "content",
            cmd: "snapshot"
        });
}


browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "background") return;

        switch(message.cmd) {
            case "init": {
                const seedUrl: string|undefined = message.data.url
                    ? (!/^https?:\/\//.test(message.data.url) ? `https://${message.data.url}` : message.data.url)
                    : undefined

                currentTask = message.data.task;

                browser.runtime
                    .sendMessage({
                        target: "popup",
                        cmd: "state",
                        data: {
                            state: "active"
                        }
                    });

                try {
                    await AGENT.init(message.data.task, seedUrl);
                } catch(err) {
                    propagateError(err);

                    break;
                }

                requestSnapshot();

                break;
            }
            case "iterate": {
                let suggestedActuation: TResponseSchema | null;
                try {
                    suggestedActuation = await AGENT.iterate(currentTask!, message.data.snapshot);
                } catch(err) {
                    propagateError(err);

                    return;
                }

                taskSolved = !!suggestedActuation?.solvesTask;
                log(taskSolved, "Task solved");

                browser.tabs
                    .sendMessage(await getCurrentTab(), {
                        target: "content",
                        cmd: "act",
                        data: {
                            suggestedActuation
                        }
                    });

                break;
            }
            case "restart": {
                AGENT.resetIterations();

                taskSolved = false;

                requestSnapshot();

                break;
            }
        }
    });