export default async function handler(req, res) {
  return res.status(200).json({
    hasAppsScriptUrl: !!String(process.env.APPS_SCRIPT_URL || '').trim(),
    hasAdminApiToken: !!String(process.env.ADMIN_API_TOKEN || '').trim(),
    hasPublicSubmitToken: !!String(process.env.PUBLIC_SUBMIT_TOKEN || '').trim(),
    hasAdminPassword: !!String(process.env.ADMIN_PASSWORD || '').trim(),
    hasAdminSessionToken: !!String(process.env.ADMIN_SESSION_TOKEN || '').trim(),
    nodeVersion: process.version,
  });
}
