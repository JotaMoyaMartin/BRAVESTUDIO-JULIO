#!/bin/bash
# Regenera lib/banco-ia-files.ts a partir de public/banco-ia/ (ejecutar tras añadir o borrar fotos).
cd "$(dirname "$0")/.." || exit 1
{
  echo "// GENERADO por scripts/banco-ia-index.sh — no editar a mano."
  echo "export const BANCO_IA_FILES: string[] = ["
  (cd public/banco-ia && ls */*.jpg 2>/dev/null | grep -v '^recortes/' | sort) | sed "s/.*/  '&',/"
  echo "]"
  echo ""
  echo "export const BANCO_RECORTES: string[] = ["
  (cd public/banco-ia && ls recortes/*.png 2>/dev/null | sort) | sed "s#.*#  '/banco-ia/&',#"
  echo "]"
} > lib/banco-ia-files.ts
grep -c "'" lib/banco-ia-files.ts
