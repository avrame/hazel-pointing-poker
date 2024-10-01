import { ActionFunctionArgs } from "@remix-run/node";

import { session } from "~/cookies/session-cookie";
import { deletePlayer } from "~/data";

export const action = async ({ request }: ActionFunctionArgs) => {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await session.parse(cookieHeader)) || {}

  deletePlayer(cookie.currentPlayer.id, cookie.room.id)
  
  return null
}