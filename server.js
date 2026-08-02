import 'dotenv/config'
import { env } from './src/common/config/env.js'
import app from './src/app.js'
import { connectDB } from './src/common/config/db.js'

const PORT = env.PORT || 8080;

const start = async () => {
  // conntect to db
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT} in ${env.NODE_ENV} mode`);
  })
}

start().catch((err) => {
  console.log('Failed to start server', err);
  process.exit(1);
})