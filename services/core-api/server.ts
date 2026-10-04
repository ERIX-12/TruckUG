import Fastify from 'fastify';
import {z} from 'zod';

const fastify = Fastify({logger: true});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

fastify.post('/v1/auth/login', async (request, reply) => {
  const body = loginSchema.parse(request.body);
  // TODO: Implement Argon2 hash check
  return {token: 'mock-jwt-token'};
});

fastify.listen({port: 8080}, (err, address) => {
  if (err) throw err;
  console.log(`Core API running on ${address}`);
});
