import { TResponseSchema } from "./schema.ts";
import { TAdapter } from "./Adapter";
import { TSnapshot } from "./Snapshot.ts";
import { readEnv, log } from "../util.ts";

import _config from "../config.json";

import INSTRUCTIONS from "./instructions/iterate.md.txt";
import INSTRUCTIONS_GUI from "./instructions/iterate.gui.md.txt";
import INSTRUCTIONS_DOM from "./instructions/iterate.dom.md.txt";
import INSTRUCTIONS_SUGGEST_URL from "./instructions/suggest_url.md.txt";


export class Agent {
    private static relocateTimeout = 7000;

    private readonly apiAdapter: TAdapter;
    private readonly maxIterations: number;

    private currentIteration: number = 0;
    private consumableRelocateListeners: (() => void)[] = [];

    constructor(apiAdapter: TAdapter, maxIterations?: number) {
        this.apiAdapter = apiAdapter;
        this.maxIterations = maxIterations || (readEnv("MAX_ITERATIONS").number || 5);

        (browser.webfuseSession ?? browser.__virtualSession).onMessage
            .addListener(messageData => {
                if(messageData.event_type !== "relocated") return;

                while(this.consumableRelocateListeners.length) {
                    this.consumableRelocateListeners
                        .shift()!
                        .call(null);
                }
            });
    }

    private addConsumbaleRelocateListener(cb) {
        this.consumableRelocateListeners.push(cb);
    }

    private terminate() {
        log(`Agent terminated (after ${this.currentIteration} iterations).`);

        this.currentIteration = Infinity;
    }

    private async suggestUrl(task: string): Promise<string> {
        const suggestedURL: string | null = await this.apiAdapter.request(
            INSTRUCTIONS_SUGGEST_URL
            ,
            `**TASK:** ${task}`
        );

        log(suggestedURL, "Suggested seed URL");

        if(!suggestedURL) return _config.defaultStartUrl;

        let parsedURL = suggestedURL
            .match(
                /(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
            );

        if(!parsedURL) return _config.defaultStartUrl;

        /* const preflightRes = await fetch(parsedURL[0]);
        if(preflightRes.status.toString().charAt(0) !== "2")
            return _config.defaultStartUrl; */

        return parsedURL[0];
    }

    private async suggestActuation(snapshot: TSnapshot, task: string): Promise<TResponseSchema | null> {
        log("Retrieving actuation suggestions...");

        const actuation: TResponseSchema | null = await this.apiAdapter
            .request<TResponseSchema>(
                [
                    INSTRUCTIONS,
                    (
                    !readEnv("DOM_SNAPSHOTS").boolean
                        ? INSTRUCTIONS_GUI
                        : INSTRUCTIONS_DOM
                    )
                ],
                `**TASK:** ${task}`,
                snapshot
            );

        if(!actuation) return null;

        log(actuation, "Actuation suggestions");

        return actuation;
    }

    public async init(task: string, seedURL?: string): Promise<void> {
        log("Agent initialized.");

        if(!seedURL) {
            log("Retrieving seed URL...");

            seedURL = await this.suggestUrl(task);
        }

        // Start at higher level page to mimic human usage
        const dynamicSeedURL = new URL(seedURL);
        // Do not start at precise locations
        dynamicSeedURL.search = "";
        dynamicSeedURL.hash = "";
        dynamicSeedURL.pathname = dynamicSeedURL.pathname.split("/").slice(0, 2).join("/");

        log(dynamicSeedURL.toString(), "Seed URL");
        await new Promise(resolve => {
            this.addConsumbaleRelocateListener(resolve);

            browser.webfuseSession
                .relocate(dynamicSeedURL.toString());

            setTimeout(() => resolve(null), Agent.relocateTimeout);
        });

        log("Relocated to seed URL.")
    }

    public async iterate(task: string, snapshot: TSnapshot): Promise<TResponseSchema | null> {
        if(this.currentIteration >= this.maxIterations) return null;    // null := no more actions

        this.currentIteration++;

        log(`New agent iteration (${this.currentIteration})...`);

        try {
            return this.suggestActuation(snapshot, task);
        } catch(err) {
            this.terminate();

            log("Terminated agent due to intermediate error.");

            throw err;
        }
    }

    public resetIterations() {
        log("Agent iterations reset.");

        this.currentIteration = 0;
    }
}
