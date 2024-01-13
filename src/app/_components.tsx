"use client";

import { ModeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserClient } from "@supabase/ssr";
import { type User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import type { BoardOrientation } from "react-chessboard/dist/chessboard/types";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import type { Database } from "../../types/supabase";

const FormCreateRoomSchema = z.object({
  color: z
    .string({
      required_error: "Please select a color.",
    })
    .min(5),
});

export const DialogJoinRoom: React.FC<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ open, setOpen }) => {
  const { push } = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [id, setId] = useState("");
  const handleOnClick = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select()
      .eq("room_id", id);
    if (error) return toast.error(error.message);
    if (data?.length) {
      push(id);
      setOpen(false);
    } else {
      toast.error("Room not found, please try again");
    }
  };
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Room ID</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            autoComplete="off"
            className="col-span-3"
            id="id"
            onChange={(e) => setId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={id}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleOnClick} type="button">
            Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DialogCreateRoom: React.FC<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
}> = ({ open, setOpen, user }) => {
  const { push } = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const form = useForm<z.infer<typeof FormCreateRoomSchema>>({
    resolver: zodResolver(FormCreateRoomSchema),
  });
  async function onSubmit(data: z.infer<typeof FormCreateRoomSchema>) {
    const room_id = uuidv4();
    const { error } = await supabase.from("rooms").insert({
      room_id,
      creator: user?.id,
      color: data.color,
    });
    if (error) return toast.error(error.message);
    push(room_id);
    setOpen(false);
  }
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose color</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-8 pt-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Create room</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const Navbar: React.FC<{ user: User | null }> = ({ user }) => {
  const { push } = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  };
  return (
    <>
      <DialogCreateRoom open={open} setOpen={setOpen} user={user} />
      <nav className="flex items-center justify-between">
        {user ? (
          <button
            className="h-10 w-10 rounded-full"
            onClick={() => push("/account")}
            type="button"
          >
            <img
              alt="avatar"
              className="rounded-full"
              src={user.user_metadata.avatar_url}
            />
          </button>
        ) : (
          <button
            className="h-10 w-10 rounded-full"
            onClick={handleSignIn}
            type="button"
          >
            <UserIcon className="h-6 w-6" />
          </button>
        )}
        <div className="flex gap-x-2">
          {user && (
            <Button onClick={() => setOpen(true)} size="icon" variant="ghost">
              <PlusIcon className="h-6 w-6" />
            </Button>
          )}
          <ModeToggle />
        </div>
      </nav>
    </>
  );
};

export const Board: React.FC<{
  color: BoardOrientation;
  creator: string | null | undefined;
  fen: string | null;
  id: string | undefined;
  room_id: string | null;
}> = ({ color, creator, fen, id, room_id }) => {
  if (!room_id) return;
  return (
    <div className="relative w-full">
      <Link
        className="group absolute inset-0 z-50 flex items-center justify-center transition duration-300 hover:bg-slate-900 hover:bg-opacity-70"
        href={room_id}
      >
        <span className="text-xl font-semibold text-white opacity-0 transition duration-300 group-hover:opacity-100">
          View game
        </span>
      </Link>
      <Chessboard
        boardOrientation={
          id === creator ? color : color === "white" ? "black" : "white"
        }
        position={fen ?? undefined}
      />
    </div>
  );
};

export const Onboarding: React.FC<{ user: User | null }> = ({ user }) => {
  const { push, refresh } = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  };
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else refresh();
  };
  return (
    <>
      <DialogJoinRoom open={open} setOpen={setOpen} />
      <main className="grid gap-10">
        <header className="text-5xl font-semibold lg:text-7xl">
          Play chess with others.
        </header>
        {user ? (
          <div className="grid gap-y-4">
            <Button
              className="py-6 text-lg font-medium"
              onClick={() => setOpen(true)}
            >
              Join
            </Button>
            <Button
              className="py-6 text-lg font-medium"
              onClick={handleSignOut}
              variant="secondary"
            >
              Sign out
            </Button>
          </div>
        ) : (
          <div className="grid gap-y-4">
            <Button
              className="py-6 text-lg font-medium"
              onClick={() => push("/lobby")}
            >
              Spectate
            </Button>
            <Button
              className="py-6 text-lg font-medium"
              onClick={handleSignIn}
              variant="secondary"
            >
              Sign in
            </Button>
          </div>
        )}
      </main>
    </>
  );
};
