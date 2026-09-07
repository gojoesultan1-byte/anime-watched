require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT =
    process.env.PORT || 3000;


/* =========================================
   BASIC SECURITY
========================================= */

app.disable("x-powered-by");


/* =========================================
   BODY PARSER
========================================= */

app.use(
    express.json({
        limit: "2mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "2mb"
    })
);


/* =========================================
   STATIC FILES
========================================= */

app.use(
    express.static(
        path.join(
            __dirname,
            "."
        )
    )
);


/* =========================================
   API ROUTES
========================================= */

const authRouter =
    require("./api");

const adminRouter =
    require("./admin");


app.use(
    "/api/auth",
    authRouter
);


app.use(
    "/api/admin",
    adminRouter
);


/* =========================================
   HEALTH CHECK
========================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status:
                "online",

            service:
                "Anime World",

            time:
                new Date().toISOString()

        });

    }
);


/* =========================================
   LOGIN PAGE
========================================= */

app.get(
    "/login",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "login.html"
            )
        );

    }
);


/* =========================================
   REGISTER PAGE
========================================= */

app.get(
    "/register",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "register.html"
            )
        );

    }
);


/* =========================================
   ADMIN PAGE
========================================= */

app.get(
    "/admin",
    (req, res) => {

        /*
         * The actual API authorization
         * happens server-side.
         *
         * This page itself does not
         * contain admin secrets.
         */

        res.sendFile(
            path.join(
                __dirname,
                "admin.html"
            )
        );

    }
);


/* =========================================
   HOME PAGE
========================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* =========================================
   404 API
========================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404)
            .json({

                success: false,

                message:
                    "API endpoint not found."

            });

    }
);


/* =========================================
   404 WEBSITE
========================================= */

app.use(
    (req, res) => {

        res.status(404)
            .send(`

                <!DOCTYPE html>

                <html
                    lang="ar"
                    dir="rtl"
                >

                <head>

                    <meta
                        charset="UTF-8"
                    >

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                    <title>
                        الصفحة غير موجودة
                    </title>

                    <style>

                        body{

                            margin:0;

                            min-height:100vh;

                            display:flex;

                            align-items:center;

                            justify-content:center;

                            background:#080b16;

                            color:#fff;

                            font-family:
                                Arial,
                                sans-serif;

                            text-align:center;

                        }

                        .box{

                            padding:40px;

                        }

                        h1{

                            font-size:70px;

                            margin:0 0 10px;

                        }

                        p{

                            color:#929ab3;

                        }

                        a{

                            color:#7187ff;

                            text-decoration:none;

                        }

                    </style>

                </head>

                <body>

                    <div class="box">

                        <h1>
                            404
                        </h1>

                        <p>
                            الصفحة التي تبحث عنها غير موجودة.
                        </p>

                        <a href="/">
                            العودة للرئيسية
                        </a>

                    </div>

                </body>

                </html>

            `);

    }
);


/* =========================================
   ERROR HANDLER
========================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        res.status(500)
            .json({

                success: false,

                message:
                    "حدث خطأ داخلي في الخادم."

            });

    }
);


/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    () => {

        console.log(
            "================================"
        );

        console.log(
            "Anime World Server"
        );

        console.log(
            "================================"
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Environment: ${
                process.env.NODE_ENV ||
                "development"
            }`
        );

        console.log(
            "================================"
        );

    }
);
