#!/bin/bash
# Script para desplegar Edge Functions de Supabase manualmente
# Usando la API REST de Supabase

# Configuración
PROJECT_REF="alyboipgbixoufqftizd"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M"

# URLs de la API
API_BASE="https://api.supabase.com/api/v1"
FUNCTIONS_API="$API_BASE/projects/$PROJECT_REF/functions"

echo "==================================="
echo "Despliegue de Edge Functions"
echo "Proyecto: $PROJECT_REF"
echo "==================================="

# Función para desplegar una función
deploy_function() {
    local FUNCTION_NAME=$1
    local FUNCTION_PATH="supabase/functions/$FUNCTION_NAME/index.ts"
    
    echo ""
    echo "Desplegando función: $FUNCTION_NAME"
    echo "Archivo: $FUNCTION_PATH"
    
    if [ ! -f "$FUNCTION_PATH" ]; then
        echo "❌ Error: El archivo $FUNCTION_PATH no existe"
        return 1
    fi
    
    # Leer el contenido del archivo
    local FUNCTION_BODY=$(cat "$FUNCTION_PATH")
    
    # Crear el payload JSON
    local PAYLOAD=$(cat <<EOF
{
    "slug": "$FUNCTION_NAME",
    "name": "$FUNCTION_NAME",
    "body": $(echo "$FUNCTION_BODY" | jq -Rs .),
    "verify_jwt": true
}
EOF
)
    
    echo "Payload preparado, enviando a Supabase..."
    
    # Hacer la petición a la API
    # Usar PUT para actualizar o crear
    local RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        "$FUNCTIONS_API/$FUNCTION_NAME" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    local HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    local BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "✅ Función $FUNCTION_NAME desplegada exitosamente"
        echo "Respuesta: $BODY"
        return 0
    else
        echo "❌ Error al desplegar $FUNCTION_NAME (HTTP $HTTP_CODE)"
        echo "Respuesta: $BODY"
        return 1
    fi
}

# Verificar jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq no está instalado. Instálalo primero."
    exit 1
fi

# Desplegar funciones
echo ""
echo "Funciones a desplegar:"
echo "1. crear-wallet"
echo "2. webhook-trondealer"
echo ""

deploy_function "crear-wallet"
DEPLOY_1=$?

deploy_function "webhook-trondealer"
DEPLOY_2=$?

echo ""
echo "==================================="
echo "Resumen del despliegue"
echo "==================================="

if [ $DEPLOY_1 -eq 0 ] && [ $DEPLOY_2 -eq 0 ]; then
    echo "✅ Todas las funciones fueron desplegadas exitosamente"
    echo ""
    echo "URLs de las funciones:"
    echo "  - crear-wallet: https://$PROJECT_REF.supabase.co/functions/v1/crear-wallet"
    echo "  - webhook-trondealer: https://$PROJECT_REF.supabase.co/functions/v1/webhook-trondealer"
else
    echo "⚠️ Algunas funciones fallaron al desplegarse"
    exit 1
fi
