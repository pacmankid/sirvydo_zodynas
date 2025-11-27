import zodynas from '../data/zodynascsvjson.json';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt: question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Missing prompt" });
    }

    // Filtruojame JSON įrašus
    const relevant = zodynas.filter(item =>
        question.toLowerCase().includes(item.seno_zodzio_forma.toLowerCase().trim())
    );

    console.log("Vartotojo klausimas:", question);
    console.log("Rasti JSON įrašai:", relevant);

    // Grąžiname rastus įrašus tiesiogiai
    return res.status(200).json({ relevant });
}
