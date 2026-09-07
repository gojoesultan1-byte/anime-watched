const express = require("express");

const router = express.Router();

const {
    authenticate,
    ownerOnly
} = require("./auth");

const {
    getPosts,
    getPost,
    updatePost,
    deletePost,
    getCoupons,
    createCoupon,
    deleteCoupon,
    getSettings,
    updateSettings,
    getDashboardStats,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    createAdminLog,
    getAdminLogs
} = require("./database");


/* =========================================
   GLOBAL ADMIN SECURITY
========================================= */

router.use(
    authenticate(getUserById)
);

router.use(
    ownerOnly()
);


/* =========================================
   DASHBOARD
========================================= */

router.get(
    "/dashboard",
    (req, res) => {

        try {

            const stats =
                getDashboardStats();

            res.json({
                success: true,

                owner: {
                    id:
                        req.user.id,

                    username:
                        req.user.username,

                    email:
                        req.user.email,

                    role:
                        req.user.role
                },

                stats,

                serverTime:
                    new Date().toISOString()
            });

        } catch (error) {

            console.error(
                "ADMIN DASHBOARD:",
                error
            );

            res.status(500)
                .json({
                    success: false,
                    message:
                        "تعذر تحميل لوحة التحكم."
                });
        }
    }
);


/* =========================================
   POSTS LIST
========================================= */

router.get(
    "/posts",
    (req, res) => {

        try {

            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit
                        ) || 50,
                        1
                    ),
                    200
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
                    offset,
                    true
                );

            res.json({
                success: true,
                posts
            });

        } catch (error) {

            console.error(
                "ADMIN POSTS:",
                error
            );

            res.status(500)
                .json({
                    success: false,
                    message:
                        "تعذر تحميل المنشورات."
                });
        }
    }
);


/* =========================================
   GET SINGLE POST
========================================= */

router.get(
    "/posts/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "رقم المنشور غير صحيح."
                });
        }

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
   EDIT POST
========================================= */

router.patch(
    "/posts/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const existing =
            getPost(id);

        if (!existing) {

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

            if (
                typeof req.body.title !==
                "string"
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "عنوان المنشور غير صحيح."
                    });
            }

            data.title =
                req.body.title
                    .trim()
                    .slice(
                        0,
                        200
                    );
        }


        if (
            req.body.description !==
            undefined
        ) {

            data.description =
                String(
                    req.body.description
                )
                .trim()
                .slice(
                    0,
                    5000
                );
        }


        if (
            req.body.media_url !==
            undefined
        ) {

            data.media_url =
                String(
                    req.body.media_url
                )
                .trim()
                .slice(
                    0,
                    2000
                );
        }


        if (
            req.body.thumbnail_url !==
            undefined
        ) {

            data.thumbnail_url =
                String(
                    req.body.thumbnail_url
                )
                .trim()
                .slice(
                    0,
                    2000
                );
        }


        if (
            req.body.media_type !==
            undefined
        ) {

            const type =
                String(
                    req.body.media_type
                )
                .trim()
                .toLowerCase();

            if (
                ![
                    "image",
                    "video"
                ].includes(type)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "نوع الملف غير صحيح."
                    });
            }

            data.media_type =
                type;
        }


        if (
            req.body.status !==
            undefined
        ) {

            const status =
                String(
                    req.body.status
                )
                .trim()
                .toLowerCase();

            if (
                ![
                    "published",
                    "draft",
                    "hidden"
                ].includes(status)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "حالة المنشور غير صحيحة."
                    });
            }

            data.status =
                status;
        }


        /*
         * OWNER CAN MANUALLY
         * CHANGE COUNTERS
         */

        if (
            req.body.views !==
            undefined
        ) {

            const views =
                Number(
                    req.body.views
                );

            if (
                !Number.isFinite(
                    views
                ) ||
                views < 0
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "عدد المشاهدات غير صحيح."
                    });
            }

            data.views =
                Math.floor(
                    views
                );
        }


        if (
            req.body.likes !==
            undefined
        ) {

            const likes =
                Number(
                    req.body.likes
                );

            if (
                !Number.isFinite(
                    likes
                ) ||
                likes < 0
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "عدد الإعجابات غير صحيح."
                    });
            }

            data.likes =
                Math.floor(
                    likes
                );
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
                "EDIT_POST",

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
            message:
                "تم تعديل المنشور.",
            post:
                updated
        });
    }
);


/* =========================================
   DELETE POST
========================================= */

router.delete(
    "/posts/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const existing =
            getPost(id);

        if (!existing) {

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
                existing.title
        });


        res.json({
            success: true,
            message:
                "تم حذف المنشور نهائياً."
        });
    }
);


/* =========================================
   COUPONS
========================================= */

router.get(
    "/coupons",
    (req, res) => {

        res.json({
            success: true,
            coupons:
                getCoupons()
        });
    }
);


/* =========================================
   CREATE COUPON
========================================= */

router.post(
    "/coupons",
    (req, res) => {

        const code =
            String(
                req.body.code || ""
            )
            .trim()
            .toUpperCase()
            .slice(
                0,
                50
            );

        const value =
            String(
                req.body.value || ""
            )
            .trim()
            .slice(
                0,
                100
            );

        const maxUses =
            Math.max(
                1,
                Math.floor(
                    Number(
                        req.body.max_uses
                    ) || 1
                )
            );


        if (!code) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "اكتب رمز القسيمة."
                });
        }


        if (!value) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "حدد قيمة القسيمة."
                });
        }


        try {

            const coupon =
                createCoupon(
                    code,
                    value,
                    maxUses,
                    req.body.expires_at ||
                    null
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

        } catch (error) {

            res.status(409)
                .json({
                    success: false,
                    message:
                        "هذه القسيمة موجودة بالفعل."
                });
        }
    }
);


/* =========================================
   DELETE COUPON
========================================= */

router.delete(
    "/coupons/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(id)
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "رقم القسيمة غير صحيح."
                });
        }


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

router.get(
    "/settings",
    (req, res) => {

        res.json({
            success: true,
            settings:
                getSettings()
        });
    }
);


/* =========================================
   UPDATE SITE SETTINGS
========================================= */

router.patch(
    "/settings",
    (req, res) => {

        const data = {};


        const textFields = [
            "site_name",
            "site_description",
            "logo_url",
            "favicon_url"
        ];


        textFields.forEach(
            field => {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    data[field] =
                        String(
                            req.body[field]
                        )
                        .trim()
                        .slice(
                            0,
                            2000
                        );
                }
            }
        );


        const colorFields = [
            "primary_color",
            "secondary_color",
            "background_color",
            "card_color",
            "text_color",
            "accent_color"
        ];


        colorFields.forEach(
            field => {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    const value =
                        String(
                            req.body[field]
                        )
                        .trim();

                    /*
                     * Allow HEX colors
                     */

                    if (
                        !/^#[0-9a-fA-F]{6}$/
                            .test(value)
                    ) {

                        return;
                    }

                    data[field] =
                        value;
                }
            }
        );


        const switches = [
            "allow_register",
            "allow_comments",
            "allow_likes",
            "show_videos",
            "show_images",
            "show_search",
            "show_community",
            "maintenance_mode"
        ];


        switches.forEach(
            field => {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    data[field] =
                        Boolean(
                            req.body[field]
                        )
                            ? 1
                            : 0;
                }
            }
        );


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

            targetId:
                null,

            details:
                JSON.stringify(
                    data
                )
        });


        res.json({
            success: true,
            message:
                "تم حفظ إعدادات الموقع.",
            settings
        });
    }
);


/* =========================================
   USERS
========================================= */

router.get(
    "/users",
    (req, res) => {

        const users =
            getUsers(
                200,
                0
            );


        res.json({
            success: true,
            users
        });
    }
);


/* =========================================
   GET USER
========================================= */

router.get(
    "/users/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        const user =
            getUserById(id);

        if (!user) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المستخدم غير موجود."
                });
        }


        res.json({
            success: true,

            user: {
                id:
                    user.id,

                username:
                    user.username,

                email:
                    user.email,

                role:
                    user.role,

                is_active:
                    user.is_active,

                created_at:
                    user.created_at
            }
        });
    }
);


/* =========================================
   ACTIVATE / DEACTIVATE USER
========================================= */

router.patch(
    "/users/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        /*
         * NEVER allow owner
         * account to be modified
         */

        if (
            id === 111111111
        ) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "لا يمكن تعديل حساب المالك من هذه الواجهة."
                });
        }


        const user =
            getUserById(id);

        if (!user) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المستخدم غير موجود."
                });
        }


        const data = {};


        if (
            req.body.is_active !==
            undefined
        ) {

            data.is_active =
                req.body.is_active
                    ? 1
                    : 0;
        }


        if (
            req.body.role !==
            undefined
        ) {

            const role =
                String(
                    req.body.role
                )
                .trim()
                .toLowerCase();


            if (
                ![
                    "user",
                    "admin"
                ].includes(role)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "صلاحية المستخدم غير صحيحة."
                    });
            }


            data.role =
                role;
        }


        const updated =
            updateUser(
                id,
                data
            );


        createAdminLog({

            adminId:
                req.user.id,

            action:
                "UPDATE_USER",

            targetType:
                "user",

            targetId:
                id,

            details:
                JSON.stringify(
                    data
                )
        });


        res.json({
            success: true,
            user:
                updated
        });
    }
);


/* =========================================
   DELETE USER
========================================= */

router.delete(
    "/users/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            id === 111111111
        ) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "لا يمكن حذف حساب المالك."
                });
        }


        const user =
            getUserById(id);


        if (!user) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "المستخدم غير موجود."
                });
        }


        deleteUser(id);


        createAdminLog({

            adminId:
                req.user.id,

            action:
                "DELETE_USER",

            targetType:
                "user",

            targetId:
                id,

            details:
                user.username
        });


        res.json({
            success: true,
            message:
                "تم حذف المستخدم."
        });
    }
);


/* =========================================
   ADMIN LOGS
========================================= */

router.get(
    "/logs",
    (req, res) => {

        const logs =
            getAdminLogs(
                500
            );

        res.json({
            success: true,
            logs
        });
    }
);


/* =========================================
   EXPORT
========================================= */

module.exports = router;
