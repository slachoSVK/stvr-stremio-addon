const { addonBuilder } = require("stremio-addon-sdk");

// 1. Definícia Manifestu
const manifest = {
    id: "org.stvr.archive",
    version: "1.0.0",
    name: "STVR Archív SK",
    description: "Slovenský archív STVR pre Stremio, Vidi a Fusion",
    resources: ["catalog", "stream"],
    types: ["tv", "series"],
    catalogs: [
        {
            type: "tv",
            id: "stvr_live",
            name: "STVR Živé Vysielanie"
        }
    ],
    idPrefixes: ["stvr:"]
};

const builder = new addonBuilder(manifest);

// 2. Katalóg - Živé kanály STVR
builder.defineCatalogHandler(async ({ type, id }) => {
    if (id === "stvr_live") {
        return {
            metas: [
                {
                    id: "stvr:jednotka",
                    type: "tv",
                    name: "STVR :1 (Jednotka)",
                    poster: "https://www.stvr.sk/images/logo-jednotka.png",
                    description: "Živé vysielanie Okruhu :1"
                },
                {
                    id: "stvr:dvojka",
                    type: "tv",
                    name: "STVR :2 (Dvojka)",
                    poster: "https://www.stvr.sk/images/logo-dvojka.png",
                    description: "Živé vysielanie Okruhu :2"
                },
                {
                    id: "stvr:24",
                    type: "tv",
                    name: "STVR :24",
                    poster: "https://www.stvr.sk/images/logo-24.png",
                    description: "Spravodajský okruh :24"
                }
            ]
        };
    }
    return { metas: [] };
});

// 3. Streamy - HLS odkaz na živé vysielanie
builder.defineStreamHandler(async ({ id }) => {
    const streams = {
        "stvr:jednotka": "https://live.stvr.sk/live/jednotka/playlist.m3u8",
        "stvr:dvojka": "https://live.stvr.sk/live/dvojka/playlist.m3u8",
        "stvr:24": "https://live.stvr.sk/live/24/playlist.m3u8"
    };

    if (streams[id]) {
        return {
            streams: [
                {
                    title: "STVR HD Stream",
                    url: streams[id]
                }
            ]
        };
    }

    return { streams: [] };
});

// 4. Export pre Vercel s plnou CORS a UTF-8 podporou
module.exports = (req, res) => {
    // CORS hlavičky pre Fusion Media Center
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Odpoveď pre OPTIONS pre-flight požiadavku
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
