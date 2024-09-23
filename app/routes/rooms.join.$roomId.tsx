/* eslint-disable jsx-a11y/label-has-associated-control */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import invariant from "tiny-invariant";

import Button from "~/components/Button/";
import Hr from "~/components/Hr";
import Input from "~/components/Input/";
import { session } from "~/cookies/session-cookie";
import { addPlayerToRoom, getRoom, getRoomPlayers } from "~/data";

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
  const { roomId } = params;
  invariant(roomId, "roomId not found");
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await session.parse(cookieHeader)) || {};

  const formData = await request.formData();
  const playerName = formData.get("playerName") as string;

  const { newPlayer, updatedRoom } = addPlayerToRoom(roomId, playerName);
  cookie.currentPlayer = newPlayer;
  cookie.room = updatedRoom;

  return redirect(`/rooms/${roomId}`, {
    headers: {
      "Set-Cookie": await session.serialize(cookie),
    },
  });
};

export default function RoomJoinPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-3xl font-bold">{data.room.name} Room</h2>
      <Hr />
      <div>
        <Form method="post">
          <div className="flex flex-col items-start gap-2">
            <label className="flex w-full flex-col gap-1">
              <span>Your Name:</span>
              <Input name="playerName" defaultValue={data.currentPlayer?.name} />
            </label>
            <Button type="submit">Join Room</Button>
          </div>
        </Form>
      </div>
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
