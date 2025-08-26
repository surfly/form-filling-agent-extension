import { z } from "zod";


const FormfieldSchema = z.object({
    about: z.string(),
    fieldID: z.string()
});

export const ResponseSchema = z.object({
    about: z.string(),
    forms: z.array(
        z.object({
        ...FormfieldSchema.shape
        })
    )
});

export type TResponseSchema = z.infer<typeof ResponseSchema>;