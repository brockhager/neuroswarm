// test-confidence.js
import fetch from "node-fetch";

async function runTest() {
    const response = await fetch("http://localhost:3009/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Price of BTC" })
    });

    const data = await response.json();
    console.log("Full JSON Response:\n", JSON.stringify(data, null, 2));
}

runTest().catch(err => console.error("Error:", err));
