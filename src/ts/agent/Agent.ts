import { TResponseSchema } from "./schema.ts";
import { OpenAIAdapter } from "./Adapter";
import { TSnapshot } from "./Snapshot.ts";
import { log } from "../util.ts";


import INSTRUCTIONS from "./system_prompt.md.txt";


export class Agent {
    private readonly apiAdapter: OpenAIAdapter;

    constructor(apiAdapter: OpenAIAdapter) {
        this.apiAdapter = apiAdapter;
    }

    public async analyse(snapshot: TSnapshot): Promise<TResponseSchema | null> {
        log("Retrieving page analysis...");

        const analysis: TResponseSchema | null = await this.apiAdapter
            .request<TResponseSchema>(
                INSTRUCTIONS,
                snapshot
            );

        if(!analysis) return null;

        log(analysis, "Analysis");

        return analysis;
    }
}
