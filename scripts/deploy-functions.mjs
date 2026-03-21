#!/usr/bin/env node

/**
 * Script para desplegar Edge Functions de Supabase
 * Usa la API REST de Supabase para desplegar funciones
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Configuración
const PROJECT_REF = 'alyboipgbixoufqftizd';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M';

// URLs de la API - Usando endpoint correcto para Functions
const API_BASE = 'https://api.supabase.com/api/v1';
const FUNCTIONS_API = `https://supabase.com/dashboard/api/_projects/${PROJECT_REF}/edge-functions`;

// Funciones a desplegar
const FUNCTIONS = [
  { name: 'crear-wallet', path: 'supabase/functions/crear-wallet/index.ts' },
  { name: 'webhook-trondealer', path: 'supabase/functions/webhook-trondealer/index.ts' }
];

console.log('===================================');
console.log('Despliegue de Edge Functions');
console.log(`Proyecto: ${PROJECT_REF}`);
console.log('===================================\n');

async function deployFunction(funcName, funcPath) {
  const fullPath = join(rootDir, funcPath);
  
  console.log(`Desplegando función: ${funcName}`);
  console.log(`Archivo: ${fullPath}`);
  
  // Leer el contenido del archivo
  let functionBody;
  try {
    functionBody = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error: El archivo ${fullPath} no existe`);
    return false;
  }
  
  // Crear el payload
  const payload = {
    slug: funcName,
    name: funcName,
    body: functionBody,
    verify_jwt: true
  };
  
  console.log('Enviando a Supabase...');
  
  try {
    const response = await fetch(`${FUNCTIONS_API}/${funcName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    console.log(`   Response HTTP: ${response.status}`);
    console.log(`   Response body (primeros 200 chars): ${responseText.substring(0, 200)}`);
    
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { raw: responseText };
    }
    
    if (response.ok) {
      console.log(`✅ Función ${funcName} desplegada exitosamente`);
      console.log(`   ID: ${responseBody.id || 'N/A'}`);
      console.log(`   Versión: ${responseBody.version || 'N/A'}`);
      return true;
    } else {
      console.error(`❌ Error al desplegar ${funcName} (HTTP ${response.status})`);
      console.error(`   Respuesta: ${JSON.stringify(responseBody)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error de red: ${error.message}`);
    return false;
  }
}

async function main() {
  const results = [];
  
  for (const func of FUNCTIONS) {
    const success = await deployFunction(func.name, func.path);
    results.push(success);
    console.log('');
  }
  
  console.log('===================================');
  console.log('Resumen del despliegue');
  console.log('===================================');
  
  const allSuccess = results.every(r => r);
  
  if (allSuccess) {
    console.log('✅ Todas las funciones fueron desplegadas exitosamente\n');
    console.log('URLs de las funciones:');
    console.log(`  - crear-wallet: https://${PROJECT_REF}.supabase.co/functions/v1/crear-wallet`);
    console.log(`  - webhook-trondealer: https://${PROJECT_REF}.supabase.co/functions/v1/webhook-trondealer`);
    console.log('\n===================================');
    console.log('CONFIGURACIÓN DE VARIABLES DE ENTORNO');
    console.log('===================================');
    console.log('Importante: Configura las siguientes variables en el Dashboard de Supabase:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/' + PROJECT_REF);
    console.log('2. Navega a: Edge Functions > Environment Variables');
    console.log('3. Agrega las variables:\n');
    console.log('   TRONDEALER_API_KEY=td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81');
    console.log('   SUPABASE_URL=https://' + PROJECT_REF + '.supabase.co');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>\n');
    process.exit(0);
  } else {
    console.log('⚠️ Algunas funciones fallaron al desplegarse');
    process.exit(1);
  }
}

// Ejecutar
main();
