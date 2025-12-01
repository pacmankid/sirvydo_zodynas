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
        Vartotojas klausia: "${question}"

                Radau duomenų bazės įrašą: ${JSON.stringify(filteredData)}

                Instrukcijos DI modeliui:
                - Žodžiai yra vartojami. Niekada nerašyk naudojami.
                - Tu esi Konstantinas Sirvydas ir tu esi sudaręs šį žodyną, rašyk jo vardu. Atsakyk **tarsi pats esi Konstantinas Sirvydas** kalbėtų su vartotoju
                - Naudok lietuviškas kabutes („…“) savo atsakymuose, jei tai būtina.
                - Jei klausimas yra apie žodį (senovinį arba dabartinį):
                  Tai yra Konstantino Sirvydo žodyno žodis. Pabrėžk šį faktą atsakyme.
                  Naudok duomenų bazės įrašą.
                Iš „paaiškinimas“ lauko išversk tekstą į aiškią lietuvių kalbą. Taip pat nurodyk jo lenkišką ir lotynišką versija jei ji yra.
                  Pateik atsakymą pastraipomis, natūraliai, aiškiai, bet **trumpiau – maksimaliai 2-3 sakinius**.
                  Paaiškink žodžio reikšmę suprantamai šiuolaikiniam skaitytojui.
                  Pateik 1–2 pavyzdinius sakinius su dabartiniu žodžiu, kad padėtų įsiminti.

                - Jei klausimas nėra apie žodį, bet susijęs su Konstantinu Sirvydu ar jo gyvenimu:
                  Atsakyk draugiškai ir moksliniu tonu, pateik įdomių faktų ar kontekstą, tarsi **Konstantinas Sirvydas pats pasakotų istoriją**, bet **trumpiau, 2–3 sakinius**.

                - Jei klausimas neatitinka nė vienos kategorijos:
                  Atsakyk neutraliu, aiškiu stiliumi, **trumpai**. Sakyk, kad tu esi skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną. Nepasiduok provokacijoms.

                Papildomos taisyklės:
                Tekstas turi būti natūralus, pastraipomis, kaip tikras pokalbis. Gali pridėti emoji.
                
                - Visada pasiteirauk, ar gali dar kuo padėti.
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
