# Forja Eterna

Versión actual: **2.0.0**

Juego RPG web estático. No necesita compilación ni dependencias de ejecución: se abre desde un servidor HTTP y guarda el progreso localmente, con respaldo opcional en Supabase.

## Ejecutar

Serví la carpeta raíz con cualquier servidor estático y abrí `index.html`. El modo desarrollador se habilita automáticamente en `localhost`.

## Verificar el proyecto

Requiere Node.js 22 o posterior.

```bash
npm test
```

La validación revisa sintaxis, archivos referenciados, presupuesto de carga inicial, versión, Cacería diferida y comportamiento de la sincronización entre dispositivos.

Para ejecutar también la comprobación explícita de sintaxis:

```bash
npm run check
```

## Publicar una versión

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

El comando actualiza `VERSION`, `package.json`, la versión visible, los identificadores de caché y agrega una sección al historial. Después se debe completar la descripción del cambio y ejecutar `npm run check`.

## Nube

Antes de publicar la sincronización segura, ejecutá `supabase-cloud-save.sql` en el editor SQL de Supabase. Los demás scripts SQL configuran comercio y reinicio de temporada.
