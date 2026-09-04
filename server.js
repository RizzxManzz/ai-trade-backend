require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', upload.single('chart'), async (req, res) => {
  try {
    const file = req.file;
    const userPrompt = req.body.prompt || '';

    if (!file && !userPrompt) {
      return res.status(400).json({ success: false, message: 'Kirim gambar atau teks pesan.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const contents = [];

    if (file) {
      contents.push({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      });

      const chartPrompt = `Analisis chart trading ini secara teknikal. ${userPrompt}
      Tentukan pair, signal (BUY/SELL), Entry, SL, TP1, TP2, dan RR.
      Kembalikan HANYA format JSON valid tanpa markdown seperti ini:
      {
        "PAIR": "XAUUSD"
        "signal": "BUY",
        "entry": "4400.000",
        "sl": "4350.000",
        "tp1": "4450.000",
        "tp2": "4500.000",
        "rr": "1 : 2"
      }`;
      contents.push(chartPrompt);
    } else {
      contents.push(`Kamu adalah asisten AI trading. Jawab pertanyaan berikut singkat dan jelas: ${userPrompt}`);
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    if (file) {
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      return res.json({ success: true, data });
    } else {
      return res.json({ success: true, data: { reply: responseText } });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error: ${error.message}` 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
