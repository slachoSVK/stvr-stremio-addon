const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    id: "org.stvr.archive",
    version: "1.1.0",
    name: "STVR Archív SK",
    description: "Kompletný archív relácií STVR pre Stremio, Vidi a Fusion",
    resources: ["catalog", "meta", "stream"],
    types: ["series", "tv"],
    catalogs: [
        {
            type: "series",
            id: "stvr_archive_popular",
            name: "STVR Najsledovanejšie"
        },
        {
            type: "series",
            id: "stvr_archive_az",
            name: "STVR Archív A-Z"
        }
    ],
    idPrefixes: ["stvr:"]
};

const builder = new addonBuilder(manifest);

// 1. Katalóg relácií z STVR
builder.defineCatalogHandler(async ({ type, id }) => {
    if (type !== "series") return { metas: [] };

    try {
        // Načítanie zoznamu relácií priamo z API STVR
        const res = await axios.get("https://www.stvr.sk/json/archive.json", {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const shows = res.data || [];
        
        const metas = shows.slice(0, 50).map(show => ({
            id: `stvr:show:${show.id}`,
            type: "series",
            name: show.title || show.name,
            poster: show.image ? `https://www.stvr.sk${show.image}` : "https://www.stvr.sk/images/logo-stvr.png",
            description: show.description || "Relácia z archívu STVR"
        }));

        return { metas };
    } catch (e) {
        console.error("STVR Catalog Error:", e.message);
        return { metas: [] };
    }
});

// 2. Detail relácie + zoznam epizód
builder.defineMetaHandler(async ({ type, id }) => {
    if (!id.startsWith("stvr:show:")) return { meta: {} };

    const showId = id.replace("stvr:show:", "");

    try {
        // Získanie detailu a epizód pre danú reláciu
        const res = await axios.get(`https://www.stvr.sk/json/archive/detail.json?id=${showId}`, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const data = res.data || {};
        const episodes = data.episodes || [];

        const videos = episodes.map((ep, index) => ({
            id: `stvr:ep:${ep.id}`,
            title: ep.title || `Epizóda ${index + 1}`,
            released: ep.date || new Date().toISOString(),
            season: 1,
            episode: index + 1
        }));

        return {
            meta: {
                id: id,
                type: "series",
                name: data.title || "STVR Relácia",
                poster: data.image ? `https://www.stvr.sk${data.image}` : undefined,
                description: data.description,
                videos: videos
            }
        };
    } catch (e) {
        return { meta: {} };
    }
});

// 3. Získanie reálneho HLS streamu pre konkrétnu epizódu
builder.defineStreamHandler(async ({ id }) => {
    if (!id.startsWith("stvr:ep:")) return { streams: [] };

    const epId = id.replace("stvr:ep:", "");

    try {
        // Vyžiadanie prehrajúceho M3U8 linku z iframe prehrávača STVR
        const res = await axios.get(`https://www.stvr.sk/json/archive/stream.json?id=${epId}`, {
            headers: { 
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://www.stvr.sk/"
            }
        });

        if (res.data && res.data.stream) {
            return {
                streams: [
                    {
                        title: "STVR Archív (HD)",
                        url: res.data.stream
                    }
                ]
            };
        }
    } catch (e) {
        console.error("STVR Stream Error:", e.message);
    }

    return { streams: [] };
});

// 4. Export pre Vercel s CORS a UTF-8
module.exports = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "OPTIONS") {
        res.statusCode = 200;
        res.end();
        return;
    }

    const addonInterface = builder.getInterface();
    if (req.url === "/" || req.url === "/manifest.json") {
        res.end(JSON.stringify(addonInterface.manifest));
    } else {
        addonInterface.get(req.url, (err, response) => {
            if (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.end(JSON.stringify(response));
            }
        });
    }
};
