# College Bus Connect - Localhost Version

## Requirements
- Node.js 18+
- MySQL 8+

## 1. Create the database
Open MySQL Workbench (or MySQL command line) and run:

`database/college_bus_connect.sql`

The SQL creates/uses the `college_bus_connect` database and inserts the demo data.

## 2. Check local database settings
The included `backend/.env` is configured for:

- Host: localhost
- Port: 3306
- User: root
- Password: root
- Database: college_bus_connect

If your MySQL root password is different, edit `backend/.env` and change `DB_PASSWORD`.

## 3. Install backend packages
Open Git Bash/PowerShell in the project folder and run:

```bash
cd backend
npm install
npm start
```

## 4. Open the application
Open:

`http://localhost:3000`

## Demo accounts
- Admin: YOGESH / 1234
- Driver: TAMIL / 1234
- Student: STU001 / 1234

## Important
This ZIP is for local development. Do not upload `backend/.env` to a public GitHub repository because it contains local database credentials.
