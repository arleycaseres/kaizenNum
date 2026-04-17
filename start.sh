#!/bin/bash
# Iniciar KAIZEN Protect en local

echo "🚀 Iniciando KAIZEN Protect..."

# Backend
cd backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)
echo "📡 Backend en http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
echo "🖥️  Frontend en http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ KAIZEN Protect corriendo!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener"

# Esperar
wait
