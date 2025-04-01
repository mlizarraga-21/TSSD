require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const books = [];
const wiki = [];

// Cargar libros
fs.createReadStream('DB_Halo_Books_filtrada_top10.csv')
    .pipe(csv())
    .on('data', (row) => {
        books.push({
            text: row['Parrafo'],
            embedding: JSON.parse(row['Embedding']),
            source_type: 'book'
        });
    });

// Cargar wiki
fs.createReadStream('DB_Halo_Wiki_filtrada.csv')
    .pipe(csv())
    .on('data', (row) => {
        wiki.push({
            text: row['Parrafo'],
            embedding: JSON.parse(row['Embedding']),
            source_type: 'wiki'
        });
    });

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

async function obtenerEmbedding(text) {
    const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
            model: 'text-embedding-ada-002',
            input: text,
        },
        {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data.data[0].embedding;
}

async function buscarContexto(pregunta) {
    const embeddingPregunta = await obtenerEmbedding(pregunta);

    function topN(arr, n = 2) {
        return arr.sort((a, b) => b.similarity - a.similarity).slice(0, n);
    }

    const similitudesBook = books.map(entry => ({
        text: entry.text,
        similarity: cosineSimilarity(entry.embedding, embeddingPregunta),
        source_type: 'book'
    }));

    const similitudesWiki = wiki.map(entry => ({
        text: entry.text,
        similarity: cosineSimilarity(entry.embedding, embeddingPregunta),
        source_type: 'wiki'
    }));

    const topBook = topN(similitudesBook);
    const topWiki = topN(similitudesWiki);

    const contexto = [...topBook, ...topWiki];
    const libroEsElPrincipal = topBook[0].similarity > topWiki[0].similarity;

    return {
        contexto,
        estiloRespuesta: libroEsElPrincipal ? 'detallada' : 'breve'
    };
}

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const { contexto, estiloRespuesta } = await buscarContexto(message);

        const contextoTexto = contexto.map(c => `(${c.source_type.toUpperCase()}) ${c.text}`).join("\n\n");

        const promptSistema = `Eres un experto en Halo. A partir del siguiente contexto responde al usuario de forma ${estiloRespuesta}. Contexto:\n${contextoTexto}`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: promptSistema },
                    { role: 'user', content: message },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));