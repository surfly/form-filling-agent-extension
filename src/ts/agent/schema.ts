import { z } from "zod";


const SuggestedActuationSchema = z.object({
    thought: z.string(),
    action: z.string(),

    data: z.any().optional()
});

const ResponseSchema = z.object({
    suggestions: z.array(
        z.object({
        ...SuggestedActuationSchema.shape
        })
    ),
    solvesTask: z.boolean()
});


export const GUISuggestedActuationSchema = z.object({
    ...SuggestedActuationSchema.shape,

    x: z.number(),
    y: z.number()
});

export type TGUISuggestedActuationSchema = z.infer<typeof GUISuggestedActuationSchema>;

export const GUIResponseSchema = z.object({
    ... ResponseSchema.shape,

    suggestions: z.array(GUISuggestedActuationSchema)
});

export type TGUIResponseSchema = z.infer<typeof GUIResponseSchema>;

export const DOMSuggestedActuationSchema = z.object({
    ...SuggestedActuationSchema.shape,

    cssSelector: z.string()
});

export type TDOMSuggestedActuationSchema = z.infer<typeof DOMSuggestedActuationSchema>;

export const DOMResponseSchema = z.object({
    ... ResponseSchema.shape,

    suggestions: z.array(DOMSuggestedActuationSchema)
});

export type TResponseSchema = z.infer<typeof ResponseSchema>;

export type TDOMResponseSchema = z.infer<typeof DOMResponseSchema>;