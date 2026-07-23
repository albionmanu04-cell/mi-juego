-- FORJA ETERNA · REINICIO GLOBAL DE PROGRESO
-- ADVERTENCIA: borra permanentemente personajes online y ranking.
-- Conserva las cuentas, correos y contraseñas de Authentication.

begin;

-- Copias online de todos los personajes y expediciones.
truncate table public.player_saves;

-- Clasificación de la temporada anterior.
truncate table public.leaderboard;

commit;
