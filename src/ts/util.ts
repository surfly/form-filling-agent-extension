export function readEnv(name: string): {
    string: string;
    number: number;
    boolean: boolean;
} {
    const value: string = (browser.webfuseSession ?? browser.__virtualSession).env[name.toUpperCase()];

    return {
        string: value,
        number: parseFloat(value),
        boolean: value === "true"
    };
}

export function log(message: string | unknown, title?: string) {
    if(!readEnv("DEBUG_LOGS").boolean) return;

    title
        && console.debug(title.replace(/:?$/, ":"));
    console.debug(message);
}

export function wait(ms: number = 500): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}