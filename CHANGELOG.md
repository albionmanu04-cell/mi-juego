# Historial de cambios

Este proyecto usa versionado semántico: `MAYOR.MENOR.PARCHE`.

## [2.20.15] - 2026-08-15

### Decisión de extracción y recuperación segura

- La extracción sólo puede realizarse después de derrotar a una criatura, durante la decisión entre retirarse o avanzar.
- Al avanzar al siguiente sector, la salida queda bloqueada hasta terminar el nuevo combate.
- La interfaz explica durante la pelea que la extracción se habilitará al vencer, evitando presentar una recompensa como disponible antes de tiempo.
- Se agregó el botón `RECUPERAR`, que sanea y vuelve a cargar la incursión guardada sin alterar vida, botín, sector ni progreso.
- La operación de extracción también queda protegida internamente para impedir activaciones accidentales fuera de la fase permitida.

## [2.20.14] - 2026-08-15

### Cabina Ranked más amplia y clara

- La incursión aprovecha mejor las pantallas grandes y amplía las áreas del aventurero, la criatura y sus acciones.
- La ficha lateral destaca vida, personaje y nombres del equipo realmente equipado.
- Las intenciones enemigas, retratos, botones y textos tácticos ganan tamaño y jerarquía visual.
- Se ocultan estados vacíos, ranuras sin equipo y técnicas que todavía no fueron desbloqueadas.
- El resumen inferior conserva mochila, resultado de extracción y salida, eliminando información repetida.

## [2.20.13] - 2026-08-15

### Recuperación de las pantallas principales

- Se eliminó una declaración duplicada que interrumpía la carga diferida del juego.
- Héroe, Herrería, Pesca y Asentamiento vuelven a renderizar todo su contenido.
- La validación automática ahora impide que el estado de elección de subclase vuelva a definirse en más de un módulo cargado.

## [2.20.12] - 2026-08-15

### Impacto audiovisual de combate

- Guerrero, Arquero y Mago reciben firmas visuales de impacto distintas en Cacería Ranked.
- Los estados aplicados y los bloqueos muestran una confirmación breve junto al combatiente afectado.
- Cada tipo de intención enemiga cuenta con una señal sonora reconocible de ataque, peligro, veneno, control, defensa o curación.
- Los golpes y habilidades suman un segundo acento acústico sincronizado con el impacto y la cantidad de proyectiles.
- El combate normal también confirma con sonido la aplicación de Sangrado y Aturdimiento.
- Los efectos decorativos nuevos se desactivan en Modo rendimiento y respetan la reducción de movimiento.

## [2.20.11] - 2026-08-15

### Intenciones claras y dominio de clase

- La intención enemiga ahora anticipa la acción, el rango exacto de daño, su efecto y una respuesta recomendada.
- El diseño táctico se compactó para conservar las acciones principales visibles en pantallas de baja altura.
- Guerrero, Arquero y Mago reciben tres habilidades exclusivas, desbloqueadas en los niveles 5, 15 y 25.
- Las nueve habilidades tienen efectos, identidad visual y enfriamientos propios tanto en Cacería como en Cacería Ranked.
- Los enfriamientos de las habilidades Ranked sobreviven al guardado y se validan al reanudar una incursión.

## [2.20.10] - 2026-08-15

### Números de daño con personalidad

- Los valores grandes ahora se abrevian al estilo incremental con K, M, B, T, Qa y Qi, manteniendo el número exacto al inspeccionarlos.
- El Guerrero golpea con números pesados, cálidos y contundentes; el Arquero usa impactos rápidos y direccionales; el Mago despliega cifras arcanas expansivas.
- Los ataques múltiples y las habilidades muestran un remate con el daño total de la acción.
- La identidad visual también se aplica al combate de Cacería Ranked.
- El modo rendimiento acorta estos efectos y elimina filtros costosos sin ocultar el daño causado.

## [2.20.9] - 2026-08-15

### Identidad de clases en combate

- El Guerrero gana vida y robustez, usa golpes firmes y convierte guardia en contraataques.
- El Arquero encadena dos impactos básicos y una ráfaga de tres flechas que aplica sangrado.
- El Mago recupera más maná, acumula hasta tres cargas arcanas y las consume con Nova Astral.
- Las armas iniciales y las piezas avanzadas de las tres clases ahora priorizan estadísticas acordes a su rol.
- Cacería Ranked incorpora una habilidad visible con recarga para Guerrero, Arquero y Mago.
- La recarga, las cargas arcanas y el contraataque sobreviven correctamente al guardado de una incursión.
- El cargador vuelve a incluir todos los módulos del combate principal en su orden de dependencias.

## [2.20.8] - 2026-08-15

### Modo rendimiento para PCs antiguas

- Se añadió un Modo rendimiento Automático, Activado o Desactivado desde Imagen y comodidad.
- La detección automática considera memoria, núcleos del procesador, ahorro de datos y pantallas de actualización lenta sin modificar la partida.
- Los equipos modestos evitan partículas, chispas, sprites temporales de ataque, desenfoques y sombras costosas.
- Las animaciones decorativas infinitas se detienen después de una vuelta mientras el feedback esencial permanece visible.
- Talleres, colecciones y listados largos solo se dibujan al acercarse a la zona visible.
- El acceso inicial aplica la detección antes de cargar la partida y simplifica sus efectos desde el primer instante.
- Las ilustraciones principales del Ranked se decodifican sin bloquear la interfaz.

## [2.20.7] - 2026-08-14

### Recursos visuales optimizados

- Los 36 enemigos, mapas y atlas Ranked que aún usaban PNG fueron convertidos a WebP.
- Los enemigos se ajustaron a un máximo de 1024×1024 y los mapas a 1600×900 sin deformación.
- Se retiraron 109 PNG redundantes que ya contaban con una versión WebP equivalente.
- El peso de `assets` bajó de 124,9 MB a 36,5 MB sin alterar la carga inicial ni el aspecto del juego.
- Una prueba automática impide volver a publicar PNG sin optimizar o superar el presupuesto visual.

## [2.20.6] - 2026-08-14

### Ilustraciones confinadas en taller y progresión

- Los materiales con arte individual quedan limitados a 24×24 píxeles dentro de recetas y reservas.
- Las recompensas de temporada quedan limitadas a 42×42 píxeles y mantienen tarjetas uniformes.
- Las previsualizaciones de receta respetan su contenedor sin alterar la grilla del taller.
- Los paneles recortan cualquier desbordamiento accidental causado por el tamaño original de una imagen.

## [2.20.5] - 2026-08-14

### Personaje visible durante la incursión Ranked

- El panel del aventurero muestra ahora la ilustración completa del personaje en lugar del emblema de su clase.
- Guerrero, Arquero, Mago, Sacerdote, Asesino y Domador seleccionan automáticamente su arte correspondiente.
- El personaje incorpora encuadre inferior, iluminación y sombra propios sin competir con el enemigo.
- En pantallas reducidas se oculta el retrato para conservar espacio para las decisiones de combate.

## [2.20.4] - 2026-08-14

### Lectura de rareza y combate visualmente estable

- Las criaturas dejan de estar encerradas por un marco y se elimina el rombo que tapaba parte de la ilustración.
- La rareza se comunica mediante su etiqueta, un resplandor de silueta y una línea inferior discreta.
- Épicos y jefes conservan presencia especial sin desordenar el nombre, la vida ni las intenciones.
- Atacar y cubrirse ya no desplazan paneles completos ni expanden efectos fuera del escenario.
- El ancho y el área del combate permanecen estables durante todo el feedback de daño, defensa y curación.

## [2.20.3] - 2026-08-14

### Rutas completas por familia y marco visual corregido

- Los cinco sectores de una ruta conservan una única familia enemiga y un único mapa.
- Completar el sector 5/5 desbloquea la siguiente ruta: limos, lobos, arañas, gólems y dragones.
- Extraerse antes o caer conserva la ruta actual para evitar saltos de progresión.
- La ruta superior repite el símbolo del territorio activo y ya no adelanta familias futuras.
- El marco rectangular se reemplaza por esquinas abiertas y un resplandor del color de rareza alrededor de la silueta.
- Las partidas guardadas con una familia incorrecta dentro de la ruta inicial vuelven al slime equivalente sin perder vida ni estados.

## [2.20.2] - 2026-08-14

### Cinco territorios completos de Cacería Ranked

- La incursión recorre ahora Ciénaga del Núcleo, Bosque Sepulcral, Nido de Cristal, Santuario de la Raíz Pétrea y Aguja de la Tormenta.
- Lobos, arañas, gólems y dragones reciben cinco variantes propias, estadísticas, patrones, rasgos, botín e ilustraciones nuevas.
- Cada territorio incorpora su mapa panorámico y cambia automáticamente al avanzar de sector.
- La rareza enemiga usa marcos visibles: común neutral, común+ verde, poco común azul, épico violeta y legendario dorado.
- Los cinco jefes legendarios tienen mayor presencia visual y una segunda fase de combate.
- Las partidas activas actualizan el nombre, arte y rareza de enemigos conocidos sin perder vida, estados ni progreso.

## [2.20.1] - 2026-08-11

### Corrección urgente del botín Ranked

- Las ilustraciones individuales del botín quedan limitadas a 38×38 píxeles dentro de cada tarjeta.
- Sombrero de esporas y cualquier otro objeto con arte propio ya no expanden la pantalla ni ocultan las decisiones de recoger, dejar, extraer o avanzar.
- Se añadió una prueba de regresión para impedir que este bloqueo vuelva a aparecer.

## [2.20.0] - 2026-08-11

### Las cinco evoluciones del Sector Slime

- Limo Rúnico se incorpora como aparición épica, con control, defensa rúnica, regeneración y botín de alta calidad.
- Limo Primordial se incorpora como jefe legendario excepcional usando su ilustración definitiva `v3`.
- El jefe despierta sus núcleos secundarios al 50% de vida y cambia a un segundo patrón más agresivo.
- Las probabilidades del sector quedan expresadas sobre 100 encuentros: 52% común, 27% poco común, 13% raro, 6% épico y 2% legendario.
- Las etiquetas épica y legendaria reciben colores, resplandores y tamaños de retrato propios sin aumentar el desplazamiento de la incursión.
- Ambas variantes conceden más materiales y mejores posibilidades de obtener componentes avanzados.

## [2.19.3] - 2026-08-11

### Sector Slime · La Ciénaga del Núcleo

- El primer sector de Cacería Ranked recibe un escenario panorámico propio inspirado en un acueducto subterráneo invadido por limo.
- Hongo esporoso y Gólem musgoso dejan la rotación inicial: ahora el sector contiene exclusivamente una familia de tres limos.
- Limo de Ciénaga, Limo Corrosivo y Limo Cristalino incorporan ilustraciones nuevas con anatomía, materiales y núcleos coherentes.
- Las apariciones respetan rareza real: 62% común, 28% poco común y 10% rara.
- Cada variante posee estadísticas, intenciones, rasgo, botín y función táctica propios.
- La pantalla muestra el nombre del mapa y la rareza del enemigo sin ocultar intención, vida ni patrón.
- Los materiales absorbidos por los limos conservan todas las rutas de fabricación existentes.

## [2.19.2] - 2026-08-11

### Segunda pasada de arte Ranked

- Escama rúnica, Sombrero de esporas y Poción de campaña reciben ilustraciones individuales de mayor detalle.
- Los tres objetos eliminan el marco y el bloque negro interno mediante recortes con transparencia real.
- La escama incorpora una silueta de armadura de quimera y runas violetas y cian claramente visibles.
- El sombrero muestra corona, laminillas y esporas bioluminiscentes para que no se confunda con una concha.
- La pocón adopta vidrio facetado, tapón ornamentado y amarres de cuero coherentes con las reliquias del taller.
- El Arco de la Cripta permanece sin cambios.

## [2.19.1] - 2026-08-11

### Pulido del modo Ranked

- El inventario conserva su posición al seleccionar, mover, equipar, fabricar o reclamar objetos, evitando el salto al inicio.
- El taller muestra tres recetas por fila en pantallas amplias y usa tarjetas más compactas para reducir el desplazamiento vertical.
- `Destilado de campaña` pasa a llamarse `Poción de campaña` e incorpora una ilustración propia fácil de reconocer.
- Las ocho piezas avanzadas reciben un atlas visual nuevo, con siluetas más grandes, fondos limpios y el mismo lenguaje artístico del equipo original.
- La incursión elimina el informe lateral repetitivo y concentra vida, intención, patrón y acciones en una lectura central más clara.
- Mochila, PR, presión y eventos recientes se resumen en una franja compacta; la cuadrícula completa sólo aparece al administrar botín.
- El Centro de Progresión reduce alturas, espacios vacíos y paneles de espera sin ocultar misiones ni recompensas.

## [2.19.0] - 2026-08-11

### Temporada 1 · La Frontera Quebrada

- Cacería Ranked abandona la pretemporada e inaugura su primera temporada oficial, activa del 11 de agosto al 5 de octubre de 2026.
- El Centro de Progresión presenta identidad estacional, fechas, contador de días, reglas resumidas y estado del cierre competitivo.
- La ruta gratuita crece de cinco a diez niveles y culmina en 3400 XP con materiales de los cinco sectores.
- Ocho misiones estacionales separan extracciones, criaturas, fabricación, profundidad y valor acumulado del progreso histórico del jugador.

### Reinicio competitivo seguro

- La migración reinicia PR, XP, misiones e historial competitivo para que todos comiencen la temporada en igualdad.
- El alijo, la mochila, los sellos seguros, el equipamiento, las recetas y la maestría de pretemporada se conservan.
- El resumen competitivo anterior queda archivado localmente y las partidas activas de otra temporada no pueden reanudarse por error.

### Clasificación oficial

- Perfiles y recibos públicos de Supabase incorporan un identificador de temporada y la tabla sólo consulta resultados de La Frontera Quebrada.
- Los resultados anteriores se archivan automáticamente como `preseason-0`; no se mezclan con los PR oficiales.
- El servidor impide iniciar recibos antes del comienzo o después del cierre de la temporada.
- `supabase-ranked-publico.sql` sigue siendo idempotente y actualiza instalaciones que ya tenían habilitado el ranking público.

## [2.18.0] - 2026-08-11

### Ranking público seguro

- Cacería Ranked incorpora una clasificación pública de Supabase separada del historial local del dispositivo.
- Cada incursión online recibe un comprobante del servidor que vence, pertenece a una única cuenta y sólo puede entregarse una vez.
- Supabase recalcula los PR con la fórmula oficial y rechaza sectores, abatidos, botín, duración o frecuencia de inicio imposibles.
- Las tablas competitivas tienen seguridad por fila, no aceptan escrituras directas del navegador y la consulta pública sólo devuelve datos seguros para mostrar.
- El perfil público conserva PR, división, mejor sector, extracciones y derrotas sin exponer correo ni identificadores privados.

### Integración y experiencia

- La pantalla de clasificación muestra el Top 50 público, destaca al jugador actual y permite actualizar la tabla.
- El informe final comunica si el resultado fue verificado, quedó pendiente, fue rechazado o pertenece a una partida local.
- El modo desarrollador, la falta de conexión o una instalación de Supabase todavía incompleta mantienen el progreso local sin bloquear el juego.
- Se añadió `supabase-ranked-publico.sql` y una guía de activación en `CONFIGURAR-CUENTAS-Y-NUBE.txt`.

## [2.17.0] - 2026-08-11

### Economía de extracción

- Se redujo el exceso de materiales por encuentro, conservando botín garantizado suficiente para que cada incursión siga ofreciendo decisiones útiles.
- Las firmas de los tres guardianes ahora entregan entre una y dos unidades, y el equipo final requiere tres: completar una sola incursión ya no fabrica inmediatamente una pieza definitiva.
- El Destilado de campaña recupera 34 de vida y exige tres núcleos de limo y dos geles refinados, evitando que la curación se vuelva ilimitada desde el inicio.
- La misión de valor acumulado requiere 1800 y la ruta gratuita termina en 1150 XP, extendiendo la pretemporada sin convertirla en una rutina excesiva.

### Rango y dificultad

- Una derrota siempre resta PR; avanzar sectores o abatir criaturas reduce el castigo, pero nunca convierte una caída en ganancia.
- Las extracciones entregan entre 35 PR al comenzar y un máximo de 150 PR en una incursión excelente, evitando saltos completos de división en pocas partidas.
- La experiencia de temporada por partida se ajustó al nuevo ritmo de recompensas.
- Los cinco sectores tienen presión Controlada, Creciente, Peligrosa, Extrema y Letal.
- La dificultad aumenta principalmente mediante vida enemiga; el ataque sube de forma gradual para favorecer decisiones tácticas y evitar muertes repentinas.
- El informe táctico muestra la presión vigente y explica el criterio de escalado.

### Protección automática del balance

- Se añadieron pruebas para impedir recompensas de PR por derrota, saltos bruscos de ataque, curación demasiado barata y fabricación inmediata del equipo final.

## [2.16.0] - 2026-08-11

### Ilustraciones propias para Ranked

- Se incorporaron dos atlas exclusivos y optimizados en WebP para los diez materiales y las ocho piezas de equipo añadidas en la expansión Ranked.
- Las ilustraciones aparecen de forma consistente en botín de campo, alijo, mochila, equipamiento, taller, revelado de fabricación e informe final.
- Cada material y cada pieza conserva una silueta, color y brillo reconocibles incluso en los formatos más pequeños.
- Los nuevos recursos se cargan únicamente al entrar en Cacería Ranked y añaden alrededor de 260 KB a ese modo, sin aumentar la carga inicial del juego.

### Identidad sonora

- Recoger materiales activa respuestas sonoras diferentes para restos orgánicos, minerales, componentes arcanos y objetos eléctricos.
- La forja combina golpes, resonancia y brillo según el tipo y la rareza de la pieza terminada.
- Armas, armaduras y reliquias tienen sonidos de equipamiento propios.
- Represalia, resistencia, perforación, ejecución y cobertura inicial cuentan con señales tácticas distintas durante el combate.
- Todos los efectos se generan con Web Audio, respetan el volumen de efectos configurado y no requieren descargar archivos de audio adicionales.

## [2.15.0] - 2026-08-11

### Materiales y botín especializado

- Se añadieron diez materiales vinculados a enemigos concretos, desde placas de musgo y polvo sepulcral hasta componentes épicos exclusivos de cada guardián.
- Los quince encuentros Ranked actualizan sus tablas de botín sin eliminar los recursos anteriores.
- Todo material nuevo tiene una receta útil y una procedencia visible dentro del inventario.

### Equipo y recetas

- El Taller de extracción crece de cinco a trece recetas, distribuidas entre los cinco sectores.
- Se incorporaron ocho piezas ilustradas: tres armas, dos armaduras y tres reliquias.
- El nuevo equipo introduce represalia, resistencia a estados, cobertura inicial, perforación de guardia y ejecución de objetivos afectados.
- Los efectos modifican el combate real y aparecen en la receta, la inspección del objeto y el resumen de la build equipada.

### Navegación del taller

- Se añadieron filtros para mostrar todas las recetas, armas, armaduras, reliquias o consumibles.
- Los contadores de recetas son dinámicos y la reserva lateral incluye todos los materiales necesarios.
- La expansión conserva el guardado anterior y mantiene Ranked fuera de la carga inicial.

## [2.14.0] - 2026-08-11

### Enemigos y patrones Ranked

- La Frontera Quebrada ahora dispone de quince encuentros: tres amenazas posibles por cada uno de sus cinco sectores.
- Cada criatura tiene ilustración, rol táctico, vida, ataque, patrón de acciones, rasgo distintivo y tabla de botín propios.
- Se incorporaron regeneradores, defensores, ejecutores, perforadores, especialistas en estados, élites y controladores.
- El informe táctico explica el rasgo activo y muestra la secuencia de intenciones, destacando la acción siguiente.

### Guardianes con segunda fase

- El sector final puede enfrentar a la Matriarca de cristal, la Quimera rúnica o el Dragón azul del umbral.
- Los tres guardianes cambian su patrón al 50% de vida y comunican claramente la entrada en fase II.
- Cobertura, estados, regeneración y golpes fuertes ahora interactúan con los rasgos de cada familia enemiga.
- Las partidas Ranked existentes continúan siendo compatibles y conservan turno, intención y patrón al reanudarse.

## [2.13.0] - 2026-08-11

### Claridad y tutorial Ranked

- Se añadió una guía inicial de tres pasos que explica el riesgo de extracción, los Puntos Ranked y la experiencia de temporada.
- La guía se muestra una sola vez, queda registrada en el guardado y puede reabrirse desde Clasificación.
- El Centro de Progresión diferencia explícitamente `PR = división`, `XP = recompensas` y `botín = fabricación`.
- Las partidas migradas explican por qué las estadísticas anteriores avanzan misiones sin inventar PR ni historial retroactivo.
- Misiones y recompensas indican ahora cuánto falta, qué entregan y que la XP no se consume al reclamar.

### Feedback de riesgo y resultados

- La incursión anticipa los PR y la XP que recibiría el jugador al extraerse en ese momento.
- El informe táctico muestra la pérdida posible al caer y recuerda que el rango nunca baja de cero.
- Los botones de salida incluyen la recompensa estimada y distinguen claramente entre extraerse o arriesgar y avanzar.
- El informe final incorpora una barra hacia la siguiente división, XP ganada, total acumulado y avisos de misiones o recompensas disponibles.
- Se añadieron animaciones de puntuación, mayor contraste y tipografías más legibles en el sistema de temporada.

## [2.12.0] - 2026-08-10

### Progresión competitiva Ranked

- Se incorporaron seis divisiones locales: Hierro, Bronce, Plata, Oro, Obsidiana y Eterno.
- Cada incursión calcula puntos según resultado, sector alcanzado, criaturas derrotadas y valor recuperado, con protección para que la puntuación nunca sea negativa.
- El informe final muestra puntos ganados o perdidos, división, clasificación total y experiencia de temporada.
- Se añadió un historial saneado y limitado a las últimas doce incursiones.

### Pretemporada y recompensas

- La nueva pestaña Clasificación reúne rango, progreso hacia la siguiente división y mejor marca personal.
- Cinco misiones de frontera siguen extracciones, abatidos, fabricación, profundidad y valor acumulado sin duplicar estadísticas.
- La ruta gratuita ofrece cinco recompensas reclamables con experiencia de temporada.
- Los reclamos son únicos, persistentes y atómicos: si el alijo está lleno no se pierde ni se marca la recompensa.
- Fabricar piezas también concede experiencia de temporada.
- La interfaz aclara que la clasificación continúa siendo local hasta que el futuro ranking público valide resultados en el servidor.

## [2.11.0] - 2026-08-10

### Combate táctico Ranked

- Cada enemigo anuncia su próxima intención: ataque directo, golpe devastador, veneno, sangrado, aturdimiento, defensa o regeneración.
- Los patrones varían entre limos, lobos, arañas, élites y la Matriarca final.
- Se incorporaron estados persistentes por turno con duración visible para sangrado, veneno, aturdimiento y regeneración.
- El Filo de colmillo puede provocar sangrado y las Dagas de la viuda pueden envenenar; el Talismán de la Matriarca concede regeneración al abatir enemigos.
- Defenderse responde a la intención anunciada, mientras que la defensa enemiga reduce el siguiente golpe del jugador.
- Intenciones, estados, turnos y botín recogido quedan incluidos en las incursiones reanudables.

### Inventario e informe

- Se añadió “Apilar todo” para combinar automáticamente materiales compatibles del alijo.
- El alijo deja de reservar una altura vacía innecesaria cuando contiene pocos objetos.
- Arma, armadura y reliquia equipadas se muestran también durante la incursión.
- El informe final detalla el botín recuperado, el equipo que sobrevivió y los objetos conservados en los sellos seguros.

### Arte de equipo

- Las cuatro piezas avanzadas del taller estrenaron ilustraciones propias en un atlas optimizado para inventario, crafting, comparación, equipamiento e informes.
- Los símbolos anteriores permanecen como alternativa para materiales y piezas todavía no ilustradas.

### Calidad

- La suite automatizada cubre apilado, persistencia de estados, intenciones, manifiestos de botín, informes detallados y presencia del nuevo arte.

## [2.10.0] - 2026-08-10

### Equipamiento previo Ranked

- Se agregaron ranuras exclusivas para arma, armadura y reliquia, separadas de la cuadrícula de la mochila.
- Cada pieza seleccionada muestra una comparación directa contra el objeto equipado y señala las mejoras o pérdidas de estadísticas.
- Reemplazar una pieza devuelve la anterior de forma segura a su contenedor o al alijo, sin sobrescribir objetos ni superar capacidades.
- El resumen de build muestra el rango de daño, la vida máxima y el porcentaje de daño recibido bajo cobertura.
- Las estadísticas del combate ahora proceden únicamente de las tres ranuras activas; llevar equipo suelto en mochila o sellos no concede bonificaciones.
- El equipamiento activo se conserva al extraerse y se pierde junto con la mochila al caer. El alijo y los dos sellos continúan protegidos.

### Banco de pruebas

- Se incorporó un maniquí para comprobar el rango de daño real sin iniciar una incursión.
- La prueba defensiva muestra cuánto daño atraviesa la cobertura y la vida total disponible.
- Las pruebas no consumen objetos, pociones ni recursos y utilizan exactamente las mismas fórmulas del combate Ranked.

### Calidad

- Se amplió el saneamiento del guardado para impedir piezas en ranuras incorrectas.
- La suite automatizada cubre ranuras, estadísticas, persistencia, pérdida por derrota y contratos de interfaz.

## [2.9.0] - 2026-08-10

### Taller de extracción Ranked

- Se incorporó un taller separado del inventario con cinco recetas desbloqueables según el mejor sector superado.
- Las recetas aceptan cantidades de 1 a 10, muestran materiales disponibles y nunca consumen recursos si la fabricación no puede completarse.
- La fabricación usa únicamente el alijo permanente, respeta su capacidad y apila automáticamente los resultados compatibles.
- Se agregaron Filo de colmillo, Dagas de la viuda, Coraza del alfa y Talismán de la Matriarca, además de la fabricación de Pociones de campaña.
- Las armas aumentan el daño, las armaduras amplían la vida y la reliquia épica mejora daño, vida y cobertura durante la incursión.
- El registro de forja conserva piezas creadas, maestría y recetas descubiertas dentro del guardado Ranked.
- Se añadieron presentación audiovisual de la pieza terminada, estados bloqueados, materiales faltantes y adaptación para pantallas pequeñas.

### Calidad

- La suite suma pruebas de desbloqueos, consumo atómico, capacidad del alijo, persistencia y estadísticas de equipo.

## [2.8.0] - 2026-08-10

### Feedback audiovisual Ranked

- Atacar reproduce la identidad sonora de la clase elegida y cada contraataque enemigo usa una señal acorde a su arquetipo.
- Cobertura, pociones, botín, avance de sector, jefe, extracción y derrota tienen sonidos propios mediante el sintetizador existente.
- La música cambia entre exploración, batalla y jefe sin crear un segundo contexto de audio.
- Todos los efectos respetan el volumen configurado y el interruptor global de efectos de sonido.
- El combate muestra números flotantes independientes para daño causado, daño recibido y curación.
- Se agregaron impactos, destellos, pulsos defensivos, brillo de curación, aviso de enemigo abatido y llegada a cada sector.
- Las acciones quedan brevemente protegidas contra pulsaciones dobles mientras se comunica el resultado del turno.
- Los avisos importantes se exponen mediante una región accesible para lectores de pantalla.

### Comodidad y calidad

- Reducir animaciones y la preferencia del sistema desactivan sacudidas, transiciones y destellos sin eliminar la información numérica.
- El feedback fue verificado durante combate, muerte de un enemigo y recolección de botín sin errores en consola.
- Se agregaron pruebas automáticas para las señales sonoras, la ausencia de sonidos durante renderizado y el respeto por movimiento reducido.

## [2.7.0] - 2026-08-10

### Primera incursión Ranked

- La Frontera Quebrada incorpora una incursión reanudable de cinco sectores con Limo veterano, Lobo de ceniza, Araña umbría, Lobo alfa de obsidiana y Matriarca de cristal.
- El combate ofrece ataque, cobertura y consumo real de Pociones de campaña; las armas aumentan el daño y la armadura amplía la vida máxima.
- Cada amenaza escala en vida y daño, muestra su sprite, barra de vida, peligros y registro de los últimos eventos.
- Las victorias entregan materiales ligados al mob derrotado. El botín debe apilarse o entrar físicamente en la mochila de 4×4.
- Después de cada sector el jugador puede extraerse o arriesgar el inventario avanzando hacia una amenaza más fuerte.
- La extracción conserva la mochila y suma estadísticas de temporada; caer elimina el equipo en riesgo pero nunca toca el alijo ni los dos sellos seguros.
- Se agregó un informe final con sector alcanzado, enemigos abatidos y valor extraído.

### Persistencia y calidad

- Una incursión activa se guarda dentro del personaje y puede retomarse luego de recargar o cambiar de dispositivo.
- Se incorporó saneamiento de partidas activas, límites de botín pendiente y estadísticas acumuladas.
- La interfaz de combate fue comprobada en escritorio y a 390×844 píxeles sin desbordamiento horizontal.
- Se agregaron pruebas automáticas para reanudación, cinco amenazas, acciones, extracción y protección del alijo y los sellos.

## [2.6.0] - 2026-08-10

### Cacería Ranked · Pretemporada

- Se incorporó un modo separado de laboratorio para diseñar la futura experiencia competitiva de extracción sin alterar Cacería clásica.
- La mochila táctica usa una cuadrícula de 4×4: cada objeto ocupa un tamaño real, puede girarse, arrastrarse, tocarse y ordenarse automáticamente.
- Dos sellos seguros conservan materiales compactos incluso al caer; la mochila en riesgo se vacía durante la simulación de derrota.
- El alijo permanente incluye diez objetos de prueba con tiers, tamaños, cantidades, procedencia y valor de extracción.
- Los materiales iguales pueden apilarse y el inventario se adapta tanto a escritorio como a pantallas móviles.
- El estado Ranked se guarda por personaje y se sincroniza mediante el sistema existente, separado del equipo, oro y progreso principal.

### Calidad

- Ranked se descarga únicamente al abrirlo para no aumentar el tiempo de carga inicial.
- Se agregaron pruebas automáticas de límites, colisiones, rotación, autoorden, saneamiento y carga diferida.
- La interfaz indica explícitamente que esta pretemporada todavía no otorga rango ni usa emparejamiento público.

## [2.5.0] - 2026-08-10

### Abismo Infinito

- Al completar los nueve actos, el jugador puede asegurar las recompensas y continuar con el mismo mazo en un modo sin final.
- Cada guardián superado aumenta una Ascensión: la vida y el daño enemigos crecen de forma exponencial y aparecen más ataques cargados.
- Las recompensas de oro y experiencia aumentan junto con el riesgo, pero el botín de cada descenso infinito se pierde si el héroe cae antes de retirarse.
- El desbloqueo, el mejor mazo de campaña, la profundidad y la Ascensión récord quedan guardados por personaje y se sincronizan entre dispositivos.
- El perfil muestra la mejor Ascensión y la interfaz identifica claramente el modo infinito en mapa, combate, victoria y derrota.

### Calidad

- Las expediciones infinitas pueden restaurarse desde un guardado sin quedar limitadas al acto 9.
- Se incorporaron pruebas automáticas para el desbloqueo, la continuidad del mazo y la progresión ilimitada de dificultad.
- Se corrigió la inconsistencia previa entre la versión pública y los identificadores de caché.

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
