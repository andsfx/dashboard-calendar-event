export default async function handler(req, res) {
  const relevantKeys = Object.keys(process.env).filter(k =>
    k.includes('APPS_SCRIPT') || k.includes('ADMIN') || k.includes('PUBLIC_SUBMIT') || k.includes('VITE_')
  ).sort();

  return res.status(200).json({
    hasAppsScriptUrl: !!String(process.env.APPS_SCRIPT_URL || '').trim(),
    hasAdminApiToken: !!String(process.env.ADMIN_API_TOKEN || '').trim(),
    hasPublicSubmitToken: !!String(process.env.PUBLIC_SUBMIT_TOKEN || '').trim(),
    hasAdminPassword: !!String(process.env.ADMIN_PASSWORD || '').trim(),
    hasAdminSessionToken: !!String(process.env.ADMIN_SESSION_TOKEN || '').trim(),
    relevantKeys,
    totalEnvKeys: Object.keys(process.env).length,
    nodeVersion: process.version,
  });
}
