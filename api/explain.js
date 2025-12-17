const path = require("path");
const fs = require("fs");
const { fetch } = require("undici");

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

    /* 1. Ieškome žodžio JSON duomenų bazėje */
    const matches = zodynas.filter(item => {
        const senas = item["Sirvydo žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q === senas || q === dabartinis;
    }).slice(0, 3);

    /* 2. Paruošiame kontekstą DI (jei radome JSON įrašą) */
    let contextText = "";

    if (matches.length) {
        contextText = matches.map(item => {
            return `Sirvydo žodis: "${item["Sirvydo žodis"]}"
    Sukirčiuotas žodis: "${item["Sukirčiuotas žodis"]}"
    Dabartinis žodis / sinonimai: "${item["Dabartinis žodis"]}"
    Paaiškinimas: ${item["Paaiškinimas"] || ""}
    Reikšmė: ${item["Reikšmė"] || ""}`;
        }).join("\n\n");
    }

    const promptToDI = `
    Paaiškink žodį „${word}“.

    Instrukcijos:
    • Rašyk aiškiai, natūraliai, pastraipomis.
    • 1–2 sakiniai pastraipoje, 2–3 pastraipos.
    • Gali naudoti emoji, bet saikingai.

    ${contextText ? `Papildoma informacija iš žodyno:\n${contextText}` : ""}

    Pateik:
    • Sirvydo žodį, kaip jis kirčiuojamas, dabartinį žodį ir jo reikšmę, jei ji yra.
    • vartojimo kontekstą
    • lotyniškus ir (ar) lenkiškus atitikmenis remiantis paaiškinimu.
    • 1–2 pavyzdinius sakinius su šiuo žodžiu

    Rašyk moksline kalba.
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-5.1",
                messages: [{ role: "user", content: promptToDI }],
                max_tokens: 1000 // didesnis limitas
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
