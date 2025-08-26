window.addEventListener("focus", () => {
    browser.runtime
        .sendMessage({
            target: "popup",
            cmd: "state",
            data: {
                state: "passive"
            }
        });
});


document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#url")
        ?.addEventListener("input", e => {
            e.target
                .classList
                .remove("invalid");
        });
});


let requestTimeout;

browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "newtab") return;
        if(message.cmd !== "error") return;

        clearTimeout(requestTimeout);
    });

window.browse = function() {
    clearTimeout(requestTimeout);

    let abort = false;

    const taskEl = document.querySelector("#task");
    const urlEl = document.querySelector("#url");

    const task = taskEl.value;
    const url = urlEl.value.trim();

    if(!task.length) {
        taskEl.invalidate();

        abort = true;
    }
    if(
        url.length
        && !/^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(url)
    ) {
        urlEl
            .classList
            .add("invalid");

        abort = true;
    }

    if(abort) return;

    document.body
        .classList
        .add("active");

    browser.runtime
        .sendMessage({
            target: "background",
            cmd: "init",
            data: {
                task,
                url
            }
        });

    requestTimeout = setTimeout(() => {
        alert("Request timed out.");

        document.body
            .classList
            .remove("active");
    }, 30000);
};

window.example = function(task, seedURL = "") {
    document.querySelector("#task")
        .value = task;
    document.querySelector("#url")
        .value = seedURL;
};