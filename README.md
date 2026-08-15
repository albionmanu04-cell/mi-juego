# Forja Eterna

Versión actual: **2.20.16**

Juego RPG web estático. No necesita compilación ni dependencias de ejecución: se abre desde un servidor HTTP y guarda el progreso localmente, con respaldo opcional en Supabase.

La Cacería incluye un Altar de Evolución después de cada guardián. Mago, Guerrero y Cazador cuentan con diez ramas cada uno —Poder y Sinergia para sus cinco cartas base— que se conservan en el guardado de la expedición.

Después del acto 9 se desbloquea el Abismo Infinito. El jugador puede asegurar la campaña y continuar con su mismo mazo a través de Ascensiones cada vez más difíciles, con récord persistente por personaje.

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
