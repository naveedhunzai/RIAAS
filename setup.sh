#!/bin/bash

echo "Installing RIAAS project..."

# install python environment
python3 -m venv venv
source venv/bin/activate

echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "RIAAS setup complete!"