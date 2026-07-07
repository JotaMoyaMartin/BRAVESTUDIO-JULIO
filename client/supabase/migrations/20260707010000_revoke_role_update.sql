-- Cerrar hueco de auto-escalación de rol:
-- la policy "Users can update own profile" permitía update de TODAS las columnas,
-- incluida `role`. Un usuario podía hacer update profiles set role='admin'.
-- Aquí revocamos update sobre la columna role y mantenemos el resto.

revoke update (role) on public.profiles from authenticated;