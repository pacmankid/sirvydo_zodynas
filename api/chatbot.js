export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt } = req.body;

    if (!apiKey || !prompt) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    try {
        // ČIA įrašyk tikrą DI API endpoint
        const response = await fetch("https://api.tavo-di.com/v1/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.toString() });
    }
}