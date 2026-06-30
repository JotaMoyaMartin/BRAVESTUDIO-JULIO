import { Router } from 'express'
import healthRoute from './health.route'

const router = Router()

// Mount feature routers here. Add new modules as the backend grows, e.g.:
//   router.use('/stripe', stripeRoute)
//   router.use('/promo', promoRoute)
router.use('/health', healthRoute)

export default router
