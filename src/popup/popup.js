browser.runtime.onMessage
    .addListener(async message => {
        if(message.target !== "popup") return;
        if(message.cmd !== "state") return;

        document.querySelector("section.show")
            ?.classList
            .remove("show");
        document.querySelector(`section.${message.data.state}`)
            .classList
            .add("show");
    });