# SR App - Local Development Setup

This guide explains how to start the **SR App** project locally with all dependencies, including Docker services, Kafka, and PostgreSQL.

---

## 1. Clone the repository

```bash
git clone https://github.com/jayedbinnazir/sr-app.git
cd sr-app
2. Install dependencies
bash
Copy code
npm install
⚠️ If installation fails due to dependency conflicts, run:

bash
Copy code
npm install --force
3. Open Docker Desktop
Make sure Docker Desktop is running on your system.

This project uses PostgreSQL, Kafka, and other containers.

4. Start required Docker services
4.1 Start project services
bash
Copy code
npm run docker:service
Use a separate terminal/cmd and keep it running in the background.

4.2 Start Kafka
bash
Copy code
npm run docker:kafka
Use another terminal/cmd for Kafka, running in the background.

⚠️ Ensure both database and Kafka containers are created and running before building the project.

5. Build and run the project
In VS Code terminal:

bash
Copy code
npm run docker:build
This will build and run the project.

It will automatically connect to Kafka and PostgreSQL.

6. Access the API
Base URL: http://localhost:8080/api/v1

Swagger Documentation
Access API docs at: http://localhost:8080/docs

7. PostgreSQL Admin (pgAdmin)
Access pgAdmin at: http://localhost:5050

Ensure the database container is running before accessing pgAdmin.

8. Notes / Tips
Keep Docker terminals for services and Kafka running while working.

If you restart Docker, make sure containers are up before building the project.

Use VS Code terminal for running project commands.

Always check that Kafka and database containers are healthy before starting the app.