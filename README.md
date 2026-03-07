# Smart Container Risk Engine

This repository contains the complete codebase for the AI-powered **Smart Container Risk Engine**. It consists of a **Django/Celery backend** for async machine learning inference and a **React/Vite frontend** for real-time visualization and analytics.

---

## 🛠 System Requirements

Before you begin, ensure you have the following installed on your system:
- **Python 3.10+** (Backend)
- **Node.js 18+** and `npm` (Frontend)
- **PostgreSQL** (Relational Database)
- **Redis** (Message Broker & Cache for Celery)

---

## 🚀 Setup Guide (Linux / macOS)

### 1. Database & Cache Setup
Ensure PostgreSQL and Redis are running.
```bash
# Start Redis
sudo systemctl start redis

# Create PostgreSQL database and user
sudo -u postgres psql -c "CREATE DATABASE mined_db;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mined_db TO postgres;"
```

### 2. Backend Setup
Navigate to the `Backend` directory, set up a virtual environment, and install the exact Python dependencies.
```bash
cd Backend
python3 -m venv venv
source venv/bin/activate

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser
```

### 3. Frontend Setup
Navigate to the `Dashboard` directory and install the exact Node packages.
```bash
cd ../Dashboard
npm install
```

---

## 🚀 Setup Guide (Windows)

### 1. Database & Cache Setup
- **Redis:** Download and run Memurai or use WSL (Windows Subsystem for Linux) to run Redis.
- **PostgreSQL:** Download the Windows installer from the official site. Create a database named `mined_db` with username `postgres` and password `postgres` using pgAdmin or the SQL Shell.

### 2. Backend Setup
Open PowerShell or Command Prompt, navigate to the `Backend` directory, and set up the virtual environment.
```cmd
cd Backend
python -m venv venv
venv\Scripts\activate

:: Install dependencies from requirements.txt
pip install -r requirements.txt

:: Run database migrations
python manage.py migrate

:: Create a superuser (optional)
python manage.py createsuperuser
```

### 3. Frontend Setup
Open a new terminal, navigate to the `Dashboard` directory, and install the Node packages.
```cmd
cd ..\Dashboard
npm install
```

---

## 🏃 Running the Application

To run the full stack locally, you need three separate terminal windows:

### Terminal 1: Django Server
```bash
# Linux
cd Backend
source venv/bin/activate
python manage.py runserver

# Windows
cd Backend
venv\Scripts\activate
python manage.py runserver
```

### Terminal 2: Celery Worker
*Note: Make sure Redis is actively running in the background before starting Celery.*
```bash
# Linux
cd Backend
source venv/bin/activate
celery -A core worker -l info

# Windows
cd Backend
venv\Scripts\activate
celery -A core worker -l info -P solo
```

### Terminal 3: React Vite Frontend
```bash
# Linux/Windows
cd Dashboard
npm run dev
```

You can now access the application at `http://localhost:5173`.
