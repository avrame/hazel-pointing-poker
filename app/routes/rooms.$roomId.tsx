/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable jsx-a11y/label-has-associated-control */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useBeforeUnload,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import confetti from "canvas-confetti";
import { useState, useEffect, useRef, useCallback } from "react";
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

const { useEventSource } = require("remix-utils/sse/react");

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
const possibleCardValues = [1, 2, 3, 5, 8, 13, 21, "?"];

export default function RoomPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
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
  const playerLeftJSON = useEventSource("/sse/room", {
    event: "playerLeft",
  });
  const lastPlayerAddedJSON = useRef<string | undefined>();
  const lastChosePointsJSON = useRef<string | undefined>();
  const cardsRevealed = useRef(false);

  const currentPlayer = players?.find(
    (p) => p.id === data.currentPlayer.id,
  );

  useBeforeUnload(
    useCallback(() => {
      if (currentPlayer)
        fetcher.submit(
          {},
          {
            method: "DELETE",
            action: "/deletePlayer",
            encType: "application/json",
          },
        );
    }, [fetcher, currentPlayer]),
  );

  useEffect(() => {
    applauseAudio = new Audio("/audio/applause.mp3");
    applauseAudio.preload = "auto";
  }, []);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/rooms/join/${room.id}`);
  }, [setJoinUrl, room.id]);

  useEffect(() => {
    if (!playerAddedJSON || playerAddedJSON === lastPlayerAddedJSON.current)
      return;
    lastPlayerAddedJSON.current = playerAddedJSON;
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
    if (!chosePointsJSON || chosePointsJSON === lastChosePointsJSON.current)
      return;
    lastChosePointsJSON.current = chosePointsJSON;
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
    if (revealCards === "true" && !cardsRevealed.current) {
      cardsRevealed.current = true;
      const playersWithPoints = players?.filter(
        (p) => !p.spectator && p.points && !Number.isNaN(p.points),
      );
      const totalPoints = playersWithPoints?.reduce((sum, p) => {
        if (p.points && p.points !== "?") {
          return sum + p.points;
        }
        return sum;
      }, 0);
      if (totalPoints && playersWithPoints) {
        setAverage(
          Math.round(100 * (totalPoints / playersWithPoints.length)) / 100,
        );
      }
      const consensus =
        playersWithPoints &&
        playersWithPoints.length > 1 &&
        playersWithPoints?.every((p) => p.points === playersWithPoints[0].points);
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
    cardsRevealed.current = false;
    const { updatedRoom, updatedPlayers } = JSON.parse(roomResetJSON);
    setRoom(updatedRoom);
    setPlayers(updatedPlayers);
    setAverage(undefined);
  }, [roomResetJSON]);

  useEffect(() => {
    if (!playerLeftJSON) return;
    const { playerId, roomId } = JSON.parse(playerLeftJSON);
    if (roomId === data.room.id) {
      setPlayers((oldPlayers) =>
        oldPlayers ? oldPlayers?.filter((p) => p.id !== playerId) : null,
      );
    }
  }, [data.room.id, playerLeftJSON]);

  const actualPlayers = players?.filter((p) => !p.spectator);
  const spectators = players?.filter((p) => p.spectator);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-3xl font-bold text-center">{room.name} Room</h2>

      <Hr />

      <div className="flex flex-col gap-2 items-center">
        <h3 className="mb-2 text-2xl font-bold">Players</h3>
        <table>
          <thead>
            <tr className="border-b border-slate-300">
              {actualPlayers?.map((player) => (
                <th
                  key={player.id}
                  className="border-r border-slate-300 p-3 last:border-r-0"
                >
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-300">
              {actualPlayers?.map((player) => {
                return (
                  <td
                    key={player.id}
                    className="h-24 border-r border-slate-300 p-3 last:border-r-0"
                  >
                    <Card
                      points={player.points}
                      visible={!!player.points}
                      flip={revealCards === "true" || !!room.revealed}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="flex gap-2 p-3">
          <b>Average:</b>
          <span>{average}</span>
        </div>
      </div>      

      {spectators?.length ? (
        <>
          <Hr />
          <div className="flex flex-col gap-2 items-center">
            <h3 className="mb-2 text-2xl font-bold">Spectators</h3>
            {spectators?.map((player) => {
              return <div key={player.id}>{player.name}</div>;
            })}
          </div>
        </>
      ) : null}

      {currentPlayer?.spectator ? null : (
        <>
          <Hr />
          <Form method="patch">
            <input
              type="hidden"
              name="playerId"
              value={data.currentPlayer.id}
            />
            <div className="flex flex-row gap-2 justify-center">
              {possibleCardValues.map((val) => (
                <Button
                  key={val}
                  selected={currentPlayer?.points === val}
                  type="submit"
                  name="points"
                  value={val}
                >
                  {val}
                </Button>
              ))}
            </div>
          </Form>
        </>
      )}

      <div className="flex gap-2 justify-center">
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

      <div className="flex items-center gap-1 justify-center">
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

      {currentPlayer?.role === "creator" ? (
        <>
          <Hr />
          <Form method="delete">
            <div className="text-center">
              <Button type="submit" theme="danger">
                Delete Room
              </Button>
            </div>
          </Form>
        </>
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
