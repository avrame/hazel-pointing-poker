/* eslint-disable jsx-a11y/label-has-associated-control */
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  json,
  useActionData,
  useLoaderData,
  useNavigate,
} from "@remix-run/react"
import { useEffect, useRef } from "react"

import Button from "~/components/Button/"
import Checkbox from "~/components/Checkbox";
import Input from "~/components/Input/"
import { session } from "~/cookies/session-cookie"
import { createRoom, getPlayer } from "~/data"

export const meta: MetaFunction = () => [
  { title: "Hazel Health Pointing Poker" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await session.parse(cookieHeader)) || {}
  return json({ currentPlayer: cookie.currentPlayer, room: cookie.room })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const roomName = formData.get("roomName")
  const playerName = formData.get("playerName")
  const spectator = formData.get("spectator") === "on"
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await session.parse(cookieHeader)) || {}

  if (typeof roomName !== "string" || roomName.length === 0) {
    return json(
      {
        room: null,
        errors: { roomName: "Room name is required", playerName: null },
      },
      { status: 400 },
    );
  } else if (typeof playerName !== "string" || playerName.length === 0) {
    return json(
      {
        room: null,
        errors: { roomName: null, playerName: "User name is required" },
      },
      { status: 400 },
    );
  }

  const room = createRoom(roomName, playerName, spectator);
  const playerId = room.players?.[0]
  if (playerId) {
    const player = getPlayer(playerId)
    cookie.currentPlayer = player
    cookie.room = room
    return json(
      { room, errors: { roomName: null, playerName: null } },
      {
        headers: {
          "Set-Cookie": await session.serialize(cookie),
        },
      },
    );
  }
};

export default function Index() {
  const navigate = useNavigate()
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const roomNameRef = useRef<HTMLInputElement>(null)
  const playerNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (actionData?.errors?.roomName) {
      roomNameRef.current?.focus()
    } else if (actionData?.errors?.playerName) {
      playerNameRef.current?.focus()
    } else if (actionData?.room) {
      navigate(`/rooms/${actionData?.room.id}`)
    }
  }, [actionData, navigate]);

  return (
    <div className="w-1/3 mx-auto">
      <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
        <Form
          method="post"
          className="flex flex-col gap-8 w-full"
        >
          <div>
            <label className="flex w-full flex-col gap-1">
              <span>Room Name: </span>
              <Input
                ref={roomNameRef}
                name="roomName"
                defaultValue={data.room?.name}
                aria-invalid={actionData?.errors?.roomName ? true : undefined}
                aria-errormessage={
                  actionData?.errors?.roomName ? "title-error" : undefined
                }
              />
            </label>
            {actionData?.errors?.roomName ? (
              <div className="pt-1 text-red-700" id="title-error">
                {actionData.errors.roomName}
              </div>
            ) : null}
          </div>

          <div>
            <label className="flex w-full flex-col gap-1">
              <span>Your Name: </span>
              <Input
                ref={playerNameRef}
                name="playerName"
                defaultValue={data.currentPlayer?.name}
                aria-invalid={actionData?.errors?.roomName ? true : undefined}
                aria-errormessage={
                  actionData?.errors?.roomName ? "title-error" : undefined
                }
              />
            </label>
            {actionData?.errors?.playerName ? (
              <div className="pt-1 text-red-700" id="title-error">
                {actionData.errors.playerName}
              </div>
            ) : null}
          </div>

          <div>
            <label className="flex w-full flex-col gap-1">
              <span>Join as a spectator:</span>
              <Checkbox name="spectator" />
            </label>
          </div>

          <div className="text-right">
            <Button type="submit">Create Room</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
