"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { createBrowserClient } from "@supabase/ssr";
import { Chess, type Square } from "chess.js";
import { EyeIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { BoardOrientation } from "react-chessboard/dist/chessboard/types";
import { toast } from "sonner";
import type { Database } from "../../../types/supabase";
import { useViewStore } from "./store";

/**
 * @see https://github.com/jhlywa/chess.js/blob/master/README.md
 * @see https://github.com/Clariity/react-chessboard?tab=readme-ov-file
 * @see https://react-chessboard.vercel.app/?path=/story/example-chessboard--configurable-board
 */
export const Board: React.FC<{
  color: string | undefined;
  creator: string | null | undefined;
  fen: string | null | undefined;
  id: string;
  opponent: string | null | undefined;
  userId: string | undefined;
}> = ({ color, creator, fen, id, opponent, userId }) => {
  const { back } = useRouter();
  const pathname = usePathname();
  const game = useMemo(() => new Chess(), []);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const views = useViewStore((state) => state.views);
  const [optionSquares, setOptionSquares] = useState({});
  const setViews = useViewStore((state) => state.setViews);
  const [moveTo, setMoveTo] = useState<Square | null>(null);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [activeSquare, setActiveSquare] = useState<Square | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [hasOpponent, setHasOpponent] = useState(!!(creator && opponent));
  const [chessBoardPosition, setChessBoardPosition] = useState(game.fen());

  async function updateGamePosition() {
    const { error } = await supabase
      .from("rooms")
      .update({
        fen: game.fen(),
        is_completed: game.isGameOver(),
      })
      .eq("room_id", id);

    if (error) toast.error(error.message);
  }

  function isUserAuthorizedToMove() {
    const opponentColor = color === "white" ? "black" : "white";
    if (
      (userId === creator && color?.includes(game.turn())) ||
      (userId === opponent && opponentColor.includes(game.turn()))
    )
      return true;
    else return false;
  }

  function onDrop(sourceSquare: Square, targetSquare: Square, piece: string) {
    if (!isUserAuthorizedToMove()) return false;
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase(),
      });

      setChessBoardPosition(game.fen());

      // illegal move
      if (move === null) return false;

      setTimeout(() => updateGamePosition(), 500);

      return true;
    } catch (err: any) {
      console.log(err.message);
      return false;
    }
  }

  /**
   * @see https://github.com/Clariity/react-chessboard/blob/main/stories/Chessboard.stories.tsx#L258C3-L285
   */
  function getMoveOptions(_piece: string, square: Square) {
    const moves = game.moves({
      square,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {
      [square]: {
        background: "rgba(255, 255, 0, 0.4)",
        borderRadius: "0%",
      },
    };

    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });

    setOptionSquares(newSquares);
    return true;
  }

  /**
   * @see https://github.com/Clariity/react-chessboard/blob/main/stories/Chessboard.stories.tsx#L300-L368
   */
  function onSquareClick(square: Square) {
    if (!isUserAuthorizedToMove()) return;

    if (square === activeSquare) {
      setMoveFrom(null);
      setOptionSquares({});
      setActiveSquare(null);
      return;
    }

    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions("", square);
      if (hasMoveOptions) {
        setMoveFrom(square);
        setActiveSquare(square);
      }
      return;
    }

    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = game.moves({
        square: moveFrom,
        verbose: true,
      });
      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square,
      );
      // not a valid move
      if (!foundMove) {
        // check if clicked on new piece
        const hasMoveOptions = getMoveOptions("", square);
        // if new piece, setMoveFrom, otherwise clear moveFrom
        setMoveFrom(hasMoveOptions ? square : null);
        return;
      }

      // valid move
      setMoveTo(square);

      // if promotion move
      if (
        (foundMove.color === "w" &&
          foundMove.piece === "p" &&
          square[1] === "8") ||
        (foundMove.color === "b" &&
          foundMove.piece === "p" &&
          square[1] === "1")
      ) {
        setShowPromotionDialog(true);
        return;
      }

      // is normal move
      const move = game.move({
        from: moveFrom,
        to: square,
      });

      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        const hasMoveOptions = getMoveOptions("", square);
        if (hasMoveOptions) setMoveFrom(square);
        return;
      }

      setChessBoardPosition(game.fen());
      setTimeout(() => updateGamePosition(), 500);

      setMoveTo(null);
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }
  }

  /**
   * @see https://github.com/Clariity/react-chessboard/blob/main/stories/Chessboard.stories.tsx#L370-L388
   */
  function onPromotionPieceSelect(piece: string | undefined) {
    if (!isUserAuthorizedToMove()) return false;

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      game.move({
        from: moveFrom as string,
        to: moveTo as string,
        promotion: piece[1].toLowerCase(),
      });
      setChessBoardPosition(game.fen());
      setTimeout(() => updateGamePosition(), 500);
    }

    setMoveTo(null);
    setMoveFrom(null);
    setOptionSquares({});
    setShowPromotionDialog(false);
    return true;
  }

  useEffect(() => {
    if (!fen) return;
    game.load(fen);
    setTimeout(() => setChessBoardPosition(fen), 500);
  }, [fen, game]);

  useEffect(() => {
    const channel = supabase
      .channel(pathname)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new.room_id === id) {
            if (payload.new.fen) {
              game.load(payload.new.fen);
              setTimeout(() => setChessBoardPosition(payload.new.fen), 500);
            }
            if (!payload.old.opponent && payload.new.opponent)
              setHasOpponent(true);
            setViews(payload.new.views);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, game, supabase, pathname, setViews]);
  return (
    <>
      <header>
        <button
          className="flex items-center gap-x-1.5 text-sm font-medium"
          onClick={() => back()}
          type="button"
        >
          <ArrowLongLeftIcon className="h-6 w-6" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">
            Board {id.slice(-4).toUpperCase()}
          </h1>
          <Badge variant="outline">
            {game.isGameOver()
              ? "Completed"
              : creator && opponent
                ? "In progress"
                : "Open"}
          </Badge>
        </div>
      </header>
      <div className="flex flex-col gap-y-2.5">
        <div className="w-full">
          <Chessboard
            boardOrientation={
              userId === creator
                ? (color as BoardOrientation)
                : color === "white"
                  ? "black"
                  : "white"
            }
            customSquareStyles={{
              ...optionSquares,
            }}
            onPieceDragBegin={getMoveOptions}
            onPieceDragEnd={() => setOptionSquares({})}
            onPieceDrop={onDrop}
            onPromotionPieceSelect={
              moveFrom && moveTo ? onPromotionPieceSelect : undefined
            }
            onSquareClick={onSquareClick}
            position={chessBoardPosition}
            promotionToSquare={moveTo}
            showPromotionDialog={showPromotionDialog}
          />
        </div>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>
            {!hasOpponent
              ? "Waiting for players"
              : isUserAuthorizedToMove()
                ? "Your turn to play"
                : game.turn() === "w"
                  ? "White's turn to play"
                  : "Black's turn to play"}
          </span>
          <span className="flex items-center gap-x-1">
            <EyeIcon className="h-5 w-5" />
            <span>{views}</span>
          </span>
        </div>
      </div>
    </>
  );
};

export const Invite: React.FC = () => {
  const pathname = usePathname();
  const handleInviteDesktop = () => {
    toast.success("Link copied to clipboard");
    navigator.clipboard.writeText(process.env.NEXT_PUBLIC_URL + pathname);
  };
  const handleInviteMobile = () => {
    navigator.share({
      url: process.env.NEXT_PUBLIC_URL + pathname,
    });
  };
  return (
    <>
      <Button
        className="hidden sm:inline-block"
        onClick={handleInviteDesktop}
        variant="outline"
      >
        Invite
      </Button>
      <Button
        className="sm:hidden"
        onClick={handleInviteMobile}
        variant="outline"
      >
        Invite
      </Button>
    </>
  );
};
