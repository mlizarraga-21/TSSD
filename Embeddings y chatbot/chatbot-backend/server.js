require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
app.use(cors());
app.use(express.json());
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
app.post("/chat", async (req, res) => {
try {
const { message } = req.body;
const response = await axios.post(
"https://api.openai.com/v1/chat/completions",
{
model: "gpt-4",
messages: [{ role: "user", content: message }],
},
{
headers: {
"Authorization": `Bearer ${OPENAI_API_KEY}`,
"Content-Type": "application/json",
},
}
);
res.json({ reply: response.data.choices[0].message.content });
} catch (error) {
console.error("Error al llamar a OpenAI:", error);
res.status(500).json({ error: "Error interno del servidor" });
}
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));