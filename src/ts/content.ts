import { DOMSnapshot } from "./agent/Snapshot";
import { log } from "./util";

import CONTENT_CSS from "./ui/content.css.txt";
import CONTENT_HTML from "./ui/content.html.txt";
import CONTENT_JS from "./ui/content.js.txt";


const UI_ID = "__wf-ui";

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
})();


async function init() {
    const walker = document.createTreeWalker(
        document.body.querySelector("main") ?? document.body ?? document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: node => {
                return [
                    "form",
                    "input",
                    "label",
                    "select",
                    "summary",
                    "textarea"
                ]
                    .includes((node as HTMLElement).tagName.toLowerCase())
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
            },
        },
    );
    let latestID = 0;
    let element = walker.firstChild();
    while (element) {
        const fieldID = (latestID++).toString();
        const id = (element as HTMLElement)
            .getAttribute("id");

        (element as HTMLElement)
            .setAttribute("data-field-id", fieldID);

        element.addEventListener("focus", () => {
            console.debug("Interactive input focused");

            browser.runtime
                .sendMessage({
                    target: "background",
                    cmd: "help-request",
                    data: { fieldID, id }
                });
        });

        element = walker.nextNode();
    }

    const snapshot = await DOM_SNAPSHOT.make();

    browser.runtime
        .sendMessage({
            target: "background",
            cmd: "analysis-request",
            data: { snapshot }
        });
}

document.addEventListener("DOMContentLoaded", () => setTimeout(init, 3000));


function updateMessage(message) {
    const ui = document.querySelector(`#${UI_ID}`);
    if(!ui) return;

    ui.classList.remove("highlight");
    setTimeout(() => ui.classList.add("highlight"), 50);

    ui.querySelector("p.message")!
        .textContent = message;
}


browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "content") return;

        switch(message.cmd) {
            case "analysis-provision": {
                updateMessage(`
                    Hoi!
                    Ik ben een virtuele assistent die klaar staat om u op deze pagina te helpen.
                    Selecteer een formulierveld om mijn hulp te ontvangen.
                `);

                break;
            }
            case "help-provision": {
                updateMessage(
                    message.data?.message
                        || "Sorry, ik kan u hierbij niet helpen! Let op: dit is slechts een demoversie."
                );

                break;
            }
        }
    });