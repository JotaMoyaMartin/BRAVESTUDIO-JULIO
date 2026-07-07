'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingSkool() {
  return (
    <section className="bg-warm-gray py-12 lg:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
          className="card p-6 sm:p-8 text-center"
        >
          <p className="text-base font-bold mb-2 text-cherry-dark">
            ¿Eres miembro de BRÄVE en Skool?
          </p>
          <p className="text-sm mb-5 max-w-md mx-auto text-cherry-dark opacity-70">
            Los miembros de la comunidad BRÄVE pueden activar su acceso gratuito con el código de la
            comunidad.
          </p>
          <Link href="/skool-access" className="btn-ghost">
            Tengo código de Skool
          </Link>
        </motion.div>
      </div>
    </section>
  )
}