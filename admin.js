const express = require("express");

const router = express.Router();

const {
    authenticate
} = require("./auth");

const {
    getUserById,
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getCoupons,
    createCoupon,
    deleteCoupon,
    getSettings,
    updateSettings,
    getUsers,
    updateUser,
    deleteUser,
    getDashboardStats,
    createAdminLog,
    getAdminLogs
} = require("./database");


/* =========================================
   OWNER ONLY MIDDLEWARE
========================================= */

function ownerOnly(req, res, next) {

    if (!req.user) {

        return res.status(401).json({

            success: false,

            message:
                "يجب تسجيل الدخول."

        });

    }


    if (
        Number(req.user.id) !==
        111111111
    ) {

        return res.status(403).json({

            success: false,

            message:
                "ليس لديك صلاحية دخول لوحة المشرف."

        });

    }


    if (
        req.user.role !== "owner"
    ) {

        return res.status(403).json({

            success: false,

            message:
                "هذه العملية متاحة لمالك الموقع فقط."

        });

    }


    next();

}


/* =========================================
   PROTECT ALL ADMIN API
========================================= */

router.use(
    authenticate(getUserById)
);

router.use(
    ownerOnly
);


/* =========================================
   ADMIN PROFILE
========================================= */

router.get(
    "/profile",
    (req, res) => {

        res.json({

            success: true,

            admin: {

                id:
                    req.user.id,

                username:
                    req.user.username,

                email:
                    req.user.email,

                role:
                    req.user.role

            }

        });

    }
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

                stats

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تحميل الإحصائيات."

            });

        }

    }
);


/* =========================================
   POSTS
========================================= */

router.get(
    "/posts",
    (req, res) => {

        try {

            const posts =
                getPosts(
                    req.query.limit || 100,
                    req.query.offset || 0,
                    true
                );


            res.json({

                success: true,

                posts

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تحميل المنشورات."

            });

        }

    }
);


/* =========================================
   CREATE POST
========================================= */

router.post(
    "/posts",
    (req, res) => {

        try {

            const post =
                createPost({

                    user_id:
                        req.user.id,

                    title:
                        req.body.title,

                    description:
                        req.body.description,

                    media_url:
                        req.body.media_url,

                    thumbnail_url:
                        req.body.thumbnail_url,

                    media_type:
                        req.body.media_type,

                    status:
                        req.body.status

                });


            createAdminLog({

                adminId:
                    req.user.id,

                action:
                    "create_post",

                targetType:
                    "post",

                targetId:
                    post.id,

                details:
                    JSON.stringify({
                        title:
                            post.title
                    })

            });


            res.status(201).json({

                success: true,

                post

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر إنشاء المنشور."

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

        const post =
            getPost(
                Number(
                    req.params.id
                )
            );


        if (!post) {

            return res.status(404).json({

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

        try {

            const id =
                Number(
                    req.params.id
                );


            const oldPost =
                getPost(id);


            if (!oldPost) {

                return res.status(404).json({

                    success: false,

                    message:
                        "المنشور غير موجود."

                });

            }


            const post =
                updatePost(
                    id,
                    req.body
                );


            createAdminLog({

                adminId:
                    req.user.id,

                action:
                    "update_post",

                targetType:
                    "post",

                targetId:
                    id,

                details:
                    JSON.stringify(
                        req.body
                    )

            });


            res.json({

                success: true,

                post

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تعديل المنشور."

            });

        }

    }
);


/* =========================================
   DELETE POST
========================================= */

router.delete(
    "/posts/:id",
    (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            const post =
                getPost(id);


            if (!post) {

                return res.status(404).json({

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
                    "delete_post",

                targetType:
                    "post",

                targetId:
                    id,

                details:
                    JSON.stringify({
                        title:
                            post.title
                    })

            });


            res.json({

                success: true,

                message:
                    "تم حذف المنشور."

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر حذف المنشور."

            });

        }

    }
);


/* =========================================
   MANUALLY CHANGE LIKES / VIEWS
========================================= */

router.patch(
    "/posts/:id/stats",
    (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            const post =
                getPost(id);


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "المنشور غير موجود."

                });

            }


            const likes =
                Math.max(
                    0,
                    Number(
                        req.body.likes
                    )
                );


            const views =
                Math.max(
                    0,
                    Number(
                        req.body.views
                    )
                );


            const updated =
                updatePost(

                    id,

                    {

                        likes,

                        views

                    }

                );


            createAdminLog({

                adminId:
                    req.user.id,

                action:
                    "change_post_stats",

                targetType:
                    "post",

                targetId:
                    id,

                details:
                    JSON.stringify({

                        oldLikes:
                            post.likes,

                        newLikes:
                            likes,

                        oldViews:
                            post.views,

                        newViews:
                            views

                    })

            });


            res.json({

                success: true,

                post:
                    updated

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تعديل الإحصائيات."

            });

        }

    }
);


/* =========================================
   USERS
========================================= */

router.get(
    "/users",
    (req, res) => {

        try {

            const users =
                getUsers(
                    req.query.limit || 200,
                    req.query.offset || 0
                );


            res.json({

                success: true,

                users

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تحميل المستخدمين."

            });

        }

    }
);


/* =========================================
   UPDATE USER
========================================= */

router.patch(
    "/users/:id",
    (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                id === 111111111
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "لا يمكن تعديل حساب مالك الموقع من هذه العملية."

                });

            }


            const user =
                updateUser(
                    id,
                    req.body
                );


            createAdminLog({

                adminId:
                    req.user.id,

                action:
                    "update_user",

                targetType:
                    "user",

                targetId:
                    id,

                details:
                    JSON.stringify(
                        req.body
                    )

            });


            res.json({

                success: true,

                user

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر تعديل المستخدم."

            });

        }

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

            return res.status(403).json({

                success: false,

                message:
                    "لا يمكن حذف مالك الموقع."

            });

        }


        deleteUser(id);


        createAdminLog({

            adminId:
                req.user.id,

            action:
                "delete_user",

            targetType:
                "user",

            targetId:
                id

        });


        res.json({

            success: true,

            message:
                "تم حذف المستخدم."

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

        try {

            const code =
                String(
                    req.body.code || ""
                )
                .trim()
                .toUpperCase();


            const value =
                String(
                    req.body.value || ""
                )
                .trim();


            const maxUses =
                Math.max(
                    1,
                    Number(
                        req.body.maxUses || 1
                    )
                );


            const expiresAt =
                req.body.expiresAt ||
                null;


            if (!code) {

                return res.status(400).json({

                    success: false,

                    message:
                        "أدخل كود القسيمة."

                });

            }


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
                    "create_coupon",

                targetType:
                    "coupon",

                targetId:
                    coupon.id,

                details:
                    JSON.stringify({
                        code
                    })

            });


            res.status(201).json({

                success: true,

                coupon

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر إنشاء القسيمة."

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


        deleteCoupon(id);


        createAdminLog({

            adminId:
                req.user.id,

            action:
                "delete_coupon",

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

        try {

            const settings =
                updateSettings(
                    req.body
                );


            createAdminLog({

                adminId:
                    req.user.id,

                action:
                    "update_settings",

                targetType:
                    "settings",

                details:
                    JSON.stringify(
                        req.body
                    )

            });


            res.json({

                success: true,

                settings

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "تعذر حفظ إعدادات الموقع."

            });

        }

    }
);


/* =========================================
   ADMIN LOGS
========================================= */

router.get(
    "/logs",
    (req, res) => {

        res.json({

            success: true,

            logs:
                getAdminLogs(
                    500
                )

        });

    }
);


/* =========================================
   ADMIN TEST
========================================= */

router.get(
    "/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Admin API is working.",

            ownerId:
                req.user.id

        });

    }
);


/* =========================================
   EXPORT
========================================= */

module.exports = router;
