import "./D2Snap.browser";

import { log } from "../util";


abstract class Snapshot<T> {
    protected abstract create(): Promise<T>;

    public async make(): Promise<T> {
        log("Creating snapshot (serialising application state)...");

        const snapshot: T = await this.create();

        log(snapshot, "Snapshot completed");

        return snapshot;
    }
}

export type TSnapshot = Snapshot<unknown>;

export type TSnapshotGUI = {
    bitmap: ImageBitmap;
    base64: string;
};

export class GUISnapshot extends Snapshot<TSnapshotGUI> {
    protected async create() {
        const canvasEl: HTMLCanvasElement = document.createElement("canvas");
        const bitmap: ImageBitmap = await (browser.webfuseSession ?? browser.__virtualSession)
            .takeScreenshot(false);

        canvasEl.width = bitmap.width;
        canvasEl.height = bitmap.height;

        canvasEl
            .getContext("2d")!
            .drawImage(bitmap, 0, 0);

        return {
            bitmap,
            base64: `data:image/jpeg;base64,${canvasEl.toDataURL("image/jpeg").split(";base64,")[1]}`
        };
    }
}


export type TSnapshotDOM = {
    serialization: string;
};

export class DOMSnapshot extends Snapshot<TSnapshotDOM> {
    private readonly maxTokens: number;

    constructor(maxTokens: number = 2**13) {
        super();

        this.maxTokens = maxTokens;
    }

    protected async create() {
        return {
            serialization: (
                await window.D2Snap
                    .takeAdaptiveSnapshot(
                        this.maxTokens,
                        undefined,
                        {
                            assignUniqueIDs: true
                        }
                    )
                )
                    .serializedHtml
        };
    }
}