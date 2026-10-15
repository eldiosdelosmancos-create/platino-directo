# Platino Directo — catálogo de guías

Web estática, adaptable a móvil, sin anuncios ni dependencias de WordPress. Las miniaturas y vídeos se cargan desde YouTube; este proyecto no aloja vídeos.

## Vista previa local
Abre una terminal en esta carpeta y ejecuta:
```bash
python -m http.server 8000
```
Visita `http://localhost:8000`. (No abras `index.html` directamente: el navegador puede bloquear la carga de `data/catalog.json`.)

## Importar automáticamente las listas públicas de YouTube
Necesitas:
1. Un proyecto de Google Cloud con **YouTube Data API v3** activada y una API key.
2. El ID de canal de YouTube (normalmente empieza por `UC`).
3. Node.js 18 o superior.

Configura variables de entorno y ejecuta:
```bash
YOUTUBE_API_KEY="TU_API_KEY" node scripts/sync-youtube.mjs
```
El script descubre las listas públicas del canal y las convierte en fichas de juego. Usa el título de cada lista como nombre del juego. Revisa que las listas tengan nombres claros y que cada una corresponda a un juego; las listas genéricas también aparecerán como fichas. El script omite listas vacías.

## Actualización automática y publicación
Para que se actualice sin intervención manual, configura un flujo de GitHub Actions que ejecute el script cada 6 horas y publique el sitio (por ejemplo, GitHub Pages o Cloudflare Pages). Guarda `YOUTUBE_API_KEY` como **Secret**, nunca en `app.js` ni en archivos públicos. El ID del canal ya está configurado en el script. La cuota gratuita de la API tiene límites; si el canal tiene muchas listas y vídeos, mide el consumo y ajusta la frecuencia.

## Antes de publicar
- Cambia la URL del canal si quieres que apunte a la página correcta; el script la genera usando el ID.
- Sustituye los vídeos de ejemplo en `data/catalog.json` al probar manualmente, o ejecuta el sincronizador.
- Añade política de privacidad/contacto si incorporas analítica, cookies no esenciales o publicidad.
- Usa un dominio propio cuando hayas elegido y registrado uno.
- El sitio no incluye AdSense ni otra red publicitaria.

## Automatización con GitHub Actions
El archivo `.github/workflows/sync-youtube.yml` ejecuta la sincronización cada 6 horas y también permite lanzarla manualmente desde la pestaña **Actions** del repositorio. En **Settings → Secrets and variables → Actions** crea los secretos `YOUTUBE_API_KEY` y `YOUTUBE_CHANNEL_ID`. En **Settings → Actions → General**, permite a los flujos escribir en el repositorio si GitHub no lo permite por defecto. Para publicar la web, activa GitHub Pages desde **Settings → Pages** usando la rama principal y la carpeta raíz (`/`).
