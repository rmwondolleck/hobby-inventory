import { defineConfig } from 'prisma/config'

export default defineConfig({
  seed: {
    run: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
})
