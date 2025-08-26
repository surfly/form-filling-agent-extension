import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodType } from "zod";

import { log } from "../util";
import { TResponseSchema } from "./schema";
import { TSnapshot } from "./Snapshot";


export class OpenAIAdapter {
    private readonly model;
    private readonly endpoint;

    constructor(model, key) {
        this.model = model;
        this.endpoint = new OpenAI({
            apiKey: key
        });
    }

    private async createFile(bitmap: ImageBitmap) {
        const result = await this.endpoint.files
            .create({
                file: bitmap,
                purpose: "vision",
            });

        return result.id;
    }

    public async request<T>(
        instructions: string | string[],
        inputSnapshot: TSnapshot,
        responseSchema?: TResponseSchema
    ) {
        instructions = [ instructions ].flat();

        log("Requesting LLM...");

        const reqOptions = {
            model: this.model,
            input: [
                {
                    role: "developer",
                    content: [
                        ...instructions.map(instruction => {
                            return { type: "input_text", text: instruction };
                        })
                    ]
                },
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: (inputSnapshot as unknown as TSnapshot).serialization }
                    ]
                }
            ],
            ...responseSchema
                ? {
                    text: {
                        format: zodTextFormat(
                            responseSchema as unknown as ZodType,
                            "analysis"
                        )
                    }
                }
                : {},
            store: false
        };
        log(reqOptions, "LLM request");

        const res = await this.endpoint.responses
            .create(reqOptions);

        if(res.error) throw res.error;

        log(res, "LLM response");

        const resText = res
            .output[0]
            ?.content[0]
            ?.text;

        log("LLM request completed.");

        try {
            return JSON.parse(
                resText
                    .replace(/^```json/, "")
                    .replace(/```$/, "")
                    .trim()
            ) as T;
        } catch {
            return resText;
        }
    }
}