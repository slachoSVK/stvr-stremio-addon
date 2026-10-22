const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    id: "org.stvr.archive",
    version: "1.2.0",
    name: "STVR Archív SK",
    description: "Slovenský archív STVR pre Stremio, Vidi a Fusion",
    resources: ["catalog", "meta", "stream"],
    types: ["series", "tv"],
    catalogs: [
        {
            type: "series",
            id: "stvr_archive_popular",
            name: "STVR Najsledovanejšie"
        }
    ],
    idPrefixes: ["stvr:"]
};

const builder = new addonBuilder(manifest);

// Zoznam najpopulárnejších relácií STVR s priamymi ID
const POPULAR_SHOWS = [
    {
        id: "stvr:show:55",
        name: "5 proti 5",
        poster: "https://www.stvr.sk/images/logo-stvr.png",
        description: "Súťažná šou s Andrejom Bičanom",
        streamUrl: "https://live.stvr.sk/live/jednotka/playlist.m3u8"
    },
    {
        id: "stvr:show:66",
        name: "Duel",
        poster: "https://www.stvr.sk/images/logo-stvr.png",
        description: "Vedomostná súťaž",
        streamUrl: "https://live.stvr.sk/live/jednotka/playlist.m3u8"
    },
    {
        id: "stvr:show:77",
        name: "Pečie celé Slovensko",
        poster: "https://www.stvr.sk/images/logo-stvr.png",
        description: "Pekárska šou STVR",
        streamUrl: "https://live.stvr.sk/live/jednotka/playlist.m3u8"
    }
];

// 1. Katalóg
builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === "series" && id === "stvr_archive_popular") {
        const metas = POPULAR_SHOWS.map(show => ({
            id: show.id,
            type: "series",
            name: show.name,
            poster: show.poster,
            description: show.description
        }));
        return { metas };
    }
    return { metas: [] };
});

// 2. Detail relácie / Epizódy
builder.defineMetaHandler(async ({ type, id }) => {
    const show = POPULAR_SHOWS.find(s => s.id === id);
    if (!show) return { meta: {} };

    return {
        meta: {
            id: show.id,
            type: "series",
            name: show.name,
            poster: show.poster,
            description: show.description,
            videos: [
                {
                    id: `${show.id}:ep1`,
                    title: `${show.name} - Najnovšia epizóda`,
                    released: new Date().toISOString(),
                    season: 1,
                    episode: 1
                }
            ]
        }
    };
});

// 3. Stream
builder.defineStreamHandler(async ({ id }) => {
    const showId = id.split(":ep")[0];
    const show = POPULAR_SHOWS.find(s => s.id === showId);

    if (show) {
        return {
            streams: [
                {
                    title: "STVR Archív Stream (HD)",
                    url: show.streamUrl
                }
            ]
        };
    }

    return { streams: [] };
});

// 4. CORS pre Fusion
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
