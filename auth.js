const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const OWNER_ID = 111111111;

function getSecret() {
    return (
        process.env.JWT_SECRET ||
        "CHANGE_THIS_SECRET_IN_ENV"
    );
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

    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        getSecret(),
        {
            expiresIn: "7d"
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
            getSecret()
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
        Number(user.id) === OWNER_ID &&
        user.role === "owner"
    );
}


function isAdmin(user) {

    if (!user) {
        return false;
    }

    return (
        user.role === "admin" ||
        isOwner(user)
    );
}


/* =========================================
   AUTHORIZATION
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
   REQUEST TOKEN
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

    return header.substring(7).trim();
}


/* =========================================
   MIDDLEWARE
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
                    success: false,
                    message:
                        "Authentication required."
                });
        }

        const payload =
            verifyAuthToken(token);

        if (!payload) {

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Invalid or expired session."
                });
        }

        const user =
            getUserById(
                payload.id
            );

        if (!user) {

            return res
                .status(401)
                .json({
                    success: false,
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
                    success: false,
                    message:
                        "Session verification failed."
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
                        "This account is disabled."
                });
        }

        req.user = user;

        next();
    };
}


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
                    success: false,
                    message:
                        "Owner access required."
                });
        }

        next();
    };
}


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
                    success: false,
                    message:
                        "Administrator access required."
                });
        }

        next();
    };
}


/* =========================================
   PUBLIC USER OBJECT
========================================= */

function publicUser(user) {

    if (!user) {
        return null;
    }

    return {
        id:
            user.id,

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
