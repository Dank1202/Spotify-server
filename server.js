require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

let access_token = "";
let refresh_token = "";

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
    res.send("Spotify server running 🎵");
});

/* =========================
   CALLBACK (LOGIN SPOTIFY)
========================= */
app.get("/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) return res.send("No code recibido");

    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization:
                        "Basic " +
                        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
                }
            }
        );

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;

        console.log("✅ ACCESS TOKEN:", access_token);
        console.log("🔄 REFRESH TOKEN:", refresh_token);

        res.send("Login exitoso 🎵 ya puedes cerrar esta ventana");
    } catch (err) {
        console.log(err.response?.data || err.message);
        res.send("Error en autenticación");
    }
});

/* =========================
   REFRESH TOKEN
========================= */
async function refreshAccessToken() {
    if (!refresh_token) return;

    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refresh_token
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization:
                        "Basic " +
                        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
                }
            }
        );

        access_token = response.data.access_token;
        console.log("🔄 Token actualizado");
    } catch (err) {
        console.log("Refresh error:", err.response?.data || err.message);
    }
}

/* =========================
   CANCION ACTUAL (ESP32)
========================= */
app.get("/song", async (req, res) => {
    if (!access_token) {
        return res.json({ error: "No autenticado aún" });
    }

    try {
        const response = await axios.get(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {
                headers: {
                    Authorization: "Bearer " + access_token
                }
            }
        );

        if (!response.data || !response.data.item) {
            return res.json({ playing: false });
        }

        const song = {
            name: response.data.item.name,
            artist: response.data.item.artists[0].name,
            album: response.data.item.album.name,
            image: response.data.item.album.images[0].url,
            playing: true
        };

        res.json(song);
    } catch (err) {
        res.json({ error: "Error obteniendo canción" });
    }
});

/* ========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

/* =========================
   AUTO REFRESH
========================= */
setInterval(refreshAccessToken, 1000 * 60 * 50);