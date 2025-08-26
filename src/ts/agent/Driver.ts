import { TGUIResponseSchema, TDOMResponseSchema, TDOMSuggestedActuationSchema } from "./schema";
import { log, wait } from "../util";


const HIGHLIGHT_CLASS_NAME = "__wf-highlight";


abstract class Driver<T extends unknown[] = unknown[]> {
    protected abstract drive(suggestedActuation: T): Promise<void>;

    public async run(suggestedActuation: T): Promise<void> {
        log("Driving suggested actuation...");

        await this.drive(suggestedActuation);

        log("Suggested actuation drive completed.");
    }
}

export type TDriver = Driver;

export class GUIDriver extends Driver<TGUIResponseSchema["suggestions"]> {
    protected async drive(suggestedActuation: TGUIResponseSchema["suggestions"]): Promise<void> {
        for(const suggestion of suggestedActuation) {
            try {
                await (browser.webfuseSession ?? browser.__virtualSession)
                    .automation[suggestion.action]
                    .call(null, suggestion.x, suggestion.y, suggestion.data);
            } catch(err) {
                console.error(err);
            }
        }
    }
}

export class DOMDriver extends Driver<TDOMResponseSchema["suggestions"]> {
    private async performCompundAction(suggestion: TDOMSuggestedActuationSchema) {
        const el: HTMLElement|null = document.querySelector(suggestion.cssSelector);

        if(!el) {
            console.error(`Suggested actuation target element does not exist: '${suggestion.cssSelector}'`);

            return;
        }
        log(el, "Actuation target element");

        const elPos = el.getBoundingClientRect();

        el.scrollIntoView({
            behavior: "smooth",
            block: (elPos.height > window.innerHeight) ? "start" : "center",
            inline: "center"
        });

        try {
            /* await (browser.webfuseSession ?? browser.__virtualSession)
                .automation
                .mouse_move([
                    elPos.left + (elPos.width / 2),
                    elPos.top + (elPos.height / 2)
                ]); */
        } catch(err) {
            console.error(err);
        }

        switch(suggestion.action) {
            case "highlight":
                document.querySelector(`.${HIGHLIGHT_CLASS_NAME}`)
                    ?.classList
                    .remove(HIGHLIGHT_CLASS_NAME);

                el.classList.add(HIGHLIGHT_CLASS_NAME);

                break;
            case "left_click":
                el.click();

                break;
            case "type":
                try { (el as HTMLInputElement).value = ""; } catch {}

                const text = suggestion?.data as string;

                await (browser.webfuseSession ?? browser.__virtualSession)
                    .automation
                    .type(text, suggestion.cssSelector);

                break;
            default:
                console.error(`Unknwon action '${suggestion.action}'`);

                return;
        }

        await wait(2000);
    }

    protected async drive(suggestedActuation: TDOMResponseSchema["suggestions"]): Promise<void> {
        for(const suggestion of suggestedActuation) {
            try {
                log(suggestion);
                
                await this.performCompundAction(suggestion as TDOMSuggestedActuationSchema);
            } catch(err) {
                console.error(err);
            }
        }
    }
}