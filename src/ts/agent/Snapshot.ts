import "./D2Snap.browser";

import { log, readEnv } from "../util";


export type TSnapshot = {
    serialization: string;
};

export class DOMSnapshot {
    private readonly maxTokens: number;

    constructor(maxTokens: number = 2**16) {
        this.maxTokens = maxTokens;
    }

    protected async create() {
        const serialization = (await window.D2Snap
            .d2Snap(
                document.documentElement,
                1,
                0,
                0,
                {
                    debug: readEnv("DEBUG_LOGS").boolean
                }
            ))
                .serializedHtml
                //.slice(0, this.maxTokens * 4);

        return {
            serialization 
        };
    }

    public async make(): Promise<TSnapshot> {
        log("Creating snapshot (serialising application state)...");

        const snapshot = await this.create();

        log(snapshot, "Snapshot completed");

        return snapshot;
    }
}