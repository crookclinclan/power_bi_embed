import { assertProductionSecurity, env } from './config/env.js'
import { createApp } from './app.js'
import { logger } from './lib/logger.js'

assertProductionSecurity()

const app = createApp()

app.listen(env.port, () => {
  logger.info('PassGP Power BI embed API listening', {
    port: env.port,
    production: env.isProduction,
    apiSecretConfigured: Boolean(env.apiSecret),
  })
})
