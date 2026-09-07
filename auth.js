const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const OWNER_ID = 111111111;

/* =========================================
   JWT SECRET
========================================= */

function getSecret() {

    const secret =
        process.env.JWT_SECRET;

    if (
        typeof secret !== "string" ||
        secret.length < 32
    ) {
        throw new Error(
            "JWT_SECRET must be configured in .env and contain at least 32 characters."
        );
    }

    return secret;
}


/* =========================================
   PASSWORD
========================================= */

async function hashPassword(password) {

    if (
        typeof password !== "string" ||
        password.length < 8
    ) {
        throw new Error(
            "Password must contain at least 8 characters."
        );
    }

    return bcrypt.hash(
        password,
        12
    );
}


async function comparePassword(
    password,
    passwordHash
) {

    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string"
    ) {
        return false;
    }

    return bcrypt.compare(
        password,
        passwordHash
    );
}


/* =========================================
   TOKEN
========================================= */

function createAuthToken(user) {

    if (!user || !user.id) {
        throw new Error(
            "Invalid user."
        );
    }

    return jwt.sign(

        {
            id:
                Number(user.id),

            username:
                user.username,

            role:
                user.role
        },

        getSecret(),

        {
            expiresIn: "7d",
            issuer: "anime-world",
            audience: "anime-world-users"
        }

    );
}


function verifyAuthToken(token) {

    if (
        !token ||
        typeof token !== "string"
    ) {
        return null;
    }

    try {

        return jwt.verify(

            token,

            getSecret(),

            {
                issuer:
                    "anime-world",

                audience:
                    "anime-world-users"
            }

        );

    } catch {

        return null;
    }
}


/* =========================================
   OWNER
========================================= */

function isOwner(user) {

    if (!user) {
        return false;
    }

    return (

        Number(user.id) ===
        OWNER_ID

        &&

        user.role ===
        "owner"

    );
}


function isAdmin(user) {

    if (!user) {
        return false;
    }

    return (

        user.role ===
        "admin"

        ||

        isOwner(user)

    );
}


/* =========================================
   PERMISSIONS
========================================= */

function canManagePosts(user) {

    return isAdmin(user);

}


function canManageUsers(user) {

    return isOwner(user);

}


function canManageSettings(user) {

    return isOwner(user);

}


function canManageCoupons(user) {

    return isOwner(user);

}


function canViewAdminPanel(user) {

    return isOwner(user);

}


/* =========================================
   TOKEN FROM REQUEST
========================================= */

function getBearerToken(req) {

    if (!req) {
        return null;
    }

    const header =
        req.headers &&
        req.headers.authorization;

    if (
        typeof header !== "string"
    ) {
        return null;
    }

    if (
        !header.startsWith(
            "Bearer "
        )
    ) {
        return null;
    }

    const token =
        header
            .substring(7)
            .trim();

    if (!token) {
        return null;
    }

    return token;
}


/* =========================================
   AUTHENTICATION MIDDLEWARE
========================================= */

function authenticate(
    getUserById
) {

    return function (
        req,
        res,
        next
    ) {

        const token =
            getBearerToken(req);

        if (!token) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

        }


        const payload =
            verifyAuthToken(
                token
            );

        if (!payload) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    message:
                        "Invalid or expired session."

                });

        }


        const user =
            getUserById(
                Number(
                    payload.id
                )
            );

        if (!user) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    message:
                        "User account not found."

                });

        }


        if (
            Number(user.id) !==
            Number(payload.id)
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    message:
                        "Session verification failed."

                });

        }


        if (
            Number(
                user.is_active
            ) !== 1
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    message:
                        "This account is disabled."

                });

        }


        req.user =
            user;

        next();

    };
}


/* =========================================
   OWNER ONLY
========================================= */

function ownerOnly() {

    return function (
        req,
        res,
        next
    ) {

        if (
            !isOwner(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    message:
                        "Owner access required."

                });

        }

        next();

    };
}


/* =========================================
   ADMIN ONLY
========================================= */

function adminOnly() {

    return function (
        req,
        res,
        next
    ) {

        if (
            !isAdmin(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    message:
                        "Administrator access required."

                });

        }

        next();

    };
}


/* =========================================
   PUBLIC USER
========================================= */

function publicUser(user) {

    if (!user) {
        return null;
    }

    return {

        id:
            Number(user.id),

        username:
            user.username,

        email:
            user.email,

        role:
            user.role,

        avatar:
            user.avatar || "",

        bio:
            user.bio || "",

        created_at:
            user.created_at

    };
}


/* =========================================
   EXPORTS
========================================= */

module.exports = {

    OWNER_ID,

    hashPassword,

    comparePassword,

    createAuthToken,

    verifyAuthToken,

    isOwner,

    isAdmin,

    canManagePosts,

    canManageUsers,

    canManageSettings,

    canManageCoupons,

    canViewAdminPanel,

    getBearerToken,

    authenticate,

    ownerOnly,

    adminOnly,

    publicUser

};
