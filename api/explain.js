const path = require("path");
const fs = require("fs");

// JSON duomenų bazė
const filePath = path.join(process.cwd(), "data", "csvjson.json");
const zodynas = JSON.parse(fs.readFileSync(filePath, "utf8"));

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, word } = req.body;

    if (!apiKey || !word) {
        return res.status(400).json({ error: "Trūksta API rakto arba žodžio" });
    }

    const q = word.toLowerCase().trim();
    console.log("Paaiškinamas žodis:", q);

    // 1. Ieškome žodžio JSON duomenų bazėje
    const matches = zodynas.filter(item => {
        const sirvydas = item["Sirvydo žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q === sirvydas || q === dabartinis;
    }).slice(0, 3);

    if (!matches.length) {
        return res.status(404).json({ error: "Žodis nerastas duomenų bazėje" });
    }

    // 2. Paimame pirmą atitikmenį
    const item = matches[0];
    const sirvydoZodis = item["Sirvydo žodis"] || "";
    const sukircZodis = item["Sukirčiuotas žodis"] || "";
    const dabartinisZodis = item["Dabartinis žodis"] || "";
    const paaiskinimas = item["Paaiškinimas"] || "";
    const reiksme = item["Reikšmė"] || "";

    // 3. Paruošiame kontekstą DI
    const contextText =
        `Sirvydo žodis: "${sirvydoZodis}"\n` +
        `Sukirčiuotas žodis: "${sukircZodis}"\n` +
        `Dabartinis žodis / sinonimai: "${dabartinisZodis}"\n` +
        `Paaiškinimas: ${paaiskinimas}\n` +
        `Reikšmė: ${reiksme}\n`;

    // 4. Promptas DI
    const promptToDI = `
Tu esi Konstantinas Sirvydas ir kalbi draugiškai.

Paaiškink žodį "${word}" remdamasis tik šiais duomenimis:

${contextText}

Instrukcijos:
• Rašyk detaliai, bet aiškiai, 2–3 pastraipomis, 1–2 sakiniai pastraipoje.
• Pateik vartojimo kontekstą ir sinonimus.
• Paaiškinimu remkis lotyniškus ir (ar) lenkiškus atitikmenis.
• Įtrauk 1–2 pavyzdinius sakinius su šiuo žodžiu.
• Naudok emoji saikingai.
• Rašyk šiltai, kaip žmogui, ne kaip sąrašą.
`;

    try {
        // 5. Naudojame WHATWG URL API
        const apiUrl = new URL("https://api.openai.com/v1/chat/completions");

        const response = await fetch(apiUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-5.1",
                messages: [{ role: "user", content: promptToDI }],
                max_tokens: 600
            })
        });

        const data = await response.json();

        const answer = data.choices?.[0]?.message?.content || "Nepavyko gauti paaiškinimo.";

        return res.status(200).json({ answer });

    } catch (err) {
        console.error("DI klaida:", err);
        return res.status(500).json({
            error: "Server error",
            details: err.toString()
        });
    }
};
