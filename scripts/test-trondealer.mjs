#!/usr/bin/env node

/**
 * Script de Pruebas para TronDealer Integration
 * Prueba las Edge Functions y el flujo completo
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuración
const PROJECT_REF = 'alyboipgbixoufqftizd';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjIyMTAsImV4cCI6MjA4ODgzODIxMH0.U10Xs0oHF0onn2CxHiuiNKfA9Dz8yWgap3Kn3zocRkA';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M';

const BASE_URL = `https://${PROJECT_REF}.supabase.co/functions/v1`;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, success, details = '') {
  const icon = success ? '✅' : '❌';
  const status = success ? 'PASS' : 'FAIL';
  log(colors.cyan, `\n${icon} ${name} [${status}]`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Prueba 1: Verificar que las funciones existen
async function testFunctionsExist() {
  log(colors.blue, '\n📋 Prueba 1: Verificar existencia de Edge Functions');
  
  const functions = ['crear-wallet', 'webhook-trondealer'];
  let allExist = true;
  
  for (const func of functions) {
    try {
      const response = await fetch(`${BASE_URL}/${func}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });
      
      // Si no es 404, la función existe
      if (response.status === 404) {
        logTest(`Función ${func}`, false, 'No encontrada (404)');
        allExist = false;
      } else {
        logTest(`Función ${func}`, true, `Existe (HTTP ${response.status})`);
      }
    } catch (error) {
      logTest(`Función ${func}`, false, error.message);
      allExist = false;
    }
  }
  
  return allExist;
}

// Prueba 2: Probar CORS preflight
async function testCORS() {
  log(colors.blue, '\n📋 Prueba 2: Verificar CORS');
  
  try {
    const response = await fetch(`${BASE_URL}/crear-wallet`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type'
      }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    const success = response.status === 200 || response.status === 204;
    
    logTest('CORS PreFlight', success, 
      `Status: ${response.status}, CORS Header: ${corsHeader || 'N/A'}`);
    
    return success;
  } catch (error) {
    logTest('CORS PreFlight', false, error.message);
    return false;
  }
}

// Prueba 3: Probar crear-wallet (requiere usuario)
async function testCrearWallet(userId, username) {
  log(colors.blue, `\n📋 Prueba 3: Crear wallet para usuario ${username}`);
  
  try {
    const response = await fetch(`${BASE_URL}/crear-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'X-User-Id': userId
      },
      body: JSON.stringify({
        user_id: userId,
        username: username
      })
    });
    
    const data = await response.json();
    const success = response.ok && data.success;
    
    logTest('Crear Wallet', success, 
      `HTTP ${response.status}: ${JSON.stringify(data).substring(0, 100)}...`);
    
    if (success && data.wallet) {
      log(colors.green, `   Wallet Address: ${data.wallet.address}`);
      log(colors.green, `   TronDealer ID: ${data.wallet.trondealer_wallet_id}`);
    }
    
    return { success, data };
  } catch (error) {
    logTest('Crear Wallet', false, error.message);
    return { success: false, error: error.message };
  }
}

// Prueba 4: Verificar wallet en base de datos
async function testWalletInDatabase(userId) {
  log(colors.blue, '\n📋 Prueba 4: Verificar wallet en base de datos');
  
  try {
    const response = await fetch(
      `https://${PROJECT_REF}.supabase.co/rest/v1/profiles?id=eq.${userId}&select=trondealer_address,trondealer_label,trondealer_wallet_id`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    const success = Array.isArray(data) && data.length > 0 && data[0].trondealer_address;
    
    logTest('Wallet en DB', success, 
      data[0]?.trondealer_address 
        ? `Address: ${data[0].trondealer_address}` 
        : 'No tiene wallet configurada');
    
    return { success, data: data[0] };
  } catch (error) {
    logTest('Wallet en DB', false, error.message);
    return { success: false, error: error.message };
  }
}

// Prueba 5: Probar webhook simulado
async function testWebhook(walletLabel, amount = '0.01') {
  log(colors.blue, '\n📋 Prueba 5: Probar webhook (simulación)');
  
  const testData = {
    event: 'transaction.confirmed',
    timestamp: new Date().toISOString(),
    data: {
      tx_hash: `0xTEST${Date.now()}${Math.random().toString(16).substring(2, 8)}`,
      block_number: 87745902,
      from_address: '0xf476b1f997f4a82C2dc60Ce1694fD24E8CAfC63D',
      to_address: '0x922A22d6546DBAf296e2ba252De144A5932b9aB9',
      asset: 'USDT',
      amount: amount,
      confirmations: 1,
      wallet_label: walletLabel,
      network: 'bsc'
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/webhook-trondealer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    const success = response.ok && data.success;
    
    logTest('Webhook', success, 
      `HTTP ${response.status}: ${JSON.stringify(data).substring(0, 150)}...`);
    
    return { success, data, testData };
  } catch (error) {
    logTest('Webhook', false, error.message);
    return { success: false, error: error.message };
  }
}

// Prueba 6: Verificar depósito en base de datos
async function testDepositInDatabase(userId) {
  log(colors.blue, '\n📋 Prueba 6: Verificar depósito en trondealer_deposits');
  
  try {
    const response = await fetch(
      `https://${PROJECT_REF}.supabase.co/rest/v1/trondealer_deposits?user_id=eq.${userId}&select=*&order=created_at.desc&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    const success = Array.isArray(data) && data.length > 0;
    
    if (success) {
      logTest('Depósito en DB', true, 
        `TX: ${data[0].tx_hash.substring(0, 20)}..., Amount: ${data[0].amount}, Status: ${data[0].status}`);
    } else {
      logTest('Depósito en DB', false, 'No hay depósitos registrados');
    }
    
    return { success, data };
  } catch (error) {
    logTest('Depósito en DB', false, error.message);
    return { success: false, error: error.message };
  }
}

// Prueba 7: Verificar balance actualizado
async function testBalanceUpdated(userId) {
  log(colors.blue, '\n📋 Prueba 7: Verificar balance actualizado');
  
  try {
    const response = await fetch(
      `https://${PROJECT_REF}.supabase.co/rest/v1/wallets?user_id=eq.${userId}&select=disponible,invertido,comisiones`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    const wallet = Array.isArray(data) && data.length > 0 ? data[0] : null;
    
    if (wallet) {
      logTest('Balance Wallet', true, 
        `Disponible: ${wallet.disponible}, Invertido: ${wallet.invertido}, Comisiones: ${wallet.comisiones}`);
      return { success: true, data: wallet };
    } else {
      logTest('Balance Wallet', false, 'Wallet no encontrada');
      return { success: false };
    }
  } catch (error) {
    logTest('Balance Wallet', false, error.message);
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  log(colors.cyan, '\n===========================================');
  log(colors.cyan, '   PRUEBAS DE INTEGRACIÓN TRONDEALER');
  log(colors.cyan, '===========================================\n');
  
  log(colors.yellow, '⚠️  IMPORTANTE: Para pruebas completas, necesitas:');
  log(colors.yellow, '   1. Un usuario registrado en el sistema');
  log(colors.yellow, '   2. Variables de entorno configuradas en Supabase');
  log(colors.yellow, '   3. TRONDEALER_API_KEY válida\n');
  
  // Preguntar por usuario de prueba
  const testUserId = process.argv[2] || '';
  const testUsername = process.argv[3] || 'testuser';
  
  // Pruebas básicas (sin usuario)
  await testFunctionsExist();
  await testCORS();
  
  if (testUserId) {
    // Pruebas con usuario
    const walletResult = await testCrearWallet(testUserId, testUsername);
    
    if (walletResult.success) {
      await testWalletInDatabase(testUserId);
      
      // Esperar un momento para que la wallet se propague
      log(colors.yellow, '\n⏳ Esperando 3 segundos para propagación...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Probar webhook
      const webhookResult = await testWebhook(testUsername, '0.01');
      
      if (webhookResult.success) {
        await testDepositInDatabase(testUserId);
        await testBalanceUpdated(testUserId);
      }
    }
  } else {
    log(colors.yellow, '\n⚠️  Sin usuario de prueba. Ejecuta con:');
    log(colors.yellow, `   node test-trondealer.mjs <user_id> <username>\n`);
  }
  
  log(colors.cyan, '\n===========================================');
  log(colors.cyan, '   FIN DE LAS PRUEBAS');
  log(colors.cyan, '===========================================\n');
}

// Ejecutar
main().catch(console.error);
