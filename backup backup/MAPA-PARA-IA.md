# Mapa de Forja Eterna para lectura por IA

**Nota de reparación (última revisión):** este repo tenía `js/combat.js` y
`js/script.js` (los monolitos viejos, pre-división) conviviendo con los
archivos ya divididos, y `index.html` cargaba los monolitos — es decir, el
juego real corría con la versión VIEJA sin ninguna de las mejoras hechas
después de la división (incluida una limpieza de código muerto y un
rebalanceo del botín de combates comunes). Se borraron ambos monolitos y se
actualizó `index.html` para cargar los archivos divididos. De paso apareció
un bug real: a los archivos divididos les faltaban 6 funciones que
`renderProfileHub()` necesita (`profileHubStats`, `playerPrestigeTier`,
`classFrameOrnaments`, `hubProgressRing`, `hubParticlesHTML`,
`adventurerTenureLabel`) — sin ellas la pestaña Perfil rompía apenas se
abría. Ya están restauradas en `js/script-shop.js`, junto a
`renderProfileHub()` que las usa.

**Pendiente sin resolver (encontrado de paso, no arreglado todavía):** los
botones "Equipar"/"Eliminar" de un ítem en la mochila (`script-views.js`,
dentro de `renderProfile`/la vista de héroe) llaman a
`equipItemFromInventory(idx)` y `deleteItemFromInventory(idx)`, pero ninguna
de las dos funciones existe en el proyecto — ni siquiera existían en el
monolito viejo. Los botones no hacen nada al tocarlos. Falta averiguar cuál
era la función real pensada para esto (o escribirla de cero) y cablearla ahí.

Este documento es un **punto de entrada rápido** para cualquier IA (o persona) que
necesite orientarse en el código sin tener que leer miles de líneas de JS de una.
No reemplaza al código: da la forma general, dónde vive cada cosa, y cómo se
conecta todo, para que se pueda ir directo a la sección relevante en vez de
buscar a ciegas.

Los antiguos `combat.js` (2493 líneas) y `script.js` (2749 líneas) fueron
divididos en archivos más chicos por sección (igual que ya estaba hecho con
`css/sections/`). Esto es lo más importante para leer rápido: en vez de abrir
un archivo de +2000 líneas, abrí solo el archivo chico que corresponde a lo
que necesitás tocar (ver tabla en la sección 2).

Si vas a modificar algo, la secuencia recomendada es:
1. Leer este mapa para ubicar el archivo/función correcta (tabla de la
   sección 2, o el índice rápido "¿Dónde toco para...?" en la sección 5).
   Si ya sabés el nombre exacto de la función pero no en qué archivo vive,
   buscala directo en **`INDICE-FUNCIONES.md`** (las 396 funciones del
   proyecto, alfabético, con archivo y número de línea).
2. Abrir solo ese archivo chico (todos tienen menos de 700 líneas) en vez de
   buscar en un archivo grande.
3. Revisar la tabla de "estado global" más abajo si la función toca `state`,
   `battle`, `runState` o `fishCast`, para no romper su forma esperada.

**Cuidado con código muerto tras un `return` temprano.** El proyecto tuvo
versiones anteriores de varias mecánicas (turno del monstruo, mapa de nodos,
botones de habilidad) que se reemplazaron pero no siempre se borraron: quedó
código real, con nombres de variables válidos, después de un `return;`
incondicional — nunca se ejecuta, pero se lee como si fuera la lógica actual.
Ya se limpiaron los casos encontrados en `script-boot.js`,
`combat-battle-abilities.js`, `combat-battle-turns.js` y
`combat-run-render.js`. Si algo no encaja con lo que hace la UI, revisá si
hay un `return` antes en la misma función.

---

## 1. Orden de carga (importa mucho)

Definido en `index.html`, en este orden estricto:

```
sound.js → classes.js
  → combat-loot.js
  → combat-battle-monsters.js → combat-battle-core.js → combat-battle-vfx.js
  → combat-battle-abilities.js → combat-battle-turns.js
  → combat-run.js → combat-run-render.js → combat-render.js
  → forge.js → fishing.js
  → script-state.js → script-math.js → script-ui-core.js → script-views.js
  → script-trade.js → script-shop.js → script-render.js → script-boot.js
```

Cada archivo asume que todo lo cargado antes ya existe en el scope global (no
hay módulos ES6, todo son funciones y `const`/`let` de nivel superior
compartidas como si fuera un único archivo grande dividido en 17 partes). Por
eso el orden de `index.html` NO se puede reordenar libremente:

- `classes.js` NO puede usar nada de los `combat-*.js` a nivel de módulo
  (solo dentro de funciones que se llaman después de que todo cargó).
- Los `combat-*.js` van en ese orden interno estricto: `combat-loot.js` no usa
  nada de los `combat-battle-*.js`, pero cada `combat-battle-*.js` sí puede
  usar cosas del anterior en la cascada (`combat-battle-monsters.js` →
  `combat-battle-core.js` → `combat-battle-vfx.js` →
  `combat-battle-abilities.js` → `combat-battle-turns.js`), y así
  sucesivamente hasta `combat-run.js`.
- Los `script-*.js` son los últimos y son los únicos que pueden asumir que
  TODO lo demás existe — por eso ahí vive `render()`, el boot (`showGame`,
  arranque general) y la UI que coordina todos los sistemas. También van en
  orden interno estricto (cada uno puede usar lo de los anteriores).
- Si agregás un archivo `.js` nuevo, agregalo también en `index.html` en el
  lugar correcto y actualizá esta tabla.

## 2. Qué hace cada archivo (una línea)

| Archivo | Qué contiene |
|---|---|
| `js/sound.js` | Sintetizador de audio (`Sound`) con Web Audio API: música ambiente y efectos de sonido. No depende de nada más. |
| `js/classes.js` | Datos puros + helpers: clases/subclases jugables, tiers de dificultad, biomas, monstruos (nombres/formas/variantes), catálogo de bestiario, sistema de rareza de ítems, armería completa (`SHOP_EQUIPMENT_ITEMS`), sets de equipo, misiones/logros. También declara casi todas las **variables globales mutables** del juego (`state`, `battle`, `runState`, `fishCast`, etc.) aunque su lógica vive en otros archivos. |
| `js/combat-loot.js` | Reliquias de expedición (`RUN_RELICS`), telemetría de la run y funciones de otorgado de botín/reliquias. Antes era el inicio de `combat.js`. |
| `js/combat-battle-monsters.js` | Generación y lectura de monstruos: arquetipos, afinidades de élite, intención del monstruo, lectura táctica y `makeMonster`. Primera parte de lo que antes era `combat-battle.js` (sección `BATTLE` de `combat.js`). |
| `js/combat-battle-core.js` | Ciclo de vida de la batalla 1v1: inicio (clásica y de run), preparación del monstruo, ruptura de armadura, fases de jefe y `endBattle` (victoria/derrota/retirada, botín, racha, avance de run). Segunda parte de lo que antes era `combat-battle.js`. |
| `js/combat-battle-vfx.js` | Feedback y efectos visuales de combate: texto flotante, avisos, flash de arena, finisher, chispas, sprites/efectos por clase, esquivas, postura de combate y estimación de daño. Tercera parte de lo que antes era `combat-battle.js`. |
| `js/combat-battle-abilities.js` | Habilidades de combate: definiciones, estado del jugador y momentum, habilidad de clase, habilidades de subclase, costo/uso y renderizado de botones y estado de combate. Cuarta parte de lo que antes era `combat-battle.js`. |
| `js/combat-battle-turns.js` | Turno del jugador: ataque básico, combo, domesticar, asistencia del compañero, `runPlayerHits` (incluye turno del monstruo), entrenamiento, elección de subclase y renacer. Quinta y última parte de lo que antes era `combat-battle.js`. |
| `js/combat-run.js` | Modo roguelike: flujo de la run (mapa de nodos, mercader, santuarios, eventos, dados de recompensa, retirarse/terminar run). Antes era la primera mitad de la sección `MODO ROGUELIKE` de `combat.js`. |
| `js/combat-run-render.js` | Renderizado del modo roguelike (mapa de nodos, panel de expedición). Antes era la segunda mitad de esa misma sección. |
| `js/combat-render.js` | Renderizado general de combate (log, sellos). Antes era el final de `combat.js`. |
| `js/forge.js` | Minijuego de herrería: forjar piezas exclusivas, mejorar equipo (+1, +2...), y el ritual de "runas" (mini-juego de precisión con aguja). |
| `js/fishing.js` | Minijuego de pesca: zonas, clima, cebos, caña, barra de tensión al pescar, tabla de peces y rareza. |
| `js/script-state.js` | Claves de fecha (rachas diarias) y `STATE`: `defaultState`, guardado local/nube (Supabase), ranking global, snapshot de run. Antes era el inicio de `script.js`. |
| `js/script-math.js` | `EQUIP BONUSES` y `GAME MATH`: todos los stats derivados del héroe (HP, maná, ataque, defensa, crítico, esquiva). Antes era la segunda sección de `script.js`. |
| `js/script-ui-core.js` | `normalizeState`, asignación de puntos de stats, arena visual (SVGs de héroe/monstruo). Antes era la sección "SCRIPT PRINCIPAL (continuación)" de `script.js`. |
| `js/script-views.js` | Control de vistas principales (tabs de héroe/gremio/perfil). |
| `js/script-trade.js` | Comercio entre aventureros/jugadores. |
| `js/script-shop.js` | Tienda y equipamiento. También el hub de perfil completo: `renderProfileHub()` y sus auxiliares (antigüedad del aventurero, nivel de prestigio, marco decorativo, anillos de progreso). |
| `js/script-render.js` | Actualización de pantalla: `render()`, el refresco general de UI. |
| `js/script-boot.js` | Arranque del juego: selección de personaje, boot general (`showGame`). Debe ser el último archivo cargado de todos. |

## 3. Estado global — las 4 piezas que hay que entender

El juego no usa un framework; todo vive en variables globales `let` (declaradas
al final de `classes.js`, líneas ~745-768) que las funciones de los demás
archivos leen y mutan directamente. Estas son las 4 importantes:

### 3.1 `state` — el personaje activo (persistente, se guarda)
Se crea con `defaultState(name, classId)` en `script-state.js` (línea ~62) y
esa función es **la fuente de verdad de qué campos existe** (mejor que
buscarlos dispersos). Los grupos principales:
- Identidad y progreso: `name`, `characterClass`, `subclass`, `level`, `exp`, `resets`, `gold`, `guildMarks`.
- Stats: `stats` (base), `allocatedPoints`/`pendingPoints` (asignación de puntos por atributo), `statResetsUsed/Earned`.
- Equipo: `equipment` (slots equipados) y `ownedEquipment` (inventario).
- Progreso de minijuegos: `fishing` (zona, caña, cebos, streak), `materials` (esencias, núcleos de jefe).
- Meta: `missions` (día/semana/mes), `achievementsClaimed`, `bestiary`, `settings`, `log`.

`normalizeState()` en `script-math.js` (línea ~180) es la función que "repara"
un `state` cargado desde guardado viejo para que tenga todos los campos
nuevos — **cualquier campo nuevo que se agregue a `defaultState` casi siempre
necesita también un default en `normalizeState`**, o los personajes viejos
van a romper.

### 3.2 `battle` — batalla 1v1 en curso (transitorio, `null` si no hay pelea)
Creado por `makeMonster()` (en `combat-battle-monsters.js`) +
`startBattle()`/`startRunBattle()` (en `combat-battle-core.js`, junto con
`prepareMonster`). Contiene el
monstruo actual, HP/maná del jugador y del monstruo en esa pelea, flags de
estado (`busy`, `finishing`, `healingUsed`), `playerStatus` (buffs/momentum),
y si `isRun` es true, está ligado a `runState`.

### 3.3 `runState` — la expedición roguelike en curso (transitorio)
Creado por `startRun()` en `combat-run.js` (línea ~24). Trackea la
profundidad (`depth`), la fase actual (`'map' | 'fight' | 'ended'` etc.), el
plan de ruta (`routePlan`/`routeHistory`), reliquias tomadas (`relics`),
oro/HP/maná de la run, y telemetría (`ensureRunTelemetry`, en
`combat-loot.js`). `activeRunSnapshot()` / `restoreRunSnapshot()` en
`script-state.js` (líneas ~201-220) son las funciones que guardan/recuperan
esto para poder cerrar el juego a mitad de una run.

### 3.4 `fishCast` — el lance de pesca en curso (transitorio)
Creado en `fishing.js` por `startCastCharge()`/`releaseCast()` (~línea
229-272). Vive solo durante el minijuego de pescar (carga → picada → barra de
tensión → captura o escape).

Además existe `forgeRitual` (en `forge.js`, ~línea 44) con la misma lógica de
"transitorio mientras dura el minijuego", para el ritual de runas de mejora.

## 4. Índice de secciones por archivo

Los archivos ya usan banners `/* ================= NOMBRE ================= */`
para marcar secciones — usalos con `grep -n "/\* =====" archivo.js` para saltar
directo. Como ahora cada archivo es chico, ya casi no hace falta: abrí el
archivo entero directamente. Resumen de lo que vas a encontrar en cada uno:

**classes.js**: tiers y monstruos → biomas y eventos de escenario → modo
roguelike (dados, nodos de mapa, generación de monstruos por profundidad) →
`ARMERÍA Y RAREZA DE ÍTEMS` → sets de equipo/subclase → clases, subclases,
misiones, emblemas, slots de equipo → `VARIABLES GLOBALES MUTABLES DEL JUEGO`
(`state`, `battle`, `runState`, `fishCast`, etc., al final del archivo).

**combat-loot.js**: `TELEMETRÍA Y RESUMEN DE RUN` → `DESAFÍO SEMANAL` →
`RELIQUIAS` → `LOG, NIVEL Y RECOMPENSAS` (`addLog`, `gainExp`, `gainGold`,
`awardRunLoot`).

**combat-battle-monsters.js**: `ARQUETIPOS Y AFINIDADES` — arquetipos de
monstruo, afinidades de élite, intención del monstruo, lectura táctica,
`makeMonster`.

**combat-battle-core.js**: `INICIO Y CIERRE DE BATALLA` — `startBattle`/
`startRunBattle`, `prepareMonster`, ruptura de armadura → `FASES DE JEFE` →
`endBattle`.

**combat-battle-vfx.js**: `FEEDBACK Y EFECTOS VISUALES` — texto flotante,
avisos, flash de arena, finisher, chispas, sprites/efectos por clase,
esquivas, postura de combate, estimación de daño.

**combat-battle-abilities.js**: `HABILIDADES Y MOMENTUM` (definición general,
estado del jugador) → `HABILIDAD DE CLASE` → `HABILIDADES DE SUBCLASE` →
`COSTO, BOTONES Y ESTADO DE HABILIDADES` (render).

**combat-battle-turns.js**: `TURNO DEL JUGADOR Y RENACER` (ataque básico,
combo) → `DOMAR MONSTRUOS Y COMPAÑERO` → `RESOLUCIÓN DE GOLPES` (`runPlayerHits`,
turno del monstruo incluido, entrenamiento) → `ELECCIÓN DE SUBCLASE Y RENACER`
(rebirth/reset).

**combat-run.js**: `MODO ROGUELIKE: FLUJO DE LA RUN` (arranque) →
`TURNO DEL MONSTRUO` (dentro de la pelea) → `MAPA DE NODOS` →
`EVENTOS DE NODO` (santuario, evento, rastreo, mercader) →
`DADOS DE RECOMPENSA Y FIN DE LA RUN`.

**combat-run-render.js**: `TARJETAS DE RESUMEN` (expedición/profundidad/botín)
→ `BARRA DE ESTADO DE LA RUN` → `MAPA DE NODOS (renderizado)`.

**combat-render.js**: `RENDERIZADO GENERAL` de combate (log, sellos).

**forge.js**: armería exclusiva → `MEJORA DE EQUIPO (+1, +2...)` →
`RITUAL DE RUNAS` (minijuego de precisión con aguja animada), craftear ítems
únicos, desmantelar → `RENDERIZADO DE HERRERÍA`.

**fishing.js**: `PESCA` (zonas, clima día/noche, cebos, caña) → lanzar/picar →
barra de tensión al reelar → resolución de captura → renderizado.

**script-state.js**: claves de fecha (rachas diarias) → `STATE`
(`defaultState`, guardado local/nube, snapshot de run) → ranking global (Supabase).

**script-math.js**: `EQUIP BONUSES` → `GAME MATH` (todos los stats derivados:
HP, maná, ataque, defensa, crítico, esquiva — el "motor de números" del
héroe) → `normalizeState`.

**script-ui-core.js**: `ASIGNACIÓN DE PUNTOS DE ESTADÍSTICA` →
`RENDERIZADO DE LA ARENA DE COMBATE` (SVGs de héroe/monstruo, barras, botones
de acción).

**script-views.js**: `CONTROL DE VISTAS PRINCIPALES` (tabs de
héroe/gremio/perfil) → `PESTAÑAS DE CACERÍA` → `PERFIL Y LOGROS`.

**script-trade.js**: `MERCADO ENTRE JUGADORES` (Sellos del Gremio) →
`PESTAÑAS DE GREMIO Y RANKING`.

**script-shop.js**: `TIENDA Y EQUIPAMIENTO` (rotación de tienda) →
`OPCIONES Y AJUSTES VISUALES` → `PANEL DE PERFIL (HUB)` →
`COMPRA Y EQUIPAMIENTO` (`buyItem`, `unequipItem`).

**script-render.js**: `ACTUALIZACIÓN DE PANTALLA` (`render()`, el refresco
general de UI).

**script-boot.js**: `ARRANQUE` → `SELECCIÓN Y CREACIÓN DE PERSONAJE` →
`MODO PANTALLA COMPLETA (inmersivo)` → `ARRANQUE DEL PORTAL Y DEL JUEGO`
(`launchGamePortal`, `boot`, `showGame`).

## 5. "¿Dónde toco para...?" — acceso rápido

- **Cambiar recompensas de pesca / rareza de peces** → `fishing.js`,
  `rollFish()`, `resolveCatch()`, tabla `FISH_ZONES`/tabla de peces cerca del
  inicio del archivo.
- **Cambiar dificultad o daño de monstruos** → `classes.js` `rollMonsterTier`,
  `makeRunMonster`; `combat-battle-monsters.js` `makeMonster`;
  `combat-battle-core.js` `prepareMonster`.
- **Cambiar fórmulas de stats del héroe (HP, ataque, crítico, etc.)** →
  `script-math.js` (`maxHP` ~línea 114, `atkDamage` ~línea 116, `critChance`
  ~línea 125, etc.).
- **Cambiar botín/recompensas de la run roguelike** → `combat-loot.js`
  `awardRunLoot`, `makeRelicChoices`; `combat-run.js` `computeBountyRewards`.
- **Cambiar precios/objetos de la tienda o forja** → `classes.js`
  `SHOP_EQUIPMENT_ITEMS`; `forge.js` `forgeCost`, `enhancementCost`.
- **Cambiar la UI/renderizado de una pestaña específica** → buscar la función
  `render<Nombre>` en `script-views.js`/`script-trade.js`/`script-shop.js`
  (`renderProfile`, `renderGuildSubTab`, `renderOptions`, `renderHeroSubTab`,
  etc.) o `renderRunMode`/`renderForge`/`renderFishing` en sus respectivos
  archivos.
- **Guardado / nube / Supabase** → `script-state.js`, funciones `readStored`,
  `writeStored`, `scheduleLeaderboardSync`, `startCloudBackup`, y los archivos
  `supabase-*.sql` en la raíz (esquema de las tablas usadas).
- **Indicador de "qué mejoró" (delta de stats antes/después)** →
  `heroPowerSnapshot()` (script-math.js, la "foto" numérica comparable),
  `showStatDelta()` (combat-battle-vfx.js, arma y muestra el toast). Se
  dispara en `equipItemFromInventory()`/`unequipItem()` (script-shop.js) y
  en `savePendingPoints()` (script-ui-core.js, usando `statAllocSnapshot`
  capturado en `editPendingAllocation()` al primer punto de la tanda).

## 6. Convenciones a respetar si se edita código

- Todo el texto visible al jugador está en español; los nombres de variables
  mezclan inglés/español según lo que ya exista en el archivo — mantené el
  estilo del archivo que estés tocando en vez de mezclar convenciones nuevas.
- Los objetos `state`, `battle`, `runState`, `fishCast` se leen por **muchas**
  funciones distintas sin pasarlos como parámetro (son globales) — antes de
  renombrar o quitar un campo, buscar todos sus usos con `grep -rn` en TODOS
  los archivos de `js/` (ahora son 17, no solo uno o dos grandes).
- Si agregás una función/variable global nueva, fijate en qué archivo de la
  cascada de carga (sección 1) tiene sentido según qué otros archivos la van
  a usar — no hace falta que todo viva en un solo archivo.
- Los archivos CSS están divididos por sección en `css/sections/NN-nombre.css`
  con numeración que indica orden de carga/cascada — mantené esa numeración si
  agregás una hoja nueva.
