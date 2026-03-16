# 🚀 Despliegue en Netlify - BetWinPro90

Guía completa para desplegar y configurar correctamente el proyecto en Netlify.

---

## 📋 Problema Común: Failed Fetch / Variables de Entorno

Si estás experimentando errores de `failed fetch` o las variables de entorno no se leen correctamente, sigue esta guía paso a paso.

---

## 🔧 Configuración en Netlify Dashboard

### Paso 1: Configurar Variables de Entorno

1. Ve a **Netlify Dashboard** > Tu sitio
2. Navega a **Site settings** > **Environment variables**
3. Agrega las siguientes variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://alyboipgbixoufqftizd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(tu anon key de Supabase)* |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | *(tu service role key de Supabase)* |

**⚠️ IMPORTANTE:** 
- Las variables DEBEN tener el prefijo `VITE_` para que Vite las exponga al cliente
- Después de agregar las variables, debes hacer un **nuevo deploy** para que surtan efecto

### Paso 2: Verificar Configuración de Build

En **Site settings** > **Build & deploy** > **Continuous deployment**:

| Configuración | Valor |
|--------------|-------|
| **Base directory** | *(dejar vacío)* |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

### Paso 3: Configurar Node.js Version

En **Site settings** > **Build & deploy** > **Environment**:

| Variable | Valor |
|----------|-------|
| `NODE_VERSION` | `20` |

---

## 📁 Archivos de Configuración del Proyecto

### `netlify.toml` (Ya creado)

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### `vite.config.js` (Actualizado)

Configurado para cargar correctamente las variables de entorno durante el build.

### `public/_redirects` (Ya existe)

```
/* /index.html 200
```

Esto permite que React Router funcione correctamente en Netlify.

---

## 🔍 Solución de Problemas

### Problema 1: "Failed to fetch" al cargar la página

**Causa:** Las variables de entorno no están configuradas en Netlify.

**Solución:**
1. Verifica que las variables estén en **Site settings** > **Environment variables**
2. Asegúrate de que tengan el prefijo `VITE_`
3. Haz un nuevo deploy (Trigger deploy > Deploy site)

### Problema 2: Error de autenticación con Supabase

**Causa:** `VITE_SUPABASE_ANON_KEY` incorrecta o faltante.

**Solución:**
1. Ve a Supabase Dashboard > Settings > API
2. Copia la **anon public** key
3. Actualiza la variable en Netlify

### Problema 3: Las rutas no funcionan (404)

**Causa:** Falta la configuración de redirects para SPA.

**Solución:**
1. Verifica que `public/_redirects` exista con el contenido: `/* /index.html 200`
2. Verifica que `netlify.toml` tenga la sección `[[redirects]]`

### Problema 4: El build falla en Netlify

**Causa:** Versión de Node.js incompatible.

**Solución:**
1. Agrega variable de entorno en Netlify: `NODE_VERSION = 20`
2. Trigger deploy nuevamente

---

## 🚀 Comandos Útiles

### Build Local (para probar antes de deploy)

```bash
npm run build
npm run preview
```

### Verificar variables de entorno en el build

Durante el build en Netlify, las variables se muestran en el log (solo las que no son secretas).

---

## 📝 Checklist de Verificación

- [ ] Variables de entorno configuradas en Netlify Dashboard
- [ ] `VITE_SUPABASE_URL` configurada correctamente
- [ ] `VITE_SUPABASE_ANON_KEY` configurada correctamente
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` configurada correctamente
- [ ] `netlify.toml` existe en el repositorio
- [ ] `public/_redirects` existe con el contenido correcto
- [ ] Node.js versión 20 configurada
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Último deploy completado exitosamente

---

## 🔄 Cómo Hacer Deploy de Cambios

### Opción 1: Conectar Repositorio Git (Recomendado)

1. Conecta tu repositorio de GitHub/GitLab en Netlify
2. Cada push a la rama principal hará deploy automático

### Opción 2: Deploy Manual con Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Opción 3: Deploy Manual desde Dashboard

1. Ve a **Deploys** en Netlify Dashboard
2. Arrastra la carpeta `dist` al área indicada
3. Espera a que complete el deploy

---

## 🛡️ Seguridad

### Variables Secretas

- ✅ `VITE_SUPABASE_ANON_KEY` - Puede estar expuesta (es pública por diseño)
- ⚠️ `VITE_SUPABASE_SERVICE_ROLE_KEY` - **NO** debe usarse en el frontend
  - Esta variable solo debe usarse en funciones serverless o backend
  - En Netlify, aunque tenga `VITE_`, se expone en el bundle JS
  - **Recomendación:** Remover `VITE_SUPABASE_SERVICE_ROLE_KEY` del frontend y usar solo en Netlify Functions si es necesario

### Configuración Recomendada

Para operaciones administrativas, usa **Netlify Functions** con la service role key como variable de entorno secreta (sin prefijo `VITE_`).

---

## 📞 Soporte

Si después de seguir esta guía el problema persiste:

1. Revisa los **Deploy logs** en Netlify
2. Verifica la consola del navegador para errores específicos
3. Asegúrate de que el último deploy incluya los archivos `netlify.toml` y `vite.config.js` actualizados

---

## 🔗 Recursos

- [Netlify Docs: Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Netlify Docs: Redirects](https://docs.netlify.com/routing/redirects/)
- [Vite Docs: Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Docs: API Keys](https://supabase.com/docs/guides/api/api-keys)
