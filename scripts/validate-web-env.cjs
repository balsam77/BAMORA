function validateWebEnvironment(env) {
  const configured = env.NEXT_PUBLIC_BAMORA_API_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_BAMORA_API_URL is required for web deployment.");
  }
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("NEXT_PUBLIC_BAMORA_API_URL must point to a public HTTPS API without credentials.");
  }
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && /PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY/.test(name) && value) {
      throw new Error(`Do not expose credentials in ${name}.`);
    }
  }
  if (env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "1") {
    throw new Error("Demo authentication must be disabled for web deployment.");
  }
  if (env.NEXT_PUBLIC_PAYMENTS_ENABLED === "1") {
    throw new Error("Payments must remain disabled for the payment-provider review deployment.");
  }
}

module.exports = { validateWebEnvironment };

if (require.main === module) {
  try {
    validateWebEnvironment(process.env);
    console.log("Web deployment environment validated (no secret values displayed).");
  } catch (error) {
    // URL parser errors can contain the input; only emit our own validation messages.
    console.error(error instanceof TypeError ? "Invalid API URL configuration." : error.message);
    process.exitCode = 1;
  }
}
