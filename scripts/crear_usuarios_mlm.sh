#!/bin/bash

# ==========================================
# BetWinPro90 - Script para crear usuarios de prueba MLM
# ==========================================
# Este script crea usuarios usando la API de Supabase Auth
# y luego crea depósitos para probar el sistema de comisiones

# Configuración de Supabase
SUPABASE_URL="https://alyboipgbixoufqftizd.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzY3NzMsImV4cCI6MjA1ODUxMjc3M30.J6z3BG9sTBU6yGDLWPXlKKf3gRKlBh7_nQSh9BKxHaY"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para crear usuario via API
crear_usuario() {
    local email=$1
    local password="Password123!"
    local referral_code=$2
    
    echo -e "${BLUE}🔨 Creando usuario:${NC} $email"
    
    # Construir JSON body
    local json_body="{\"email\":\"$email\",\"password\":\"$password\""
    if [ ! -z "$referral_code" ]; then
        json_body="$json_body,\"referralCode\":\"$referral_code\""
    fi
    json_body="$json_body}"
    
    # Hacer request a la API de Supabase
    local response=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$json_body")
    
    # Verificar respuesta
    if echo "$response" | grep -q '"user"'; then
        echo -e "${GREEN}✅ Usuario creado exitosamente:${NC} $email"
        return 0
    elif echo "$response" | grep -q "User already registered"; then
        echo -e "${YELLOW}⚠️  Usuario ya existe:${NC} $email"
        return 0
    else
        echo -e "${RED}❌ Error creando usuario $email:${NC}"
        echo "$response" | head -3
        return 1
    fi
}

# Función para crear depósito
crear_deposito() {
    local email=$1
    local monto=$2
    
    echo -e "${BLUE}💰 Creando depósito de \$$monto para:${NC} $email"
    
    # Obtener user_id del email
    local user_id=$(psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -t -c \
        "SELECT id FROM profiles WHERE email='$email' LIMIT 1;" 2>/dev/null | tr -d ' ')
    
    if [ -z "$user_id" ]; then
        echo -e "${RED}❌ No se encontró el usuario $email${NC}"
        return 1
    fi
    
    # Insertar depósito directamente en BD
    psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -c \
        "INSERT INTO deposits (user_id, amount, currency, status, payment_method, completed_at) 
         VALUES ('$user_id', $monto, 'USD', 'completed', 'simulado', NOW());" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Depósito creado para $email${NC}"
    else
        echo -e "${RED}❌ Error creando depósito${NC}"
    fi
}

# ==========================================
# SCRIPT PRINCIPAL
# ==========================================
echo -e "${YELLOW}=========================================="
echo "🚀 BetWinPro90 - Generador de Usuarios MLM"
echo -e "==========================================${NC}"
echo ""

# ==========================================
# ESCENARIO: Estructura MLM Completa
# ==========================================
echo -e "${YELLOW}📊 CREANDO ESTRUCTURA MLM DE 3 NIVELES${NC}"
echo "-------------------------------------------"

# Nivel 0 - Raíz
echo ""
echo -e "${BLUE}🌳 Paso 1: Creando usuario RAÍZ (Nivel 0)...${NC}"
crear_usuario "mlm.raiz@test.com" ""
sleep 2

# Nivel 1 - Referidos directos del raíz
echo ""
echo -e "${BLUE}📌 Paso 2: Creando Nivel 1 (referidos directos)...${NC}"
crear_usuario "mlm.nivel1a@test.com" "RAIZABC"
sleep 1.5
crear_usuario "mlm.nivel1b@test.com" "RAIZABC"
sleep 1.5
crear_usuario "mlm.nivel1c@test.com" "RAIZABC"
sleep 1.5

# Nivel 2 - Referidos de los del nivel 1
echo ""
echo -e "${BLUE}📌 Paso 3: Creando Nivel 2 (referidos de nivel 1)...${NC}"
crear_usuario "mlm.nivel2a@test.com" "NIVEL1A"
sleep 1.5
crear_usuario "mlm.nivel2b@test.com" "NIVEL1A"
sleep 1.5
crear_usuario "mlm.nivel2c@test.com" "NIVEL1B"
sleep 1.5

# Nivel 3 - Referidos de los del nivel 2
echo ""
echo -e "${BLUE}📌 Paso 4: Creando Nivel 3 (referidos de nivel 2)...${NC}"
crear_usuario "mlm.nivel3a@test.com" "NIVEL2A"
sleep 1.5
crear_usuario "mlm.nivel3b@test.com" "NIVEL2B"
sleep 1.5
crear_usuario "mlm.nivel3c@test.com" "NIVEL2C"
sleep 1.5

echo ""
echo -e "${YELLOW}=========================================="
echo "💰 CREANDO DEPÓSITOS DE PRUEBA..."
echo -e "==========================================${NC}"

# Crear depósitos para activar comisiones
crear_deposito "mlm.nivel1a@test.com" 100
crear_deposito "mlm.nivel1b@test.com" 200
crear_deposito "mlm.nivel1c@test.com" 150
crear_deposito "mlm.nivel2a@test.com" 100
crear_deposito "mlm.nivel2b@test.com" 150
crear_deposito "mlm.nivel2c@test.com" 250

echo ""
echo -e "${GREEN}=========================================="
echo "✅ ¡PROCESO COMPLETADO!"
echo -e "==========================================${NC}"
echo ""
echo -e "${YELLOW}📋 Resumen de la estructura creada:${NC}"
echo ""
echo "  NIVEL 0: mlm.raiz@test.com"
echo "    │"
echo "    ├── NIVEL 1: mlm.nivel1a@test.com (\$100)"
echo "    │   ├── NIVEL 2: mlm.nivel2a@test.com (\$100)"
echo "    │   │   └── NIVEL 3: mlm.nivel3a@test.com"
echo "    │   └── NIVEL 2: mlm.nivel2b@test.com (\$150)"
echo "    │       └── NIVEL 3: mlm.nivel3b@test.com"
echo "    │"
echo "    ├── NIVEL 1: mlm.nivel1b@test.com (\$200)"
echo "    │   └── NIVEL 2: mlm.nivel2c@test.com (\$250)"
echo "    │       └── NIVEL 3: mlm.nivel3c@test.com"
echo "    │"
echo "    └── NIVEL 1: mlm.nivel1c@test.com (\$150)"
echo ""
echo -e "${YELLOW}🔍 Para verificar los referidos, ejecuta:${NC}"
echo "   psql ... -c \"SELECT * FROM get_referrals_tree_recursive((SELECT id FROM profiles WHERE email='mlm.raiz@test.com')::uuid);\""
echo ""
echo -e "${YELLOW}📊 Para ver comisiones:${NC}"
echo "   psql ... -c \"SELECT p.username, p.email, SUM(c.amount) as total FROM profiles p LEFT JOIN mlm_commissions c ON p.id = c.user_id WHERE p.email LIKE '%mlm%' GROUP BY p.id ORDER BY total DESC;\""
echo ""
