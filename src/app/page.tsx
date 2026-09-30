/**
 * page.tsx — Root page.
 *
 * Redirects / to /issues. The /issues page itself will redirect to /login
 * if the user is not authenticated.
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/issues");
}
