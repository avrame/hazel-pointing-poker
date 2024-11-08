import EventEmitter from "node:events"

export const myEventEmitter = new EventEmitter()

interface RoomMutation {
  id?: string
  name?: string
  players?: string[]
  revealed?: boolean
}

interface PlayerMutation {
  id?: string
  roomId?: string
  name?: string
  role?: 'creator' | 'player'
  spectator?: boolean
  points?: number | "?"
}

export interface RoomRecord extends RoomMutation {
  id: string
}

export interface PlayerRecord extends PlayerMutation {
  id: string
}

const data = {
  rooms: {} as Record<string, RoomRecord>,
  players: {} as Record<string, PlayerRecord>,

  createRoom(values: RoomMutation): RoomRecord {
    const id = values.id || Math.random().toString(36).substring(2, 9)
    const newRoom = { id, revealed: false, ...values }
    data.rooms[id] = newRoom
    return newRoom
  },

  getRoom(id: string): RoomRecord | null {
    return data.rooms[id] || null
  },

  updateRoom(id: string, values: RoomMutation): RoomRecord {
    const room = data.rooms[id]
    data.rooms[id] = { ...room, ...values }
    return data.rooms[id]
  },

  deleteRoom(id: string) {
    delete data.rooms[id]
  },

  createPlayer(values: PlayerMutation): PlayerRecord {
    const id = values.id || Math.random().toString(36).substring(2, 9)
    const newPlayer = { id, ...values }
    data.players[id] = newPlayer
    return newPlayer
  },

  updatePlayer(playerId: string, values: PlayerMutation): PlayerRecord {
    const player = data.players[playerId]
    data.players[playerId] = {...player, ...values}
    return data.players[playerId]
  },

  getPlayer(id: string): PlayerRecord {
    return data.players[id] || null
  },

  deletePlayer(playerId: string, roomId: string) {
    delete data.players[playerId]
    const newPlayers = data.rooms[roomId]?.players?.filter(id => id !== playerId)
    data.rooms[roomId].players = newPlayers
  }
}

export function createRoom(name: string, creatorName: string, spectator: boolean) {
  const newPlayer = data.createPlayer({ name: creatorName, role: 'creator', spectator })
  const updatedRoom = data.createRoom({ name, players: [newPlayer.id] })
  data.updatePlayer(newPlayer.id, { roomId: updatedRoom.id })
  return updatedRoom
}

export function getRoom(id: string) {
  return data.getRoom(id)
}

export function getPlayer(id: string) {
  return data.getPlayer(id)
}

export function addPlayerToRoom(roomId: string, playerName: string, spectator: boolean) {
  const room = data.getRoom(roomId)
  const newPlayer = data.createPlayer({ name: playerName, roomId, role: 'player', spectator })
  const updatedRoom = data.updateRoom(roomId, { players: [...(room?.players ?? []), newPlayer.id] })
  myEventEmitter.emit('playerAddedToRoom', updatedRoom.id, newPlayer)
  return {updatedRoom, newPlayer}
}

let pointsCount = 0
export function setPlayerPoints(playerId: string, points: number | "?") {
  if (data.players[playerId]) {
    data.players[playerId].points = points
    pointsCount += 1
    myEventEmitter.emit('playerChosePoints', data.players[playerId].roomId, playerId, points, pointsCount)
  }
}

export function getRoomPlayers(roomId: string) {
  const room = getRoom(roomId)
    return room?.players?.map(playerId => {
      return data.getPlayer(playerId)
    }) ?? null
}

export function revealCards(roomId: string) {
  data.updateRoom(roomId, { revealed: true })
  myEventEmitter.emit('revealCards', roomId)
}

let resetCount = 0
export function resetRoom(roomId: string) {
  const updatedRoom = data.updateRoom(roomId, { revealed: false })
  data.rooms[roomId].players?.forEach(playerId => {
    data.updatePlayer(playerId, { points: undefined })
  })
  const updatedPlayers = getRoomPlayers(roomId)
  resetCount += 1
  myEventEmitter.emit('roomReset', updatedRoom, updatedPlayers, resetCount)
}

export function deleteRoom(id: string) {
  data.deleteRoom(id)
}

export function deletePlayer(playerId: string, roomId: string) {
  data.deletePlayer(playerId, roomId)
  myEventEmitter.emit('playerLeft', playerId, roomId)
}