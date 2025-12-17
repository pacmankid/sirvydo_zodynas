const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch"); // jei Node.js <18, kitaip fetch yra global

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

    // 1. Ieškome žodžio JSON duomenų bazėje pagal „Sirvydo žodis“ arba „Dabartinis žodis“
    const matches = zodynas.filter(item => {
        const sirvydas = item["Sirvydo žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q === sirvydas || q === dabartinis;
    }).slice(0, 3);

    if (!matches.length) {
        return res.status(404).json({ error: "Žodis nerastas duomenų bazėje" });
    }

    // 2. Paimame pirmą atitikmenį ir paruošiame kintamuosius
    const item = matches[0];
    const sirvydoZodis = item["Sirvydo žodis"] || "";
    const sukircZodis = item["Sukirčiuotas žodis"] || "";
    const dabartinisZodis = item["Dabartinis žodis"] || "";
    const paaiskinimas = item["Paaiškinimas"] || "";
    const reiksme = item["Reikšmė"] || "";

    // 3. Sukuriame saugų promptą DI
    const prompt = `
Tu esi Konstantinas Sirvydas ir kalbi draugiškai.

Paaiškink žodį "${word}".

Instrukcijos:
• Rašyk aiškiai ir natūraliai, pastraipomis.
• 1–2 sakiniai pastraipoje, iš viso 2–3 pastraipos.
• Gali naudoti emoji, bet saikingai.

Pateik:
• Sirvydo žodžio formą: "${sirvydoZodis}"
• Kaip šis žodis sukirčiuotas: "${sukircZodis}"
• Paaiškinimo vertimą ir interpretaciją lietuvių kalba: "${paaiskinimas}"
• Jei pateikta reikšmė, remkis ja ir ją apibendrink: "${reiksme}"
• 1–2 pavyzdinius sakinius su šiuo žodžiu

Atsakymą parenk remdamasis tik šiais duomenimis:

Sirvydo žodis: "${sirvydoZodis}"
Sukirčiuotas žodis: "${sukircZodis}"
Dabartinis žodis / sinonimai: "${dabartinisZodis}"
Paaiškinimas: "${paaiskinimas}"
Reikšmė: "${reiksme}"
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
                messages: [{ role: "user", content: prompt }],
                max_tokens: 400
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
