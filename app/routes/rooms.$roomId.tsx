/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable jsx-a11y/label-has-associated-control */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import confetti from "canvas-confetti";
import { useState, useEffect, useRef } from "react";

// import { useEventSource } from "remix-utils/sse/react";
import invariant from "tiny-invariant";

import Button from "~/components/Button/";
import Card from "~/components/Card/";
import Hr from "~/components/Hr";
import Input from "~/components/Input/";
import { session } from "~/cookies/session-cookie";
import {
  deleteRoom,
  getRoom,
  getRoomPlayers,
  setPlayerPoints,
  revealCards,
  resetRoom,
} from "~/data";

const { useEventSource } = require("remix-utils/sse/react")

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.roomId, "roomId not found");
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await session.parse(cookieHeader)) || {};

  const room = getRoom(params.roomId);
  const players = getRoomPlayers(params.roomId);
  if (!room) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ room, players, currentPlayer: cookie.currentPlayer });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const playerId = formData.get("playerId") as string;
  const pointsStr = formData.get("points") as string;
  const revealPoints = formData.get("reveal") as string;
  const reset = formData.get("reset") as string;
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await session.parse(cookieHeader)) || {};

  switch (request.method) {
    case "PATCH": {
      if (revealPoints === "true") {
        invariant(params.roomId, "params.roomId not found");
        revealCards(params.roomId);
      } else if (reset === "true") {
        invariant(params.roomId, "params.roomId not found");
        resetRoom(params.roomId);
      } else {
        invariant(pointsStr, "points not found");
        invariant(playerId, "playerId not found");

        const points = pointsStr === "?" ? "?" : parseInt(pointsStr, 10);
        cookie.currentPlayer.points = points;
        setPlayerPoints(playerId, points);
      }

      return json(
        {},
        { headers: { "Set-Cookie": await session.serialize(cookie) } },
      );
    }
    case "DELETE": {
      invariant(params.roomId, "roomId not found");
      deleteRoom(params.roomId);
      return redirect("/");
    }
  }

  return null;
};

let applauseAudio: HTMLAudioElement;

export default function RoomPage() {
  const data = useLoaderData<typeof loader>();
  const [room, setRoom] = useState(data.room);
  const [players, setPlayers] = useState(data.players);
  const [average, setAverage] = useState<number>();
  const [joinUrl, setJoinUrl] = useState("");
  const playerAddedJSON = useEventSource("/sse/room", {
    event: "playerAddedToRoom",
  });
  const chosePointsJSON = useEventSource("/sse/room", {
    event: "playerChosePoints",
  });
  const revealCards = useEventSource("/sse/room", {
    event: "revealCards",
  });
  const roomResetJSON = useEventSource("/sse/room", {
    event: "roomReset",
  });
  const lastPlayerAddedJSON = useRef<string | undefined>()
  const lastChosePointsJSON = useRef<string | undefined>()

  const currentPlayer = data.players?.find(
    (p) => p.id === data.currentPlayer.id,
  );

  useEffect(() => {
    applauseAudio = new Audio("/audio/applause.mp3");
    applauseAudio.preload = "auto";
  }, []);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/rooms/join/${room.id}`);
  }, [setJoinUrl, room.id]);

  useEffect(() => {
    if (!playerAddedJSON || playerAddedJSON === lastPlayerAddedJSON.current) return;
    lastPlayerAddedJSON.current = playerAddedJSON
    const { updatedRoomId, newPlayer } = JSON.parse(playerAddedJSON);
    if (room.id === updatedRoomId) {
      setPlayers((oldPlayers) => [...(oldPlayers ?? []), newPlayer]);
      setRoom((oldRoom) => {
        return {
          ...oldRoom,
          players: [...(oldRoom.players ?? []), newPlayer.id],
        };
      });
    }
  }, [playerAddedJSON, room.id]);

  useEffect(() => {
    if (!chosePointsJSON || chosePointsJSON === lastChosePointsJSON.current) return;
    lastChosePointsJSON.current = chosePointsJSON
    const { playerId, points } = JSON.parse(chosePointsJSON);
    if (room.players?.includes(playerId)) {
      setPlayers(
        (oldPlayers) =>
          oldPlayers?.map((p) => {
            if (p.id === playerId) {
              return { ...p, points };
            }
            return p;
          }) ?? [],
      );
    }
  }, [chosePointsJSON, room.players]);

  useEffect(() => {
    if (revealCards === "true") {
      const playersWithPoints = players?.filter(
        (p) => p.role !== "spectator" && !Number.isNaN(p.points),
      );
      const totalPoints = playersWithPoints?.reduce((sum, p) => {
        if (p.points && p.points !== "?") {
          return sum + p.points;
        }
        return sum;
      }, 0);
      if (totalPoints && playersWithPoints) {
        setAverage(totalPoints / playersWithPoints.length);
      }
      const consensus = players && players.length > 1 && players?.every((p) => p.points === players[0].points);
      if (consensus) {
        confetti({
          particleCount: 100,
          origin: { x: 0 },
          angle: 45,
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 100,
          origin: { x: 1 },
          angle: 135,
          disableForReducedMotion: true,
        });
        applauseAudio.play();
      }
    }
  }, [players, revealCards]);

  useEffect(() => {
    if (!roomResetJSON) return;
    const { updatedRoom, updatedPlayers } = JSON.parse(roomResetJSON);
    setRoom(updatedRoom);
    setPlayers(updatedPlayers);
    setAverage(undefined)
  }, [roomResetJSON]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-3xl font-bold">{room.name} Room</h2>

      <Hr />

      <div className="flex items-center gap-2">
        <table>
          <thead>
            <tr className="border-b border-slate-600">
              <th className="border-r border-slate-600 p-3">Player</th>
              <th className="p-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {players?.map((player) => {
              return (
                <tr key={player.id} className="border-b border-slate-600">
                  <td className="h-24 border-r border-slate-600 p-3 text-right">
                    <h3 className="text-lg">{player.name}</h3>
                  </td>
                  <td className="h-24 p-3">
                    {player.points ? (
                      <Card
                        points={player.points}
                        flip={revealCards === "true" || !!room.revealed}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex gap-2 p-3">
          <b>Average:</b>
          <span>{average}</span>
        </div>
      </div>

      <Hr />

      <Form method="patch">
        <input type="hidden" name="playerId" value={data.currentPlayer.id} />
        <div className="flex flex-row gap-2">
          <Button type="submit" name="points" value={1}>
            1
          </Button>
          <Button type="submit" name="points" value={2}>
            2
          </Button>
          <Button type="submit" name="points" value={3}>
            3
          </Button>
          <Button type="submit" name="points" value={5}>
            5
          </Button>
          <Button type="submit" name="points" value={8}>
            8
          </Button>
          <Button type="submit" name="points" value={13}>
            13
          </Button>
          <Button type="submit" name="points" value="?">
            ?
          </Button>
        </div>
      </Form>

      <div className="flex gap-2">
        <div>
          <Form method="patch">
            <Button type="submit" name="reveal" value="true">
              Reveal
            </Button>
          </Form>
        </div>

        <div>
          <Form method="patch">
            <Button type="submit" theme="danger" name="reset" value="true">
              Reset
            </Button>
          </Form>
        </div>
      </div>

      <Hr />

      <div className="flex items-center gap-1">
        <label className="flex items-center gap-1">
          <span>Room Link:</span>
          <Input value={joinUrl} className="w-96" readOnly />
        </label>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(joinUrl);
            } catch (error) {
              let message;
              if (error instanceof Error) message = error.message;
              console.error(message);
            }
          }}
        >
          Copy Link
        </Button>
      </div>

      <Hr />

      {currentPlayer?.role === "creator" ? (
        <Form method="delete">
          <Button type="submit" theme="danger">
            Delete Room
          </Button>
        </Form>
      ) : null}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Room not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
}
