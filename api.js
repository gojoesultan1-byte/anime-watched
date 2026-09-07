const express = require("express");

const router = express.Router();

const {
    hashPassword,
    comparePassword,
    createAuthToken,
    authenticate,
    publicUser
} = require("./auth");

const {
    getUserById,
    getUserByEmail,
    createUser
} = require("./database");


/* =========================================
   GENERATE RANDOM 9-DIGIT USER ID
========================================= */

function generateUserId() {

    const min = 100000000;
    const max = 999999999;

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;
}


function createUniqueUserId() {

    let id;
    let attempts = 0;

    do {

        id = generateUserId();

        attempts++;

        if (attempts > 100) {

            throw new Error(
                "Unable to generate user ID."
            );

        }

    } while (
        getUserById(id)
    );

    return id;
}


/* =========================================
   REGISTER
========================================= */

router.post(
    "/register",
    async (req, res) => {

        try {

            const username =
                String(
                    req.body.username || ""
                )
                .trim()
                .slice(0, 30);


            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase()
                .slice(0, 150);


            const password =
                String(
                    req.body.password || ""
                );


            /* -----------------------------
               BASIC VALIDATION
            ----------------------------- */

            if (
                username.length < 3
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "اسم المستخدم يجب أن يكون 3 أحرف على الأقل."
                    });

            }


            if (
                !/^[A-Za-z0-9_\u0600-\u06FF ]+$/
                    .test(username)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "اسم المستخدم يحتوي على رموز غير مسموحة."
                    });

            }


            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "البريد الإلكتروني غير صحيح."
                    });

            }


            if (
                password.length < 8
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
                    });

            }


            /* -----------------------------
               EMAIL CHECK
            ----------------------------- */

            const existing =
                getUserByEmail(email);


            if (existing) {

                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "هذا البريد الإلكتروني مستخدم بالفعل."
                    });

            }


            /* -----------------------------
               CREATE ID
            ----------------------------- */

            const id =
                createUniqueUserId();


            /* -----------------------------
               HASH PASSWORD
            ----------------------------- */

            const passwordHash =
                await hashPassword(
                    password
                );


            /* -----------------------------
               CREATE USER
            ----------------------------- */

            const user =
                createUser({

                    id,

                    username,

                    email,

                    passwordHash,

                    role:
                        "user"

                });


            /* -----------------------------
               TOKEN
            ----------------------------- */

            const token =
                createAuthToken(
                    user
                );


            /* -----------------------------
               RESPONSE
            ----------------------------- */

            return res
                .status(201)
                .json({

                    success: true,

                    message:
                        "تم إنشاء الحساب بنجاح.",

                    token,

                    user:
                        publicUser(
                            user
                        )

                });


        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "حدث خطأ أثناء إنشاء الحساب."

                });

        }

    }
);


/* =========================================
   LOGIN
========================================= */

router.post(
    "/login",
    async (req, res) => {

        try {

            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase();


            const password =
                String(
                    req.body.password || ""
                );


            if (
                !email ||
                !password
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "أدخل البريد الإلكتروني وكلمة المرور."

                    });

            }


            const user =
                getUserByEmail(
                    email
                );


            /*
             * Don't reveal whether
             * the email exists.
             */

            if (!user) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        message:
                            "بيانات تسجيل الدخول غير صحيحة."

                    });

            }


            if (
                !user.is_active
            ) {

                return res
                    .status(403)
                    .json({

                        success: false,

                        message:
                            "هذا الحساب غير مفعل."

                    });

            }


            const valid =
                await comparePassword(
                    password,
                    user.password_hash
                );


            if (!valid) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        message:
                            "بيانات تسجيل الدخول غير صحيحة."

                    });

            }


            const token =
                createAuthToken(
                    user
                );


            return res.json({

                success: true,

                message:
                    "تم تسجيل الدخول بنجاح.",

                token,

                user:
                    publicUser(
                        user
                    )

            });


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "حدث خطأ أثناء تسجيل الدخول."

                });

        }

    }
);


/* =========================================
   CURRENT USER
========================================= */

router.get(
    "/me",
    authenticate(getUserById),
    (req, res) => {

        res.json({

            success: true,

            user:
                publicUser(
                    req.user
                )

        });

    }
);


/* =========================================
   LOGOUT
========================================= */

router.post(
    "/logout",
    authenticate(getUserById),
    (req, res) => {

        /*
         * JWT is stateless.
         * The browser removes the token.
         */

        res.json({

            success: true,

            message:
                "تم تسجيل الخروج."

        });

    }
);


module.exports = router;
