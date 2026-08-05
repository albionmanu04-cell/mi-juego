# Historial de cambios

Este proyecto usa versionado semántico: `MAYOR.MENOR.PARCHE`.

## [2.4.2] - 2026-08-03

### Coherencia visual del Cazador

- Las diez evoluciones del Cazador fueron rediseñadas como variaciones directas de sus cartas base, conservando personaje, pose, acción, cámara y escenario.
- Cada familia ahora comunica claramente el paso de carta original a Poder o Sinergia; la diferencia visual se concentra en el efecto que despierta.
- Los diez recursos nuevos están optimizados en WebP a 960 × 540 y fueron comprobados en escritorio y móvil.
- Las ilustraciones anteriores, ya sin referencias, fueron retiradas para evitar peso innecesario.

## [2.4.1] - 2026-08-03

### Coherencia visual del Guerrero

- Las diez evoluciones del Guerrero fueron rediseñadas como variaciones directas de sus cartas base, conservando personaje, pose, acción y escenario.
- Cada familia ahora comunica claramente el paso de carta original a Poder o Sinergia, con cambios centrados en el efecto que despierta.
- Segundo Aliento recibe un arte base propio y deja de reutilizar la ilustración de Grito de Guerra.
- Los once recursos nuevos están optimizados en WebP a 960 × 540 y fueron comprobados en escritorio y móvil.

## [2.4.0] - 2026-08-03

### Evolución del Cazador

- Las cinco cartas iniciales del Cazador ahora pueden despertar en diez evoluciones exclusivas repartidas entre Poder y Sinergia.
- Disparo Certero, Paso Ligero, Flecha Gemela, Marca del Cazador y Lluvia de Flechas reciben dos caminos con funciones y decisiones claramente diferentes.
- Las nuevas ramas incorporan perforación de guardia, ácido, evasión, robo de cartas, crítico preparado, ataques múltiples y marcado de presa.

### Ilustraciones y calidad

- Cada evolución del Cazador tiene un arte cinematográfico exclusivo, optimizado en WebP a 960 × 540.
- El sistema suma treinta ramas verificadas entre Mago, Guerrero y Cazador.
- El Altar y la ceremonia final fueron comprobados en escritorio y móvil, sin desbordamiento horizontal ni errores de consola.

## [2.3.0] - 2026-08-03

### Evolución del Guerrero

- El Guerrero ahora tiene cinco cartas iniciales únicas y diez evoluciones exclusivas repartidas entre Poder y Sinergia.
- Se incorporó Segundo Aliento al mazo inicial sin cambiar su tamaño total de diez cartas.
- Corte de Acero, Guardia de Escudo, Rompeguardia, Grito de Guerra y Segundo Aliento pueden despertar después de cada guardián.
- Las nuevas ramas incorporan perforación de guardia, ataques encadenados, contraataque, aturdimiento, robo de cartas y recuperación táctica de maná.

### Ilustraciones y calidad

- Cada evolución del Guerrero tiene un arte cinematográfico exclusivo, optimizado en WebP a 960 × 540.
- El modo de prueba del Altar ahora funciona con cualquier clase que tenga evoluciones disponibles.
- El flujo completo fue comprobado en escritorio y móvil, sin imágenes rotas, desbordamiento horizontal ni errores de consola.
- Las pruebas automáticas ahora cubren veinte ramas de evolución entre Mago y Guerrero.

## [2.2.0] - 2026-08-03

### Ilustraciones

- Las diez evoluciones iniciales del Mago ahora tienen ilustraciones exclusivas, con una identidad visual propia para cada camino de Poder y Sinergia.
- Los nuevos artes se integraron al Altar, la comparación de ramas, la ceremonia final y las cartas evolucionadas durante el combate.
- Todas las ilustraciones fueron optimizadas en formato WebP a 960 × 540 para conservar detalle sin aumentar innecesariamente el tiempo de carga.

### Calidad

- Se verificó el Altar completo en escritorio y móvil, sin desbordamiento horizontal ni imágenes rotas.
- Una prueba automática comprueba que cada evolución declare un archivo WebP y que sus diez recursos existan físicamente en el proyecto.

## [2.1.1] - 2026-08-02

### Presentación

- El Altar de Evolución ahora tiene una escena cinematográfica con runas, halos, partículas y energía ambiental.
- Poder y Sinergia muestran vistas previas completas de la carta final con marcos e identidades propias.
- Las estadísticas comparan claramente sus valores anteriores y nuevos antes de confirmar.
- La ceremonia final, los distintivos de combate y los sonidos cambian según el camino elegido.
- El panel del creador se oculta mientras el Altar está abierto y la vista vuelve automáticamente al inicio al cambiar de paso.
- Se mejoró la composición para escritorio, pantallas de poca altura y dispositivos móviles.

## [2.1.0] - 2026-08-02

### Incorporado

- Altar de Evolución después de cada guardián, excepto el enfrentamiento final.
- Tres cartas candidatas al azar y dos caminos excluyentes por carta: Poder y Sinergia.
- Diez evoluciones para las cinco cartas iniciales del Mago.
- Comparación visual de ramas, ceremonia de despertar e identificación especial durante el combate.
- Persistencia completa de cartas evolucionadas y elecciones pendientes en el guardado de Cacería.

### Seguridad y calidad

- Una sola evolución por acto y protección contra dobles confirmaciones.
- Compatibilidad con partidas guardadas de la versión anterior.
- Pruebas automáticas del catálogo, las diez ramas, la inmutabilidad y la integración del Altar.

## [2.0.2] - 2026-08-02

### Balance

- La experiencia de los combates de Cacería se redujo para exigir varias victorias por nivel.
- Los combates comunes entregan 4%, los élites 10% y los guardianes 20% del siguiente nivel antes de bonificaciones.
- El jefe final conserva un premio adicional sin completar por sí solo casi todo un nivel.

## [2.0.1] - 2026-08-02

### Corregido

- Los combates comunes, élites y guardianes de Cacería ahora entregan experiencia permanente.
- Los jefes finales conceden una recompensa de experiencia adicional.
- El bono de experiencia del Cuartel vuelve a aplicarse a la Cacería activa.
- Cada victoria queda marcada para impedir que una misma recompensa se cobre dos veces.

## [2.0.0] - 2026-08-01

### Incorporado

- Comercio validado en servidor y protegido contra duplicaciones.
- Guardado y recompensas completas para Cacería.
- Seis clases jugables con arsenales propios.
- Un único sistema activo de Cacería.
- Sincronización multidispositivo versionada y resistente a conflictos.
- Carga escalonada, recursos diferidos y optimización de imágenes.
- Versión visible, pruebas automáticas e integración continua.

### Seguridad

- Aislamiento del guardado local por cuenta.
- Escrituras de nube mediante revisión atómica.
- Validación de propiedad, tamaño y formato de los datos sincronizados.
