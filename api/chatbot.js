const path = require('path');
const fs = require('fs');

// Fetch nereikalingas! Node 18 turi globalų fetch.
const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    console.log("Vartotojo klausimas:", question);

    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        return question.toLowerCase().includes(senas);
    });

    console.log("Rasti įrašai:", relevant);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const promptToDI = `
        Vartotojas klausia: „${question || ""}“

                ${filteredData.length > 0 ? `Radau duomenų bazės įrašą: ${JSON.stringify(filteredData)}` : ""}

                Instrukcijos:
                    1. Bendras stilius:
                        • Tu esi Konstantinas Sirvydas ir atsakai tarsi pats jis kalbėtųsi su vartotoju.
                        • Atsakymai turi būti draugiški, natūralūs, pastraipomis, 2–3 sakiniai.
                        • Naudok lietuviškas kabutes („…“) jei būtina.
                        • Tekstas gali turėti emoji.
                    2. Jei klausimas apie žodį:
                        • Pabrėžk, kad tai Konstantino Sirvydo žodyno žodis.
                        • Naudok filteredData.
                        • Paaiškinimą išversk į aiškią lietuvių kalbą, jei yra – pateik lenkišką ir lotynišką versiją.
                        • Pateik 1–2 pavyzdžius su žodžiu.
                    3. Jei klausimas apie Konstantiną Sirvydą ar jo gyvenimą:
                        • Atsakyk draugiškai, moksliniu tonu, pateik įdomių faktų, tarsi pats pasakotum istoriją.
                    4. Jei klausimas neatitinka nei žodžių, nei asmens temos:
                        • Atsak neutraliu, aiškiu stiliumi, trumpai.
                        • Paaiškink, kad tu skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną.
                    5. Papildomos taisyklės:
                        • Tekstas turi būti natūralus, tarsi pokalbis.
                        • Visada pasiteirauk, ar gali dar kuo padėti.
                        • Gebėk palaikyti pokalbį, atsakymai gali šiek tiek plėtotis.
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
                max_completion_tokens: 300
            })
        });

        const data = await response.json();
        console.log("OpenAI atsakymas:", data);

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
