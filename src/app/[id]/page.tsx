import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { BoardOrientation } from "react-chessboard/dist/chessboard/types";
import type { Database } from "../../../types/supabase";
import { Board, Invite } from "./_components";
import { Wrapper } from "./wrapper";

export default async function Page({ params }: { params: { id: string } }) {
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

  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_id", params.id)
    .limit(1)
    .single();

  if (!data) return <>Room not found</>;
  return (
    <Wrapper
      color={data?.color as BoardOrientation | undefined}
      creator={data?.creator}
      id={params.id}
      opponent={data?.opponent}
      userId={user?.id}
      views={data?.views}
    >
      <main className="flex flex-col gap-y-6">
        <Board
          color={data?.color}
          creator={data?.creator}
          fen={data?.fen}
          id={params.id}
          opponent={data?.opponent}
          userId={user?.id}
        />
        <Invite />
      </main>
    </Wrapper>
  );
}
