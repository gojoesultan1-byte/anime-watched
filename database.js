const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "anime_world.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    media_type TEXT NOT NULL,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER NOT NULL,
    ip_hash TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    site_name TEXT NOT NULL DEFAULT 'Anime World',
    primary_color TEXT NOT NULL DEFAULT '#7c3aed',
    secondary_color TEXT NOT NULL DEFAULT '#a855f7',
    background_color TEXT NOT NULL DEFAULT '#07070b',
    card_color TEXT NOT NULL DEFAULT '#101017',
    show_search INTEGER NOT NULL DEFAULT 1,
    show_videos INTEGER NOT NULL DEFAULT 1,
    show_images INTEGER NOT NULL DEFAULT 1,
    show_community INTEGER NOT NULL DEFAULT 1,
    allow_register INTEGER NOT NULL DEFAULT 1,
    allow_comments INTEGER NOT NULL DEFAULT 1,
    allow_likes INTEGER NOT NULL DEFAULT 1,
    maintenance_mode INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT DEFAULT '',
    target_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user
ON posts(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_status
ON posts(status);

CREATE INDEX IF NOT EXISTS idx_posts_created
ON posts(created_at);

CREATE INDEX IF NOT EXISTS idx_likes_post
ON likes(post_id);

CREATE INDEX IF NOT EXISTS idx_views_post
ON views(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_post
ON comments(post_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin
ON admin_logs(admin_id);
`);

const existingSettings = db
    .prepare("SELECT id FROM site_settings WHERE id = 1")
    .get();

if (!existingSettings) {
    db.prepare(`
        INSERT INTO site_settings (
            id,
            site_name
        )
        VALUES (
            1,
            ?
        )
    `).run("Anime World");
}

function generateUserId() {
    let id;

    do {
        id = Math.floor(
            100000000 +
            Math.random() * 900000000
        );
    } while (
        db
            .prepare(
                "SELECT id FROM users WHERE id = ?"
            )
            .get(id)
    );

    return id;
}

function createUser({
    username,
    email,
    passwordHash,
    role = "user"
}) {
    const id =
        role === "owner"
            ? 111111111
            : generateUserId();

    const statement = db.prepare(`
        INSERT INTO users (
            id,
            username,
            email,
            password_hash,
            role
        )
        VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
        )
    `);

    statement.run(
        id,
        username,
        email,
        passwordHash,
        role
    );

    return db
        .prepare(
            "SELECT id, username, email, role FROM users WHERE id = ?"
        )
        .get(id);
}

function getUserById(id) {
    return db
        .prepare(
            "SELECT * FROM users WHERE id = ?"
        )
        .get(id);
}

function getUserByEmail(email) {
    return db
        .prepare(
            "SELECT * FROM users WHERE email = ?"
        )
        .get(email);
}

function createPost(data) {
    const result = db.prepare(`
        INSERT INTO posts (
            user_id,
            title,
            description,
            media_type,
            media_url,
            thumbnail_url
        )
        VALUES (
            @user_id,
            @title,
            @description,
            @media_type,
            @media_url,
            @thumbnail_url
        )
    `).run({
        user_id: data.user_id,
        title: data.title,
        description: data.description || "",
        media_type: data.media_type,
        media_url: data.media_url,
        thumbnail_url: data.thumbnail_url || ""
    });

    return db
        .prepare(
            "SELECT * FROM posts WHERE id = ?"
        )
        .get(result.lastInsertRowid);
}

function getPost(id) {
    return db
        .prepare(
            "SELECT * FROM posts WHERE id = ?"
        )
        .get(id);
}

function getPosts(limit = 50, offset = 0) {
    return db
        .prepare(`
            SELECT
                posts.*,
                users.username,
                users.avatar
            FROM posts
            JOIN users
                ON users.id = posts.user_id
            WHERE posts.status = 'published'
            ORDER BY posts.created_at DESC
            LIMIT ?
            OFFSET ?
        `)
        .all(limit, offset);
}

function updatePost(id, data) {
    db.prepare(`
        UPDATE posts
        SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            media_type = COALESCE(?, media_type),
            media_url = COALESCE(?, media_url),
            thumbnail_url = COALESCE(?, thumbnail_url),
            views = COALESCE(?, views),
            likes = COALESCE(?, likes),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        data.title ?? null,
        data.description ?? null,
        data.media_type ?? null,
        data.media_url ?? null,
        data.thumbnail_url ?? null,
        data.views ?? null,
        data.likes ?? null,
        data.status ?? null,
        id
    );

    return getPost(id);
}

function deletePost(id) {
    return db
        .prepare(
            "DELETE FROM posts WHERE id = ?"
        )
        .run(id);
}

function addView({
    userId = null,
    postId,
    ipHash = ""
}) {
    const transaction = db.transaction(() => {

        db.prepare(`
            INSERT INTO views (
                user_id,
                post_id,
                ip_hash
            )
            VALUES (?, ?, ?)
        `).run(
            userId,
            postId,
            ipHash
        );

        db.prepare(`
            UPDATE posts
            SET views = views + 1
            WHERE id = ?
        `).run(postId);
    });

    transaction();
}

function likePost(userId, postId) {

    const transaction = db.transaction(() => {

        const exists = db
            .prepare(`
                SELECT id
                FROM likes
                WHERE user_id = ?
                AND post_id = ?
            `)
            .get(
                userId,
                postId
            );

        if (exists) {
            return false;
        }

        db.prepare(`
            INSERT INTO likes (
                user_id,
                post_id
            )
            VALUES (?, ?)
        `).run(
            userId,
            postId
        );

        db.prepare(`
            UPDATE posts
            SET likes = likes + 1
            WHERE id = ?
        `).run(postId);

        return true;
    });

    return transaction();
}

function unlikePost(userId, postId) {

    const transaction = db.transaction(() => {

        const result = db
            .prepare(`
                DELETE FROM likes
                WHERE user_id = ?
                AND post_id = ?
            `)
            .run(
                userId,
                postId
            );

        if (result.changes === 0) {
            return false;
        }

        db.prepare(`
            UPDATE posts
            SET likes =
                CASE
                    WHEN likes > 0
                    THEN likes - 1
                    ELSE 0
                END
            WHERE id = ?
        `).run(postId);

        return true;
    });

    return transaction();
}

function addComment(
    userId,
    postId,
    content
) {

    const result = db.prepare(`
        INSERT INTO comments (
            user_id,
            post_id,
            content
        )
        VALUES (?, ?, ?)
    `).run(
        userId,
        postId,
        content
    );

    db.prepare(`
        UPDATE posts
        SET comments_count =
            comments_count + 1
        WHERE id = ?
    `).run(postId);

    return db
        .prepare(
            "SELECT * FROM comments WHERE id = ?"
        )
        .get(result.lastInsertRowid);
}

function getComments(
    postId,
    limit = 100
) {

    return db
        .prepare(`
            SELECT
                comments.*,
                users.username,
                users.avatar
            FROM comments
            JOIN users
                ON users.id = comments.user_id
            WHERE comments.post_id = ?
            AND comments.is_deleted = 0
            ORDER BY comments.created_at DESC
            LIMIT ?
        `)
        .all(
            postId,
            limit
        );
}

function createCoupon(
    code,
    value,
    maxUses = 1,
    expiresAt = null
) {

    const result = db.prepare(`
        INSERT INTO coupons (
            code,
            value,
            max_uses,
            expires_at
        )
        VALUES (?, ?, ?, ?)
    `).run(
        code.toUpperCase(),
        value,
        maxUses,
        expiresAt
    );

    return db
        .prepare(
            "SELECT * FROM coupons WHERE id = ?"
        )
        .get(result.lastInsertRowid);
}

function deleteCoupon(id) {
    return db
        .prepare(
            "DELETE FROM coupons WHERE id = ?"
        )
        .run(id);
}

function getCoupons() {
    return db
        .prepare(`
            SELECT *
            FROM coupons
            ORDER BY created_at DESC
        `)
        .all();
}

function getSettings() {
    return db
        .prepare(
            "SELECT * FROM site_settings WHERE id = 1"
        )
        .get();
}

function updateSettings(data) {

    db.prepare(`
        UPDATE site_settings
        SET
            site_name = COALESCE(?, site_name),
            primary_color = COALESCE(?, primary_color),
            secondary_color = COALESCE(?, secondary_color),
            background_color = COALESCE(?, background_color),
            card_color = COALESCE(?, card_color),
            show_search = COALESCE(?, show_search),
            show_videos = COALESCE(?, show_videos),
            show_images = COALESCE(?, show_images),
            show_community = COALESCE(?, show_community),
            allow_register = COALESCE(?, allow_register),
            allow_comments = COALESCE(?, allow_comments),
            allow_likes = COALESCE(?, allow_likes),
            maintenance_mode = COALESCE(?, maintenance_mode)
        WHERE id = 1
    `).run(
        data.site_name ?? null,
        data.primary_color ?? null,
        data.secondary_color ?? null,
        data.background_color ?? null,
        data.card_color ?? null,
        data.show_search ?? null,
        data.show_videos ?? null,
        data.show_images ?? null,
        data.show_community ?? null,
        data.allow_register ?? null,
        data.allow_comments ?? null,
        data.allow_likes ?? null,
        data.maintenance_mode ?? null
    );

    return getSettings();
}

function createAdminLog({
    adminId,
    action,
    targetType = "",
    targetId = "",
    details = ""
}) {

    db.prepare(`
        INSERT INTO admin_logs (
            admin_id,
            action,
            target_type,
            target_id,
            details
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        adminId,
        action,
        targetType,
        String(targetId),
        details
    );
}

function getDashboardStats() {

    const users =
        db
            .prepare(
                "SELECT COUNT(*) AS count FROM users"
            )
            .get().count;

    const posts =
        db
            .prepare(
                "SELECT COUNT(*) AS count FROM posts"
            )
            .get().count;

    const views =
        db
            .prepare(
                "SELECT COALESCE(SUM(views),0) AS count FROM posts"
            )
            .get().count;

    const likes =
        db
            .prepare(
                "SELECT COALESCE(SUM(likes),0) AS count FROM posts"
            )
            .get().count;

    const comments =
        db
            .prepare(
                "SELECT COALESCE(SUM(comments_count),0) AS count FROM posts"
            )
            .get().count;

    return {
        users,
        posts,
        views,
        likes,
        comments
    };
}

module.exports = {
    db,
    generateUserId,
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
};
