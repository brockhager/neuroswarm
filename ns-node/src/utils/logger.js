export function logNs(...args) {
    const ts = new Date().toISOString();
    console.log(`[NS][${ts}]`, ...args);
}
