#  Bitespeed Backend Task: Identity Reconciliation

This project implements a robust Identity Reconciliation API designed to link multiple customer contact points (email and phone number) into a single consolidated identity. Built for high reliability and deployed using cloud infrastructure.

---

##  Overview

The system processes incoming customer data to ensure that even if a user transacts with different emails or phone numbers, they are mapped to a single primary identity. This is achieved through a custom reconciliation algorithm that handles primary/secondary linking and historical record merging.

###  Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MySQL (Hosted on **AWS RDS**)
* **Deployment:** Render

---

##  API Reference

### Identify Contact
Consolidates contact information based on shared email or phone number.

**Endpoint:** `POST /identify`

**Request Body:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
Successful Response (200 OK):JSON{
  "contact": {
    "primaryContactId": 1,
    "emails": ["mcfly@hillvalley.edu", "marty@future.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2, 3]
  }
}
```
 Identity Reconciliation LogicThe API follows a strict state-management flow to handle data linking:New Identity: If no matching email or phone exists, a new record is created with linkPrecedence: "primary".New Information: If a match is found but the incoming data contains a new email/phone, a new record is created with linkPrecedence: "secondary", linked to the existing primary ID.Identity Merging: If the incoming request contains an email from one primary identity and a phone number from another, the oldest record remains "primary," and the newer primary (and its descendants) are updated to "secondary."📊 Database SchemaTable Name: bitespeedColumnTypeDescriptionidINT (PK)Unique contact identifier.emailVARCHARCustomer email address.phoneNumberVARCHARCustomer phone number.linkedIdINTPointer to the primary contact ID.linkPrecedenceENUM"primary" or "secondary".createdAtDATETIMETimestamp of record creation.updatedAtDATETIMETimestamp of last modification.deletedAtDATETIMESoft delete timestamp.
 # Project Setup
1. PrerequisitesNode.js installedAccess to a MySQL instance (Local or AWS RDS)
2. InstallationBashnpm install
3. Environment Configuration 
Create a .env file in the root directory:
Code snippetPORT=3000
NEWAWSENDPOINT=your-database-endpoint
AWSPASSWORD=your-database-password
4. Database InitializationSQLCREATE DATABASE bitespeeddb;
USE bitespeeddb;

CREATE TABLE bitespeed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phoneNumber VARCHAR(20),
  email VARCHAR(255),
  linkedId INT,
  linkPrecedence ENUM('primary','secondary'),
  createdAt DATETIME,
  updatedAt DATETIME,
  deletedAt DATETIME
);
5. Start the Server
Bashnode app.js
