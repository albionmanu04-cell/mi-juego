# Historial de cambios

Este proyecto usa versionado semántico: `MAYOR.MENOR.PARCHE`.

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
