require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const routes = require("./routers/index.js");
const { logger } = require("./utils/logger.js");
const { specs, swaggerUi } = require('./swagger.js');
const env = process.env;
const cors = require("cors");
const server = express();

server.name = "arteGallera";

if (env.NODE_ENV === 'production') {
    server.set('trust proxy', 1); // trust first proxy
}

server.use(helmet({ 
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));


server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true
}));


server.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(express.json());
server.use(morgan(env.MODE));

// Servir archivos estáticos de uploads con CORS headers
server.use('/uploads', (req, res, next) => {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Allow-Origin', '*');
    next();
}, express.static('uploads'));
server.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    next();
});

server.use((req, res, next) => {
    logger.info(`Received a ${req.method} request for ${req.url}`);
    next();
});
// Ruta base de saludo
// server.get('/', (req, res) => {
//     res.status(200).send('Conectado a la API de arteGallera!!!');
// });

server.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
server.use("/", routes);

server.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || err;
    logger.info(`Received a ${req.method} request for ${req.url}`);
    res.status(status).send(message);
});

module.exports = server;
