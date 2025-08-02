import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { ComponentType } from "react";

interface ProtectedRouteProps {
  path: string;
  component: ComponentType<any>;
  roles?: string[];
}

export default function ProtectedRoute({ path, component: Component, roles = [] }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
        if (!isAuthenticated) {
          return <Redirect to="/auth" />;
        }

        if (roles.length > 0 && user && !roles.includes(user.role)) {
          return <Redirect to="/" />;
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}
