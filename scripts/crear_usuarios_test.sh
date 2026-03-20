#!/bin/bash
# Script para crear usuarios de prueba MLM

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjIyMTAsImV4cCI6MjA4ODgzODIxMH0.U10Xs0oHF0onn2CxHiuiNKfA9Dz8yWgap3Kn3zocRkA"
SUPABASE_URL="https://alyboipgbixoufqftizd.supabase.co"

# Función para crear usuario
crear_usuario() {
  local email=$1
  local password="Test123456!"
  
  echo "Creando usuario: $email"
  
  response=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  user_id=$(echo $response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "User ID: $user_id"
  echo $user_id
}

# Crear usuarios
echo "=== CREANDO USUARIOS PARA PRUEBA MLM ==="
echo ""

# Usuario 1 (Nivel 1 - referido por root)
echo "--- Usuario 1: mlm.test1@test.com ---"
crear_usuario "mlm.test1@test.com"

# Usuario 2 (Nivel 1 - referido por root)
echo "--- Usuario 2: mlm.test2@test.com ---"
crear_usuario "mlm.test2@test.com"

# Usuario 1a (Nivel 2 - referido por test1)
echo "--- Usuario 1a: mlm.test1a@test.com ---"
crear_usuario "mlm.test1a@test.com"

# Usuario 1b (Nivel 2 - referido por test1)
echo "--- Usuario 1b: mlm.test1b@test.com ---"
crear_usuario "mlm.test1b@test.com"

# Usuario 2a (Nivel 2 - referido por test2)
echo "--- Usuario 2a: mlm.test2a@test.com ---"
crear_usuario "mlm.test2a@test.com"

echo ""
echo "=== USUARIOS CREADOS ==="
