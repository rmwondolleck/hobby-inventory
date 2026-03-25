import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  seed: {
    run: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
})
