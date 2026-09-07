const Database = require("better-sqlite3");
const path = require("path");

const dbPath =
    process.env.DATABASE_PATH ||
    path.join(__dirname, "anime-world.db");

const db = new Database(dbPath);


/* =========================================
   DATABASE SETTINGS
========================================= */

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


/* =========================================
   USERS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS users (

    id INTEGER PRIMARY KEY,

    username TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'user',

    avatar TEXT DEFAULT '',

    bio TEXT DEFAULT '',

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP

);
`);


/* =========================================
   POSTS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS posts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    title TEXT NOT NULL,

    description TEXT DEFAULT '',

    media_url TEXT NOT NULL,

    thumbnail_url TEXT DEFAULT '',

    media_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'published',

    views INTEGER NOT NULL DEFAULT 0,

    likes INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP,

    updated_at TEXT,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL

);
`);


/* =========================================
   POST LIKES
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS post_likes (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    post_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP,

    UNIQUE(post_id, user_id),

    FOREIGN KEY(post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

);
`);


/* =========================================
   POST VIEWS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS post_views (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    post_id INTEGER NOT NULL,

    user_id INTEGER,

    visitor_key TEXT,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP,

    FOREIGN KEY(post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE

);
`);


/* =========================================
   COUPONS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS coupons (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    code TEXT NOT NULL UNIQUE,

    value TEXT NOT NULL,

    max_uses INTEGER NOT NULL DEFAULT 1,

    used_count INTEGER NOT NULL DEFAULT 0,

    expires_at TEXT,

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP

);
`);


/* =========================================
   SITE SETTINGS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS settings (

    id INTEGER PRIMARY KEY CHECK(id = 1),

    site_name TEXT DEFAULT 'Anime World',

    site_description TEXT DEFAULT
        'عالم الأنمي الخاص بك',

    logo_url TEXT DEFAULT '',

    favicon_url TEXT DEFAULT '',

    primary_color TEXT DEFAULT '#657fff',

    secondary_color TEXT DEFAULT '#4057db',

    background_color TEXT DEFAULT '#070a14',

    card_color TEXT DEFAULT '#10162c',

    text_color TEXT DEFAULT '#ffffff',

    accent_color TEXT DEFAULT '#7690ff',

    allow_register INTEGER DEFAULT 1,

    allow_comments INTEGER DEFAULT 1,

    allow_likes INTEGER DEFAULT 1,

    show_videos INTEGER DEFAULT 1,

    show_images INTEGER DEFAULT 1,

    show_search INTEGER DEFAULT 1,

    show_community INTEGER DEFAULT 1,

    maintenance_mode INTEGER DEFAULT 0

);
`);


/* =========================================
   DEFAULT SETTINGS
========================================= */

const insertSettings =
    db.prepare(`
        INSERT OR IGNORE INTO settings
        (id)
        VALUES (1)
    `);

insertSettings.run();


/* =========================================
   COMMENTS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS comments (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    post_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    content TEXT NOT NULL,

    is_hidden INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP,

    updated_at TEXT,

    FOREIGN KEY(post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

);
`);


/* =========================================
   ADMIN LOGS
========================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS admin_logs (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_id INTEGER,

    action TEXT NOT NULL,

    target_type TEXT,

    target_id INTEGER,

    details TEXT,

    created_at TEXT NOT NULL DEFAULT
        CURRENT_TIMESTAMP,

    FOREIGN KEY(admin_id)
        REFERENCES users(id)
        ON DELETE SET NULL

);
`);


/* =========================================
   USERNAME
========================================= */

function getUserById(id) {

    return db
        .prepare(`
            SELECT *
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .get(id);
}


/* =========================================
   EMAIL
========================================= */

function getUserByEmail(email) {

    return db
        .prepare(`
            SELECT *
            FROM users
            WHERE LOWER(email) = LOWER(?)
            LIMIT 1
        `)
        .get(email);
}


/* =========================================
   CREATE USER
========================================= */

function createUser(data) {

    const id =
        data.id !== undefined
            ? Number(data.id)
            : undefined;

    const username =
        String(
            data.username || ""
        )
        .trim();

    const email =
        String(
            data.email || ""
        )
        .trim()
        .toLowerCase();

    const passwordHash =
        String(
            data.passwordHash || ""
        );

    const role =
        data.role === "owner"
            ? "owner"
            : data.role === "admin"
                ? "admin"
                : "user";


    if (!username) {
        throw new Error(
            "Username is required."
        );
    }

    if (!email) {
        throw new Error(
            "Email is required."
        );
    }

    if (!passwordHash) {
        throw new Error(
            "Password hash is required."
        );
    }


    let result;


    if (id !== undefined) {

        result =
            db.prepare(`
                INSERT INTO users
                (
                    id,
                    username,
                    email,
                    password_hash,
                    role
                )
                VALUES
                (?, ?, ?, ?, ?)
            `)
            .run(
                id,
                username,
                email,
                passwordHash,
                role
            );

    } else {

        result =
            db.prepare(`
                INSERT INTO users
                (
                    username,
                    email,
                    password_hash,
                    role
                )
                VALUES
                (?, ?, ?, ?)
            `)
            .run(
                username,
                email,
                passwordHash,
                role
            );

    }


    return getUserById(
        id !== undefined
            ? id
            : result.lastInsertRowid
    );
}


/* =========================================
   POSTS
========================================= */

function getPosts(
    limit = 50,
    offset = 0,
    includeHidden = false
) {

    limit =
        Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            200
        );

    offset =
        Math.max(
            Number(offset) || 0,
            0
        );


    if (includeHidden) {

        return db
            .prepare(`
                SELECT
                    posts.*,
                    users.username AS author_name
                FROM posts

                LEFT JOIN users
                    ON users.id = posts.user_id

                ORDER BY posts.id DESC

                LIMIT ?
                OFFSET ?
            `)
            .all(
                limit,
                offset
            );

    }


    return db
        .prepare(`
            SELECT
                posts.*,
                users.username AS author_name
            FROM posts

            LEFT JOIN users
                ON users.id = posts.user_id

            WHERE posts.status = 'published'

            ORDER BY posts.id DESC

            LIMIT ?
            OFFSET ?
        `)
        .all(
            limit,
            offset
        );
}


/* =========================================
   SINGLE POST
========================================= */

function getPost(id) {

    return db
        .prepare(`
            SELECT
                posts.*,
                users.username AS author_name
            FROM posts

            LEFT JOIN users
                ON users.id = posts.user_id

            WHERE posts.id = ?

            LIMIT 1
        `)
        .get(id);
}


/* =========================================
   CREATE POST
========================================= */

function createPost(data) {

    const result =
        db.prepare(`
            INSERT INTO posts
            (
                user_id,
                title,
                description,
                media_url,
                thumbnail_url,
                media_type,
                status
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(

            data.user_id || null,

            String(
                data.title || ""
            ).trim(),

            String(
                data.description || ""
            ).trim(),

            String(
                data.media_url || ""
            ).trim(),

            String(
                data.thumbnail_url || ""
            ).trim(),

            data.media_type === "video"
                ? "video"
                : "image",

            data.status === "draft"
                ? "draft"
                : data.status === "hidden"
                    ? "hidden"
                    : "published"

        );


    return getPost(
        result.lastInsertRowid
    );
}


/* =========================================
   UPDATE POST
========================================= */

function updatePost(
    id,
    data
) {

    const allowed = [

        "title",

        "description",

        "media_url",

        "thumbnail_url",

        "media_type",

        "status",

        "views",

        "likes"

    ];


    const fields = [];

    const values = [];


    for (
        const field of allowed
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    data,
                    field
                )
        ) {

            fields.push(
                `${field} = ?`
            );

            values.push(
                data[field]
            );

        }

    }


    if (
        fields.length === 0
    ) {

        return getPost(id);

    }


    fields.push(
        "updated_at = CURRENT_TIMESTAMP"
    );


    values.push(id);


    db.prepare(`
        UPDATE posts

        SET
            ${fields.join(", ")}

        WHERE id = ?
    `)
    .run(
        ...values
    );


    return getPost(id);
}


/* =========================================
   DELETE POST
========================================= */

function deletePost(id) {

    return db
        .prepare(`
            DELETE FROM posts
            WHERE id = ?
        `)
        .run(id);
}


/* =========================================
   COUPONS
========================================= */

function getCoupons() {

    return db
        .prepare(`
            SELECT *
            FROM coupons
            ORDER BY id DESC
        `)
        .all();
}


function createCoupon(
    code,
    value,
    maxUses,
    expiresAt = null
) {

    const result =
        db.prepare(`
            INSERT INTO coupons
            (
                code,
                value,
                max_uses,
                expires_at
            )
            VALUES
            (?, ?, ?, ?)
        `)
        .run(
            code,
            value,
            maxUses,
            expiresAt
        );


    return db
        .prepare(`
            SELECT *
            FROM coupons
            WHERE id = ?
        `)
        .get(
            result.lastInsertRowid
        );
}


function deleteCoupon(id) {

    return db
        .prepare(`
            DELETE FROM coupons
            WHERE id = ?
        `)
        .run(id);
}


/* =========================================
   SETTINGS
========================================= */

function getSettings() {

    return db
        .prepare(`
            SELECT *
            FROM settings
            WHERE id = 1
        `)
        .get();
}


function updateSettings(
    data
) {

    const allowed = [

        "site_name",

        "site_description",

        "logo_url",

        "favicon_url",

        "primary_color",

        "secondary_color",

        "background_color",

        "card_color",

        "text_color",

        "accent_color",

        "allow_register",

        "allow_comments",

        "allow_likes",

        "show_videos",

        "show_images",

        "show_search",

        "show_community",

        "maintenance_mode"

    ];


    const fields = [];

    const values = [];


    for (
        const field of allowed
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    data,
                    field
                )
        ) {

            fields.push(
                `${field} = ?`
            );

            values.push(
                data[field]
            );

        }

    }


    if (
        fields.length > 0
    ) {

        db.prepare(`
            UPDATE settings

            SET
                ${fields.join(", ")}

            WHERE id = 1
        `)
        .run(
            ...values
        );

    }


    return getSettings();
}


/* =========================================
   USERS
========================================= */

function getUsers(
    limit = 200,
    offset = 0
) {

    return db
        .prepare(`
            SELECT
                id,
                username,
                email,
                role,
                avatar,
                bio,
                is_active,
                created_at
            FROM users

            ORDER BY id DESC

            LIMIT ?
            OFFSET ?
        `)
        .all(
            limit,
            offset
        );
}


/* =========================================
   UPDATE USER
========================================= */

function updateUser(
    id,
    data
) {

    const allowed = [

        "username",

        "avatar",

        "bio",

        "role",

        "is_active"

    ];


    const fields = [];

    const values = [];


    for (
        const field of allowed
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    data,
                    field
                )
        ) {

            fields.push(
                `${field} = ?`
            );

            values.push(
                data[field]
            );

        }

    }


    if (
        fields.length === 0
    ) {

        return getUserById(id);

    }


    values.push(id);


    db.prepare(`
        UPDATE users

        SET
            ${fields.join(", ")}

        WHERE id = ?
    `)
    .run(
        ...values
    );


    return getUserById(id);
}


/* =========================================
   DELETE USER
========================================= */

function deleteUser(id) {

    return db
        .prepare(`
            DELETE FROM users
            WHERE id = ?
            AND id != 111111111
        `)
        .run(id);
}


/* =========================================
   DASHBOARD STATISTICS
========================================= */

function getDashboardStats() {

    const users =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM users
        `).get().count;


    const posts =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM posts
        `).get().count;


    const videos =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM posts
            WHERE media_type = 'video'
        `).get().count;


    const images =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM posts
            WHERE media_type = 'image'
        `).get().count;


    const likes =
        db.prepare(`
            SELECT COALESCE(
                SUM(likes),
                0
            ) AS total
            FROM posts
        `).get().total;


    const views =
        db.prepare(`
            SELECT COALESCE(
                SUM(views),
                0
            ) AS total
            FROM posts
        `).get().total;


    const coupons =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM coupons
            WHERE is_active = 1
        `).get().count;


    const comments =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM comments
        `).get().count;


    return {

        users,

        posts,

        videos,

        images,

        likes,

        views,

        coupons,

        comments

    };
}


/* =========================================
   ADMIN LOG
========================================= */

function createAdminLog(
    data
) {

    return db.prepare(`
        INSERT INTO admin_logs
        (
            admin_id,
            action,
            target_type,
            target_id,
            details
        )
        VALUES
        (?, ?, ?, ?, ?)
    `)
    .run(

        data.adminId || null,

        data.action || "",

        data.targetType || null,

        data.targetId || null,

        data.details || null

    );
}


function getAdminLogs(
    limit = 500
) {

    return db
        .prepare(`
            SELECT
                admin_logs.*,

                users.username
                    AS admin_name

            FROM admin_logs

            LEFT JOIN users
                ON users.id =
                    admin_logs.admin_id

            ORDER BY
                admin_logs.id DESC

            LIMIT ?
        `)
        .all(
            limit
        );
}


/* =========================================
   LIKE POST
========================================= */

function likePost(
    postId,
    userId
) {

    try {

        db.prepare(`
            INSERT INTO post_likes
            (
                post_id,
                user_id
            )
            VALUES
            (?, ?)
        `)
        .run(
            postId,
            userId
        );


        db.prepare(`
            UPDATE posts

            SET likes =
                likes + 1

            WHERE id = ?
        `)
        .run(
            postId
        );


        return true;

    } catch {

        return false;

    }
}


/* =========================================
   UNLIKE POST
========================================= */

function unlikePost(
    postId,
    userId
) {

    const result =
        db.prepare(`
            DELETE FROM post_likes

            WHERE
                post_id = ?
                AND user_id = ?
        `)
        .run(
            postId,
            userId
        );


    if (
        result.changes > 0
    ) {

        db.prepare(`
            UPDATE posts

            SET likes =
                CASE
                    WHEN likes > 0
                    THEN likes - 1
                    ELSE 0
                END

            WHERE id = ?
        `)
        .run(
            postId
        );


        return true;
    }


    return false;
}


/* =========================================
   VIEW POST
========================================= */

function addView(
    postId,
    userId = null,
    visitorKey = null
) {

    db.prepare(`
        INSERT INTO post_views
        (
            post_id,
            user_id,
            visitor_key
        )
        VALUES
        (?, ?, ?)
    `)
    .run(
        postId,
        userId,
        visitorKey
    );


    db.prepare(`
        UPDATE posts

        SET views =
            views + 1

        WHERE id = ?
    `)
    .run(
        postId
    );


    return true;
}


/* =========================================
   EXPORTS
========================================= */

module.exports = {

    db,

    getUserById,

    getUserByEmail,

    createUser,

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

    getAdminLogs,

    likePost,

    unlikePost,

    addView

};
