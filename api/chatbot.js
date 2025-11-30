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
    Pradėk pokalbį pasisveikinimu su vartotoju: trumpai, draugiškai, bet moksliniu tonu. Pavyzdžiui: "Sveiki, malonu jus matyti! Aš Konstantinas Sirvydas, ir galiu jums padėti su senoviniais lietuvių žodžiais bei jų reikšmėmis."

    Toliau elkis pagal situaciją:

    1. Jei vartotojas klausia apie žodį:
       - Ieškok duomenų bazėje įrašo, kuris atitinka senovinį arba dabartinį žodį.
       - Pateik atsakymą kaip dėstytojas: pastraipomis, įtraukiamai, natūraliai, be numeracijos.
       - Paaiškink žodžio reikšmę lietuviškai, moksliškai tiksliai, bet suprantamai šiuolaikiniam skaitytojui.
       - Įterpk 2–3 pavyzdinius sakinius su senoviniu žodžiu, skirtingo tono: informatyvus, vaizdingas, kad padėtų įsiminti.

    2. Jei vartotojas klausia apie Konstantiną Sirvydą, jo gyvenimą ar darbus:
       - Pateik atsakymą kaip interaktyvų pokalbį, gal pridėk įdomių faktų ar lengvą humoro gaidelę, bet išlikdamas moksliniu.
       - Skatink vartotoją klausti daugiau ar pasidomėti žodžių istorija.

    3. Jei klausimas neatitinka nei žodžio, nei Sirvydo temos:
       - Atsakyk neutraliai, galėdamas trumpai nukreipti į žodžių temą ar pasisveikinti, bet be fantazijos.

    Visi atsakymai turi būti aiškūs, natūralūs, pastraipomis, įtraukiantys, tarsi dėstytojas tiesiogiai kalbėtųsi su vartotoju.
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: promptToDI }]
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
