require("dotenv").config();

const bcrypt = require("bcryptjs");

const {
    getUserById,
    getUserByEmail,
    createUser
} = require("./database");

const OWNER_ID = 111111111;

const OWNER_EMAIL =
    process.env.OWNER_EMAIL;

const OWNER_PASSWORD =
    process.env.OWNER_PASSWORD;

async function setupOwner() {

    if (!OWNER_EMAIL) {
        console.error(
            "OWNER_EMAIL is missing."
        );
        process.exit(1);
    }

    if (!OWNER_PASSWORD) {
        console.error(
            "OWNER_PASSWORD is missing."
        );
        process.exit(1);
    }

    const existingById =
        getUserById(
            OWNER_ID
        );

    if (existingById) {

        console.log(
            "Owner account already exists."
        );

        console.log(
            `Owner ID: ${OWNER_ID}`
        );

        return;
    }

    const existingByEmail =
        getUserByEmail(
            OWNER_EMAIL
        );

    if (existingByEmail) {

        console.error(
            "This email is already registered."
        );

        process.exit(1);
    }

    const passwordHash =
        await bcrypt.hash(
            OWNER_PASSWORD,
            12
        );

    const owner =
        createUser({
            username:
                "Gojo Esultan",

            email:
                OWNER_EMAIL,

            passwordHash,

            role:
                "owner"
        });

    console.log(
        "================================"
    );

    console.log(
        "OWNER ACCOUNT CREATED"
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
        "Password stored as a secure hash."
    );

    console.log(
        "================================"
    );
}

setupOwner()
    .catch(error => {

        console.error(
            "SETUP ERROR:",
            error
        );

        process.exit(1);

    });
