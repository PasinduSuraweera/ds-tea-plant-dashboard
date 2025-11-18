import { redirect } from "next/navigation"

export default function Page() {
  // Redirect to tea plantation dashboard as the main dashboard
  redirect("/dashboard/tea")
}
