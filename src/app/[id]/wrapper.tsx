"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { BoardOrientation } from "react-chessboard/dist/chessboard/types";
import { toast } from "sonner";
import type { Database } from "../../../types/supabase";
import { useViewStore } from "./store";

/**
 * @see https://github.com/shadcn-ui/ui/issues/1626
 */
export const DialogOpenSpot: React.FC<{
  color: BoardOrientation | undefined;
  id: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userId: string | undefined;
}> = ({ color, id, open, setOpen, userId }) => {
  const { refresh } = useRouter();
  const [isLoading, setLoading] = useState(true);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const handleOnClick = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("rooms")
      .update({
        opponent: userId,
      })
      .eq("room_id", id);
    if (error) toast.error(error.message);
    else {
      refresh();
      setOpen(false);
    }
  };
  useEffect(() => {
    setLoading(false);
  }, []);
  return (
    <>
      {!isLoading && (
        <Dialog open={open}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Open spot</DialogTitle>
              <DialogDescription>
                There&apos;s an open spot for{" "}
                {color === "white" ? "black" : "white"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Spectate
              </Button>
              <Button onClick={handleOnClick} type="button">
                Play as {color === "white" ? "black" : "white"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export const Wrapper: React.FC<
  React.PropsWithChildren<{
    color: BoardOrientation | undefined;
    creator: string | null | undefined;
    id: string;
    opponent: string | null | undefined;
    userId: string | undefined;
    views: number | undefined;
  }>
> = ({ color, creator, children, id, opponent, userId, views }) => {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [open, setOpen] = useState(!opponent && !!userId && creator !== userId);
  const setViews = useViewStore((state) => state.setViews);
  useEffect(() => {
    if (typeof views === "undefined") return;
    const updateViewCount = async (v: number) => {
      const { error } = await supabase
        .from("rooms")
        .update({
          views: v,
        })
        .eq("room_id", id);
      if (error) toast.error(error.message);
      else setViews(v);
    };
    if (userId) updateViewCount(views + 1);
    else setViews(views);
  }, [id, views, userId, supabase, setViews]);
  return (
    <>
      <DialogOpenSpot
        color={color}
        id={id}
        open={open}
        setOpen={setOpen}
        userId={userId}
      />
      {children}
    </>
  );
};
