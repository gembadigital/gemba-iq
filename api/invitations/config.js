export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  return response.status(200).json({
    emailConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
