import { TDriver, GUIDriver, DOMDriver } from "./agent/Driver";
import { GUISnapshot, DOMSnapshot } from "./agent/Snapshot";
import { log, readEnv, wait } from "./util";

import CONTENT_CSS from "./ui/content.css.txt";
import CONTENT_HTML from "./ui/content.html.txt";
import CONTENT_JS from "./ui/content.js.txt";


const UI_ID = "__wf-ui";

const GUI_DRIVER: TDriver = new GUIDriver();
const DOM_DRIVER: TDriver = new DOMDriver();

const GUI_SNAPSHOT: GUISnapshot = new GUISnapshot();
const DOM_SNAPSHOT: DOMSnapshot = new DOMSnapshot();


// Inject content UI
(() => {
    log("Injecting component UI...");

    const createAugmentationElement = tagName => {
        const augmentationEl = document.createElement(tagName);

        augmentationEl.setAttribute("agent", "");

        return augmentationEl;
    };

    const augmentedCssEl = createAugmentationElement("STYLE");
    augmentedCssEl.innerHTML = CONTENT_CSS;
    document.head
        .appendChild(augmentedCssEl);

    const augmentedHtmlEl = createAugmentationElement("DIV");
    augmentedHtmlEl.setAttribute("id", UI_ID);
    augmentedHtmlEl.innerHTML = CONTENT_HTML;
    document.body
        .appendChild(augmentedHtmlEl);

    const augmentedJsEl = createAugmentationElement("SCRIPT");
    augmentedJsEl.innerHTML = CONTENT_JS;
    document.head
        .appendChild(augmentedJsEl);

    log("Component UI injection completed.");

    (localStorage.getItem("has_drive") === "1")
        && propagateSnapshot();
    localStorage.setItem("has_drive", "0");
})();


window.addEventListener("focus", () => {
    browser.runtime
        .sendMessage({
            target: "popup",
            cmd: "state",
            data: {
                state: "active"
            }
        });
});

window.addEventListener("blur", () => {
    browser.runtime
        .sendMessage({
            target: "popup",
            cmd: "state",
            data: {
                state: "passive"
            }
        });
});


async function propagateSnapshot() {
    const snapshot = await (
        !readEnv("DOM_SNAPSHOTS").boolean
            ? GUI_SNAPSHOT
            : DOM_SNAPSHOT
    ).make();

    browser.runtime
        .sendMessage({
            target: "background",
            cmd: "iterate",
            data: { snapshot }
        });
}


browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "content") return;

        switch(message.cmd) {
            case "snapshot": {
                document.querySelector(UI_ID)
                    ?.classList
                    .remove("hide");

                await propagateSnapshot();

                break;
            }
            case "act": {
                document.querySelector(UI_ID)
                    ?.classList
                    .add("hide");

                const suggestedActuation = message.data.suggestedActuation.suggestions;
                if(!suggestedActuation.length) {
                    // TODO: Notify UI (e.g. window.think()), terminate?
                    return;
                }

                localStorage.setItem("has_drive", "1");

                await (
                    !readEnv("DOM_SNAPSHOTS").boolean
                        ? GUI_DRIVER
                        : DOM_DRIVER
                    )
                        .run(suggestedActuation);

                await wait(3000);   // TODO: Relocated or wait

                await propagateSnapshot();

                break;
            }
        }
    });