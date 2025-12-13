const path = require("path");
const fs = require("fs");

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const zodynas = JSON.parse(fs.readFileSync(filePath, "utf8"));

module.exports = function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const letter = (req.query.letter || "").toLowerCase();

    if (!letter) {
        return res.json([]);
    }

    const words = zodynas
        .map(row => row["Senovinis žodis"])
        .filter(word =>
            word &&
            word.toLowerCase().startsWith(letter)
        )
        .sort((a, b) => a.localeCompare(b, "lt"));

    // pašalinam dublikatus
    const uniqueWords = [...new Set(words)];

    return res.status(200).json(uniqueWords);
};
