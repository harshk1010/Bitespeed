const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const app = express();

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

app.use(express.json());
app.use(bodyParser.json());


const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.NEWAWSENDPOINT,
  user: "admin",
  password: process.env.AWSPASSWORD,
  database: "bitespeeddb",
  port: "3306",
  connectTimeout: 15000,
});

pool.getConnection((err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    process.exit(1);
  }
  console.log("MySQL Connected");
});


app.get("/", (req, res) => {
  res.send("BiteSpeed Identity Reconciliation API");
});


app.post("/identify", (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ error: "Either email or phoneNumber must be provided" });
  }

  const findQuery =
    "SELECT * FROM bitespeed WHERE email=? OR phoneNumber=?";

  pool.query(findQuery, [email, phoneNumber], (err, contacts) => {
    if (err) return res.status(500).json({ error: err });


    if (contacts.length === 0) {
      const insertPrimary = `
        INSERT INTO bitespeed 
        (email, phoneNumber, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, 'primary', NOW(), NOW())
      `;

      pool.query(insertPrimary, [email, phoneNumber], (err, result) => {
        if (err) return res.status(500).json({ error: err });

        return res.json({
          contact: {
            primaryContatctId: result.insertId,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: [],
          },
        });
      });

      return;
    }


    let primaryContacts = contacts.filter(
      (c) => c.linkPrecedence === "primary"
    );

    let primary = primaryContacts.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    )[0];

    let primaryId = primary.id;

    primaryContacts.forEach((contact) => {
      if (contact.id !== primaryId) {
        const updateQuery = `
          UPDATE bitespeed
          SET linkPrecedence='secondary', linkedId=?
          WHERE id=?
        `;

        pool.query(updateQuery, [primaryId, contact.id]);
      }
    });


    const duplicate = contacts.find(
      (c) => c.email === email && c.phoneNumber === phoneNumber
    );

    if (!duplicate) {
      const insertSecondary = `
        INSERT INTO bitespeed
        (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, ?, 'secondary', NOW(), NOW())
      `;

      pool.query(insertSecondary, [email, phoneNumber, primaryId]);
    }

    const fetchAll = `
      SELECT * FROM bitespeed
      WHERE id=? OR linkedId=?
    `;

    pool.query(fetchAll, [primaryId, primaryId], (err, allContacts) => {
      if (err) return res.status(500).json({ error: err });

      const emails = [
        ...new Set(allContacts.map((c) => c.email).filter(Boolean)),
      ];

      const phones = [
        ...new Set(allContacts.map((c) => c.phoneNumber).filter(Boolean)),
      ];

      const secondaryIds = allContacts
        .filter((c) => c.linkPrecedence === "secondary")
        .map((c) => c.id);

      return res.json({
        contact: {
          primaryContatctId: primaryId,
          emails,
          phoneNumbers: phones,
          secondaryContactIds: secondaryIds,
        },
      });
    });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});