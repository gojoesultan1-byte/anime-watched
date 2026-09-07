const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
    db,
    createUser,
    getUserById,
    getUserByEmail,
    createPost,
    getPost,
    getPosts,
    updatePost,
    deletePost,
    addView,
    likePost,
    unlikePost,
    addComment,
    getComments,
    createCoupon,
    deleteCoupon,
    getCoupons,
    getSettings,
    updateSettings,
    createAdminLog,
    getDashboardStats
} = require("./database");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    crypto.randomBytes(48).toString("hex");

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(
    express.static(__dirname)
);


/* =========================================
   BASIC SECURITY HEADERS
========================================= */

app.use((req, res, next) => {

    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    res.setHeader(
        "X-Frame-Options",
        "SAMEORIGIN"
    );

    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );

    next();

});


/* =========================================
   HELPERS
========================================= */

function cleanString(value, max = 5000) {

    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value
        .trim()
        .slice(0, max);

}


function validEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


function hashIp(ip) {

    return crypto
        .createHash("sha256")
        .update(
            `${ip}:${process.env.IP_HASH_SALT || "anime-world"}`
        )
        .digest("hex");

}


function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            username: user.username
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

}


function getTokenFromRequest(req) {

    const header =
        req.headers.authorization;

    if (
        !header ||
        !header.startsWith("Bearer ")
    ) {
        return null;
    }

    return header.slice(7);

}


/* =========================================
   AUTH MIDDLEWARE
========================================= */

function requireAuth(
    req,
    res,
    next
) {

    const token =
        getTokenFromRequest(req);

    if (!token) {

        return res
            .status(401)
            .json({
                success: false,
                message:
                    "يجب تسجيل الدخول."
            });

    }

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const user =
            getUserById(
                decoded.id
            );

        if (!user) {

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "الحساب غير موجود."
                });

        }

        if (!user.is_active) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "الحساب متوقف."
                });

        }

        req.user = user;

        next();

    } catch (error) {

        return res
            .status(401)
            .json({
                success: false,
                message:
                    "جلسة الدخول غير صالحة."
            });

    }

}


function requireOwner(
    req,
    res,
    next
) {

    if (!req.user) {

        return res
            .status(401)
            .json({
                success: false,
                message:
                    "يجب تسجيل الدخول."
            });

    }

    if (
        req.user.id !== 111111111 ||
        req.user.role !== "owner"
    ) {

        return res
            .status(403)
            .json({
                success: false,
                message:
                    "ليس لديك صلاحية الوصول إلى لوحة المشرف."
            });

    }

    next();

}


function requireAdmin(
    req,
    res,
    next
) {

    if (!req.user) {

        return res
            .status(401)
            .json({
                success: false,
                message:
                    "يجب تسجيل الدخول."
            });

    }

    const allowed =
        [
            "owner",
            "admin"
        ];

    if (
        !allowed.includes(
            req.user.role
        )
    ) {

        return res
            .status(403)
            .json({
                success: false,
                message:
                    "ليس لديك صلاحيات الإدارة."
            });

    }

    next();

}


/* =========================================
   HEALTH CHECK
========================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            service: "Anime World",
            status: "online",
            time:
                new Date().toISOString()
        });

    }
);


/* =========================================
   REGISTER
========================================= */

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const username =
                cleanString(
                    req.body.username,
                    40
                );

            const email =
                cleanString(
                    req.body.email,
                    150
                ).toLowerCase();

            const password =
                typeof req.body.password ===
                "string"
                    ? req.body.password
                    : "";

            if (
                username.length < 3
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "اسم المستخدم قصير جداً."
                    });

            }

            if (
                !validEmail(email)
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

            const settings =
                getSettings();

            if (
                !settings.allow_register
            ) {

                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "التسجيل مغلق حالياً."
                    });

            }

            const existing =
                getUserByEmail(
                    email
                );

            if (existing) {

                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "البريد الإلكتروني مستخدم بالفعل."
                    });

            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            const user =
                createUser({
                    username,
                    email,
                    passwordHash,
                    role: "user"
                });

            const token =
                createToken(
                    user
                );

            res.status(201)
                .json({
                    success: true,
                    message:
                        "تم إنشاء الحساب بنجاح.",
                    token,
                    user
                });

        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );

            res.status(500)
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

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const email =
                cleanString(
                    req.body.email,
                    150
                ).toLowerCase();

            const password =
                typeof req.body.password ===
                "string"
                    ? req.body.password
                    : "";

            if (
                !email ||
                !password
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "أدخل البريد وكلمة المرور."
                    });

            }

            const user =
                getUserByEmail(
                    email
                );

            if (!user) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "بيانات الدخول غير صحيحة."
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
                            "هذا الحساب متوقف."
                    });

            }

            const valid =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!valid) {

                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "بيانات الدخول غير صحيحة."
                    });

            }

            const token =
                createToken(
                    user
                );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username:
                        user.username,
                    email:
                        user.email,
                    role:
                        user.role
                }
            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            res.status(500)
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

app.get(
    "/api/auth/me",
    requireAuth,
    (req, res) => {

        res.json({
            success: true,
            user: {
                id:
                    req.user.id,
                username:
                    req.user.username,
                email:
                    req.user.email,
                role:
                    req.user.role,
                avatar:
                    req.user.avatar,
                bio:
                    req.user.bio
            }
        });

    }
);


/* =========================================
   POSTS
========================================= */

app.get(
    "/api/posts",
    (req, res) => {

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 20,
                    1
                ),
                100
            );

        const offset =
            Math.max(
                Number(
                    req.query.offset
                ) || 0,
                0
            );

        const posts =
            getPosts(
                limit,
                offset
            );

        res.json({
            success: true,
            posts
        });

    }
);


/* =========================================
   SINGLE POST
========================================= */

app.get(
    "/api/posts/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const post =
            getPost(id);

        if (!post) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        res.json({
            success: true,
            post
        });

    }
);


/* =========================================
   VIEW POST
========================================= */

app.post(
    "/api/posts/:id/view",
    optionalAuth,
    (req, res) => {

        const postId =
            Number(
                req.params.id
            );

        const post =
            getPost(
                postId
            );

        if (!post) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        try {

            addView({
                userId:
                    req.user
                        ? req.user.id
                        : null,

                postId,

                ipHash:
                    hashIp(
                        req.ip ||
                        "unknown"
                    )
            });

            const updated =
                getPost(
                    postId
                );

            res.json({
                success: true,
                views:
                    updated.views
            });

        } catch (error) {

            res.status(500)
                .json({
                    success: false,
                    message:
                        "تعذر تسجيل المشاهدة."
                });

        }

    }
);


/* =========================================
   OPTIONAL AUTH
========================================= */

function optionalAuth(
    req,
    res,
    next
) {

    const token =
        getTokenFromRequest(
            req
        );

    if (!token) {

        req.user = null;

        return next();

    }

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const user =
            getUserById(
                decoded.id
            );

        req.user =
            user || null;

    } catch {

        req.user = null;

    }

    next();

}


/* =========================================
   LIKE
========================================= */

app.post(
    "/api/posts/:id/like",
    requireAuth,
    (req, res) => {

        const postId =
            Number(
                req.params.id
            );

        const settings =
            getSettings();

        if (
            !settings.allow_likes
        ) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "الإعجابات مغلقة."
                });

        }

        const post =
            getPost(
                postId
            );

        if (!post) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        try {

            const liked =
                likePost(
                    req.user.id,
                    postId
                );

            const updated =
                getPost(
                    postId
                );

            res.json({
                success: true,
                liked,
                likes:
                    updated.likes
            });

        } catch (error) {

            res.status(500)
                .json({
                    success: false,
                    message:
                        "تعذر تسجيل الإعجاب."
                });

        }

    }
);


/* =========================================
   UNLIKE
========================================= */

app.delete(
    "/api/posts/:id/like",
    requireAuth,
    (req, res) => {

        const postId =
            Number(
                req.params.id
            );

        const result =
            unlikePost(
                req.user.id,
                postId
            );

        const updated =
            getPost(
                postId
            );

        if (!updated) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        res.json({
            success: true,
            unliked:
                result,
            likes:
                updated.likes
        });

    }
);


/* =========================================
   COMMENTS
========================================= */

app.get(
    "/api/posts/:id/comments",
    (req, res) => {

        const postId =
            Number(
                req.params.id
            );

        const comments =
            getComments(
                postId
            );

        res.json({
            success: true,
            comments
        });

    }
);


app.post(
    "/api/posts/:id/comments",
    requireAuth,
    (req, res) => {

        const postId =
            Number(
                req.params.id
            );

        const content =
            cleanString(
                req.body.content,
                1000
            );

        const settings =
            getSettings();

        if (
            !settings.allow_comments
        ) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "التعليقات مغلقة."
                });

        }

        if (!content) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "اكتب تعليقاً أولاً."
                });

        }

        const post =
            getPost(
                postId
            );

        if (!post) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        const comment =
            addComment(
                req.user.id,
                postId,
                content
            );

        res.status(201)
            .json({
                success: true,
                comment
            });

    }
);


/* =========================================
   OWNER DASHBOARD
========================================= */

app.get(
    "/api/admin/dashboard",
    requireAuth,
    requireOwner,
    (req, res) => {

        const stats =
            getDashboardStats();

        const posts =
            getPosts(
                100,
                0
            );

        const coupons =
            getCoupons();

        const settings =
            getSettings();

        res.json({
            success: true,
            stats,
            posts,
            coupons,
            settings
        });

    }
);


/* =========================================
   ADMIN CREATE POST
========================================= */

app.post(
    "/api/admin/posts",
    requireAuth,
    requireOwner,
    (req, res) => {

        const title =
            cleanString(
                req.body.title,
                200
            );

        const description =
            cleanString(
                req.body.description,
                5000
            );

        const mediaType =
            cleanString(
                req.body.media_type,
                20
            );

        const mediaUrl =
            cleanString(
                req.body.media_url,
                2000
            );

        const thumbnailUrl =
            cleanString(
                req.body.thumbnail_url,
                2000
            );

        if (!title) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "عنوان المنشور مطلوب."
                });

        }

        if (
            !["video", "image"]
                .includes(
                    mediaType
                )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "نوع الوسائط غير صحيح."
                });

        }

        if (!mediaUrl) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "رابط الوسائط مطلوب."
                });

        }

        const post =
            createPost({
                user_id:
                    req.user.id,

                title,

                description,

                media_type:
                    mediaType,

                media_url:
                    mediaUrl,

                thumbnail_url:
                    thumbnailUrl
            });

        createAdminLog({
            adminId:
                req.user.id,

            action:
                "CREATE_POST",

            targetType:
                "post",

            targetId:
                post.id,

            details:
                title
        });

        res.status(201)
            .json({
                success: true,
                post
            });

    }
);


/* =========================================
   ADMIN UPDATE POST
========================================= */

app.patch(
    "/api/admin/posts/:id",
    requireAuth,
    requireOwner,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const oldPost =
            getPost(id);

        if (!oldPost) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        const data = {};

        if (
            req.body.title !==
            undefined
        ) {

            data.title =
                cleanString(
                    req.body.title,
                    200
                );

        }

        if (
            req.body.description !==
            undefined
        ) {

            data.description =
                cleanString(
                    req.body.description,
                    5000
                );

        }

        if (
            req.body.media_type !==
            undefined
        ) {

            data.media_type =
                cleanString(
                    req.body.media_type,
                    20
                );

        }

        if (
            req.body.media_url !==
            undefined
        ) {

            data.media_url =
                cleanString(
                    req.body.media_url,
                    2000
                );

        }

        if (
            req.body.thumbnail_url !==
            undefined
        ) {

            data.thumbnail_url =
                cleanString(
                    req.body.thumbnail_url,
                    2000
                );

        }

        if (
            req.body.views !==
            undefined
        ) {

            data.views =
                Math.max(
                    0,
                    Number(
                        req.body.views
                    ) || 0
                );

        }

        if (
            req.body.likes !==
            undefined
        ) {

            data.likes =
                Math.max(
                    0,
                    Number(
                        req.body.likes
                    ) || 0
                );

        }

        if (
            req.body.status !==
            undefined
        ) {

            const status =
                cleanString(
                    req.body.status,
                    30
                );

            if (
                ![
                    "published",
                    "draft",
                    "hidden"
                ].includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "الحالة غير صحيحة."
                    });

            }

            data.status =
                status;

        }

        const updated =
            updatePost(
                id,
                data
            );

        createAdminLog({
            adminId:
                req.user.id,

            action:
                "UPDATE_POST",

            targetType:
                "post",

            targetId:
                id,

            details:
                JSON.stringify(
                    data
                )
        });

        res.json({
            success: true,
            post: updated
        });

    }
);


/* =========================================
   ADMIN DELETE POST
========================================= */

app.delete(
    "/api/admin/posts/:id",
    requireAuth,
    requireOwner,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const post =
            getPost(id);

        if (!post) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المنشور غير موجود."
                });

        }

        deletePost(id);

        createAdminLog({
            adminId:
                req.user.id,

            action:
                "DELETE_POST",

            targetType:
                "post",

            targetId:
                id,

            details:
                post.title
        });

        res.json({
            success: true,
            message:
                "تم حذف المنشور."
        });

    }
);


/* =========================================
   ADMIN COUPONS
========================================= */

app.get(
    "/api/admin/coupons",
    requireAuth,
    requireOwner,
    (req, res) => {

        res.json({
            success: true,
            coupons:
                getCoupons()
        });

    }
);


app.post(
    "/api/admin/coupons",
    requireAuth,
    requireOwner,
    (req, res) => {

        const code =
            cleanString(
                req.body.code,
                50
            ).toUpperCase();

        const value =
            cleanString(
                req.body.value,
                100
            );

        const maxUses =
            Math.max(
                1,
                Number(
                    req.body.max_uses
                ) || 1
            );

        const expiresAt =
            req.body.expires_at ||
            null;

        if (
            !code ||
            !value
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "بيانات القسيمة ناقصة."
                });

        }

        try {

            const coupon =
                createCoupon(
                    code,
                    value,
                    maxUses,
                    expiresAt
                );

            createAdminLog({
                adminId:
                    req.user.id,

                action:
                    "CREATE_COUPON",

                targetType:
                    "coupon",

                targetId:
                    coupon.id,

                details:
                    code
            });

            res.status(201)
                .json({
                    success: true,
                    coupon
                });

        } catch {

            res
                .status(409)
                .json({
                    success: false,
                    message:
                        "القسيمة موجودة بالفعل."
                });

        }

    }
);


app.delete(
    "/api/admin/coupons/:id",
    requireAuth,
    requireOwner,
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        deleteCoupon(id);

        createAdminLog({
            adminId:
                req.user.id,

            action:
                "DELETE_COUPON",

            targetType:
                "coupon",

            targetId:
                id
        });

        res.json({
            success: true,
            message:
                "تم حذف القسيمة."
        });

    }
);


/* =========================================
   SITE SETTINGS
========================================= */

app.get(
    "/api/settings",
    (req, res) => {

        res.json({
            success: true,
            settings:
                getSettings()
        });

    }
);


app.patch(
    "/api/admin/settings",
    requireAuth,
    requireOwner,
    (req, res) => {

        const allowedColors = [
            "primary_color",
            "secondary_color",
            "background_color",
            "card_color"
        ];

        const data = {};

        allowedColors.forEach(
            key => {

                if (
                    req.body[key] !==
                    undefined
                ) {

                    data[key] =
                        cleanString(
                            req.body[key],
                            20
                        );

                }

            }
        );

        const booleanFields = [
            "show_search",
            "show_videos",
            "show_images",
            "show_community",
            "allow_register",
            "allow_comments",
            "allow_likes",
            "maintenance_mode"
        ];

        booleanFields.forEach(
            key => {

                if (
                    req.body[key] !==
                    undefined
                ) {

                    data[key] =
                        req.body[key]
                            ? 1
                            : 0;

                }

            }
        );

        if (
            req.body.site_name !==
            undefined
        ) {

            data.site_name =
                cleanString(
                    req.body.site_name,
                    100
                );

        }

        const settings =
            updateSettings(
                data
            );

        createAdminLog({
            adminId:
                req.user.id,

            action:
                "UPDATE_SETTINGS",

            targetType:
                "settings",

            details:
                JSON.stringify(
                    data
                )
        });

        res.json({
            success: true,
            settings
        });

    }
);


/* =========================================
   ERROR HANDLER
========================================= */

app.use(
    (err, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            err
        );

        if (
            res.headersSent
        ) {

            return next(err);

        }

        res
            .status(500)
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
            `Anime World running on port ${PORT}`
        );

    }
);
