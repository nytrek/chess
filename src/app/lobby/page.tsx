import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { createServerClient } from "@supabase/ssr";
import { EyeIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import type { BoardOrientation } from "react-chessboard/dist/chessboard/types";
import type { Database } from "../../../types/supabase";
import { Board } from "../_components";

export default async function Page() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * @see https://supabase.com/docs/reference/javascript/or
   */
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
  return (
    <main className="grid gap-10">
      <div>
        <Link
          className="flex items-center gap-x-1.5 text-sm font-medium"
          href="/"
        >
          <ArrowLongLeftIcon className="h-6 w-6" />
          Back
        </Link>
        <header className="text-5xl font-semibold lg:text-7xl">Lobby.</header>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {data?.map((item) => (
          <div className="flex flex-col gap-y-2.5" key={item.id}>
            <Board
              color={item.color as BoardOrientation}
              creator={item.creator}
              fen={item.fen}
              id={user?.id}
              room_id={item.room_id}
            />
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{item.room_id?.slice(-4).toUpperCase()}</span>
              <span className="flex items-center gap-x-1">
                <EyeIcon className="h-3.5 w-3.5" />
                <span>{item.views}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
