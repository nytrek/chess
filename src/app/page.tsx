import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Onboarding } from "./_components";

export default async function Page() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  return <Onboarding user={data.user} />;
}
