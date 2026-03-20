#!/bin/bash

# ============================================
# SCRIPT PARA CONSULTAS SQL RÁPIDAS - BetWinPro90
# ============================================

DB_URL="postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

echo "============================================"
echo "  BetWinPro90 - Consultas SQL Rápidas"
echo "============================================"
echo ""
echo "Selecciona una opción:"
echo ""
echo "1. Ver todos los usuarios con saldos"
echo "2. Ver depósitos recientes"
echo "3. Ver transacciones recientes"
echo "4. Ver comisiones MLM distribuidas"
echo "5. Ejecutar distribución de ganancias diarias"
echo "6. Sumar \$1000 invertido a TODOS los usuarios"
echo "7. Sumar \$100 disponible a TODOS los usuarios"
echo "8. Resetear profit daily de todos"
echo "9. Consulta personalizada (USER_ID requerido)"
echo "10. Salir"
echo ""
read -p "Opción [1-10]: " opcion

case $opcion in
    1)
        echo ""
        echo "📊 USUARIOS CON SALDOS:"
        echo "----------------------------------------"
        psql "$DB_URL" -c "SELECT p.username, p.email, w.balance_disponible as disponible, w.balance_invertido as invertido, w.balance_comisiones as comisiones, w.profit_daily as profit FROM profiles p JOIN wallets w ON w.user_id = p.id ORDER BY p.created_at DESC;"
        ;;
    2)
        echo ""
        echo "💰 DEPÓSITOS RECIENTES:"
        echo "----------------------------------------"
        psql "$DB_URL" -c "SELECT d.id, d.user_id, p.username, d.amount, d.status, d.created_at FROM deposits d JOIN profiles p ON p.id = d.user_id ORDER BY d.created_at DESC LIMIT 10;"
        ;;
    3)
        echo ""
        echo "📝 TRANSACCIONES RECIENTES:"
        echo "----------------------------------------"
        psql "$DB_URL" -c "SELECT t.id, t.user_id, p.username, t.type, t.amount, t.status, t.created_at FROM transactions t JOIN profiles p ON p.id = t.user_id ORDER BY t.created_at DESC LIMIT 15;"
        ;;
    4)
        echo ""
        echo "🎁 COMISIONES MLM:"
        echo "----------------------------------------"
        psql "$DB_URL" -c "SELECT mc.id, mc.user_id, p.username, mc.amount, mc.level, mc.is_paid, mc.created_at FROM mlm_commissions mc JOIN profiles p ON p.id = mc.user_id ORDER BY mc.created_at DESC LIMIT 15;"
        ;;
    5)
        echo ""
        echo "🔄 EJECUTANDO DISTRIBUCIÓN DE GANANCIAS DIARIAS..."
        psql "$DB_URL" -c "SELECT distribute_daily_profit();"
        echo "✅ ¡Completado!"
        ;;
    6)
        echo ""
        echo "⚠️  ¿Estás seguro de sumar \$1000 invertido a TODOS los usuarios?"
        read -p "Confirma (s/n): " confirmar
        if [ "$confirmar" = "s" ]; then
            psql "$DB_URL" -c "UPDATE wallets SET balance_invertido = balance_invertido + 1000, updated_at = NOW();"
            echo "✅ ¡Actualizado!"
        else
            echo "❌ Cancelado"
        fi
        ;;
    7)
        echo ""
        echo "⚠️  ¿Estás seguro de sumar \$100 disponible a TODOS los usuarios?"
        read -p "Confirma (s/n): " confirmar
        if [ "$confirmar" = "s" ]; then
            psql "$DB_URL" -c "UPDATE wallets SET balance_disponible = balance_disponible + 100, updated_at = NOW();"
            echo "✅ ¡Actualizado!"
        else
            echo "❌ Cancelado"
        fi
        ;;
    8)
        echo ""
        echo "⚠️  ¿Estás seguro de resetear profit daily de todos?"
        read -p "Confirma (s/n): " confirmar
        if [ "$confirmar" = "s" ]; then
            psql "$DB_URL" -c "UPDATE wallets SET profit_daily = 0, updated_at = NOW();"
            echo "✅ ¡Resetado!"
        else
            echo "❌ Cancelado"
        fi
        ;;
    9)
        read -p "Ingresa USER_ID: " user_id
        echo ""
        echo "📊 SALDOS DEL USUARIO $user_id:"
        psql "$DB_URL" -c "SELECT p.username, p.email, w.* FROM profiles p JOIN wallets w ON w.user_id = p.id WHERE p.id = '$user_id';"
        echo ""
        echo "📝 TRANSACCIONES DEL USUARIO:"
        psql "$DB_URL" -c "SELECT * FROM transactions WHERE user_id = '$user_id' ORDER BY created_at DESC LIMIT 10;"
        ;;
    10)
        echo "👋 ¡Hasta luego!"
        exit 0
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "============================================"
