// WORKAROUND (TODO: Enhance Labs)

import { rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const UI_DIR_PATH = join(import.meta.dirname, "src", "ts", "ui");

rmSync(UI_DIR_PATH, {
    recursive: true,
    force: true
});
mkdirSync(UI_DIR_PATH);

render("content.html");
render("content.css");
render("content.js");

function render(fileName) {
    const contents = readFileSync(
        join(import.meta.dirname, "src", "content", fileName)
    ).toString();

    writeFileSync(
        join(UI_DIR_PATH, `${fileName}.txt`),
        contents
    );
}