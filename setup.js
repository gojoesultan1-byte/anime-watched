require("dotenv").config();

const {
    db,
    getUserById,
    getUserByEmail,
    createUser
} = require("./database");

const {
    hashPassword
} = require("./auth");


/* =========================================
   OWNER CONFIGURATION
========================================= */

const OWNER_ID = 111111111;

const OWNER_EMAIL =
    process.env.OWNER_EMAIL;

const OWNER_PASSWORD =
    process.env.OWNER_PASSWORD;

const OWNER_USERNAME =
    process.env.OWNER_USERNAME ||
    "Gojo Esultan";


/* =========================================
   VALIDATE ENVIRONMENT
========================================= */

if (
    !OWNER_EMAIL ||
    !OWNER_PASSWORD
) {

    console.error(
        "OWNER_EMAIL and OWNER_PASSWORD are required."
    );

    process.exit(1);

}


/* =========================================
   CHECK OWNER ID
========================================= */

const ownerById =
    getUserById(
        OWNER_ID
    );


/* =========================================
   CHECK OWNER EMAIL
========================================= */

const ownerByEmail =
    getUserByEmail(
        OWNER_EMAIL
    );


/* =========================================
   PREVENT ACCOUNT CONFLICT
========================================= */

if (
    ownerByEmail &&
    Number(ownerByEmail.id) !== OWNER_ID
) {

    console.error(
        "The owner email is already assigned to another account."
    );

    process.exit(1);

}


/* =========================================
   CREATE OWNER
========================================= */

async function setupOwner() {

    try {

        const passwordHash =
            await hashPassword(
                OWNER_PASSWORD
            );


        if (!ownerById) {

            createUser({

                id:
                    OWNER_ID,

                username:
                    OWNER_USERNAME,

                email:
                    OWNER_EMAIL,

                passwordHash,

                role:
                    "owner"

            });


            console.log(
                "Owner account created successfully."
            );

        } else {

            /*
             * Make sure the reserved owner
             * account always has owner privileges.
             */

            db.prepare(`
                UPDATE users

                SET
                    email = ?,
                    username = ?,
                    password_hash = ?,
                    role = 'owner',
                    is_active = 1

                WHERE id = ?
            `)
            .run(

                OWNER_EMAIL,

                OWNER_USERNAME,

                passwordHash,

                OWNER_ID

            );


            console.log(
                "Owner account updated successfully."
            );

        }


        /* =====================================
           VERIFY OWNER
        ===================================== */

        const owner =
            getUserById(
                OWNER_ID
            );


        if (
            !owner ||
            Number(owner.id) !== OWNER_ID ||
            owner.role !== "owner"
        ) {

            throw new Error(
                "Owner verification failed."
            );

        }


        console.log(
            "================================"
        );

        console.log(
            "ANIME WORLD OWNER"
        );

        console.log(
            "================================"
        );

        console.log(
            `ID: ${owner.id}`
        );

        console.log(
            `Email: ${owner.email}`
        );

        console.log(
            `Role: ${owner.role}`
        );

        console.log(
            "================================"
        );


        process.exit(0);

    } catch (error) {

        console.error(
            "OWNER SETUP ERROR:"
        );

        console.error(
            error.message
        );

        process.exit(1);

    }

}


setupOwner();
