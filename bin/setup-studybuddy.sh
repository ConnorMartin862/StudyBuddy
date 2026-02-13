#!/bin/bash

echo "========================================"
echo "  StudyBuddy Project Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
echo "Checking for Node.js..."
if command -v node &> /dev/null; then
    echo "[OK] Node.js found: $(node --version)"
else
    echo "[X] Node.js is NOT installed."
    echo "Installing Node.js via nvm (recommended)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    echo "[OK] Node.js installed: $(node --version)"
fi

# Check npm
echo ""
echo "Checking for npm..."
if command -v npm &> /dev/null; then
    echo "[OK] npm found: $(npm --version)"
else
    echo "[X] npm not found. It should come with Node.js — try restarting your terminal and re-running this script."
    exit 1
fi

# Check if Python3 is installed
echo ""
echo "Checking for Python3..."
if command -v python3 &> /dev/null; then
    echo "[OK] Python3 found: $(python3 --version)"
else
    echo "[X] Python3 is NOT installed. Installing..."
    sudo apt update && sudo apt install -y python3 python3-pip python3-venv
    echo "[OK] Python3 installed: $(python3 --version)"
fi

# Create project directory structure
echo ""
echo "Creating project structure..."
mkdir -p StudyBuddy
cd StudyBuddy

# Create the Expo frontend
echo ""
echo "========================================"
echo "  Setting up Expo frontend..."
echo "  (this may take a minute or two)"
echo "========================================"
echo ""
npx create-expo-app@latest frontend
if [ $? -ne 0 ]; then
    echo "[X] Expo setup failed. Check the error above."
    exit 1
fi

# Create the backend folder with a starter FastAPI file
echo ""
echo "Setting up backend folder..."
mkdir -p backend
cd backend

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi
uvicorn
EOF

# Install dependencies
pip install -r requirements.txt

# Create a minimal FastAPI starter file
cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow your Expo app to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "StudyBuddy API is running!"}

# To run: uvicorn main:app --reload
EOF

deactivate
cd ..

# Done
echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Your project structure:"
echo ""
echo "  StudyBuddy/"
echo "    frontend/    (Expo React Native app)"
echo "    backend/     (Python FastAPI server with venv)"
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Frontend:"
echo "     cd StudyBuddy/frontend"
echo "     npx expo start"
echo "     (scan the QR code with Expo Go on your phone)"
echo ""
echo "  2. Backend:"
echo "     cd StudyBuddy/backend"
echo "     source venv/bin/activate"
echo "     uvicorn main:app --reload"
echo ""
echo "  3. Install Expo Go on your phone from the App Store / Play Store"
echo ""
