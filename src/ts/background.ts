import { TResponseSchema } from "./agent/schema";
import { log, readEnv } from "./util";
import { Agent } from "./agent/Agent";
import { OpenAIAdapter } from "./agent/Adapter";


const AGENT = new Agent(
    new OpenAIAdapter(
        readEnv("MODEL_NAME").string || "gpt-4.1",
        readEnv("OPENAI_API_KEY").string
    )
);


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
}


let latestAnalysis: TResponseSchema | null = null;

browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "background") return;

        switch(message.cmd) {
            case "analysis-request": {
                try {
                    latestAnalysis = await AGENT.analyse(message.data.snapshot);
                } catch(err) {
                    propagateError(err);

                    return;
                } finally {
                    browser.tabs
                        .sendMessage(await getCurrentTab(), {
                            target: "content",
                            cmd: "analysis-provision"
                        });
                }

                break;
            }
            case "help-request": {
                console.log(latestAnalysis
                                ?.forms
                                .filter(formData => {
                                    return formData.fieldID.includes(message.data.fieldID)
                                        || formData.fieldID.includes(message.data.id)
            })[0]);
                browser.tabs
                    .sendMessage(await getCurrentTab(), {
                        target: "content",
                        cmd: "help-provision",
                        data: {
                            message: latestAnalysis
                                ?.forms
                                .filter(formData => {
                                    return formData.fieldID.includes(message.data.fieldID)
                                        || formData.fieldID.includes(message.data.id)
                        })[0]
                                    ?.about
                        }
                    });

                break;
            }
        }
    });