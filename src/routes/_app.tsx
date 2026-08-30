import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyOrganizations, fetchNotifications } from "@/lib/api";
import { OrgProvider } from "@/components/org-context";
import { AppShell } from "@/components/app-shell";
import { Spinner, ErrorState } from "@/components/states";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  errorComponent: ({ error }) => <ErrorState message={error.message} />,
});

function AppLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const orgsQuery = useQuery({
    queryKey: ["organizations", user?.id],
    queryFn: fetchMyOrganizations,
    enabled: Boolean(user),
  });

  const org = orgsQuery.data?.[0];

  useEffect(() => {
    if (orgsQuery.isSuccess && !org) navigate({ to: "/onboarding" });
  }, [orgsQuery.isSuccess, org, navigate]);

  const notifQuery = useQuery({
    queryKey: ["notifications", org?.id],
    queryFn: () => fetchNotifications(org!.id),
    enabled: Boolean(org),
  });

  if (loading || !user || orgsQuery.isLoading) return <Spinner label="Chargement de votre boutique…" />;
  if (orgsQuery.isError)
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState message={(orgsQuery.error as Error).message} onRetry={() => orgsQuery.refetch()} />
      </div>
    );
  if (!org) return <Spinner label="Préparation de l'onboarding…" />;

  const unread = notifQuery.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <OrgProvider value={{ org, userEmail: user.email ?? "" }}>
      <AppShell unreadCount={unread}>
        <Outlet />
      </AppShell>
    </OrgProvider>
  );
}
