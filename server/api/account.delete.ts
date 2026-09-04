import { deleteAccountSchema } from "~/shared/schemas";

export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const body = await parseBody(event, deleteAccountSchema);
  const { supabase, userId, claims } = await requireUser(event);
  if (body.confirmation !== "DELETE") {
    throw apiError(422, "Type DELETE to confirm", "VALIDATION_ERROR");
  }

  const issuedAt = Number(claims.iat || 0);
  if (!issuedAt || Date.now() / 1000 - issuedAt > 10 * 60) {
    throw apiError(403, "Sign in again before deleting your account", "REAUTHENTICATION_REQUIRED");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || userData.user?.id !== userId) {
    throw apiError(401, "Your session could not be verified", "AUTHENTICATION_REQUIRED");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw apiError(401, "Your session could not be verified", "AUTHENTICATION_REQUIRED");
  }
  const admin = createAdminSupabaseClient();
  const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
  if (signOutError) {
    console.error("Session revocation failed", { status: signOutError.status });
    throw apiError(500, "Unable to revoke account sessions", "CONFIGURATION_ERROR");
  }

  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) {
    console.error("Account deletion failed", { status: error.status });
    throw apiError(500, "Unable to delete account", "CONFIGURATION_ERROR");
  }
  setResponseStatus(event, 204);
  return null;
});
