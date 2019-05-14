import nengi from 'nengi'
import nengiConfig from '../common/nengiConfig'
import PlayerCharacter from '../common/entity/PlayerCharacter'
import GreenCircle from '../common/entity/GreenCircle'
import Identity from '../common/message/Identity'
import WeaponFired from '../common/message/WeaponFired'
import CollisionSystem from '../common/CollisionSystem'

import RemoteViewer from './RemoteViewer'


import RemoteDamage from '../common/command/RemoteDamage'
import FireCommand from '../common/command/FireCommand';
import Transfer from '../common/message/Transfer';


/* ONE */
class GameInstance {
    constructor(argv) {
        this.entities = new Map()
        this.remoteEnitites = new Map()
        this.collisionSystem = new CollisionSystem()
        this.instance = new nengi.Instance(nengiConfig, { port: argv.port })
        this.instance.onConnect((client, clientData, callback) => {
            //callback({ accepted: false, text: 'Connection denied.'})

            // create a entity for this client
            const entity = new PlayerCharacter()
            this.instance.addEntity(entity) // adding an entity to a nengi instance assigns it an id

            // tell the client which entity it controls (the client will use this to follow it with the camera)
            this.instance.message(new Identity(entity.nid), client)

            entity.x = Math.random() * 1000
            entity.y = Math.random() * 1000

            
            client.view = {
                x: entity.x,
                y: entity.y,
                halfWidth: 400,
                halfHeight:400
            }

            if (clientData) {
                if (clientData.fromClient.x) {
                    entity.x = clientData.fromClient.x
                    entity.y = clientData.fromClient.y
                }

                if (clientData.fromClient.remoteViewerPassword) {
                    client.remote = true
                    entity.x = 500
                    entity.y = 500


                    client.view = {
                        x: entity.x,
                        y: entity.y,
                        halfWidth: 500,
                        halfHeight: 500
                    }
                }
            }

            // establish a relation between this entity and the client
            entity.client = client
            client.entity = entity

  

            this.entities.set(entity.nid, entity)

            callback({ accepted: true, text: 'Welcome!' })
        })

        this.instance.onDisconnect(client => {
            this.entities.delete(client.entity.nid)
            this.instance.removeEntity(client.entity)
        })

        this.remoteViewer = new RemoteViewer('ws://localhost:8078', this.instance.protocols)


        for (var i = 0; i < 25; i++) {
            this.spawnGreenCircle()
        }
    }

    spawnGreenCircle() {
        const green = new GreenCircle(
            Math.random() * 1000,
            Math.random() * 1000
        )
        // Order is important for the next two lines
        this.instance.addEntity(green) // assigns an `nid` to green
        this.entities.set(green.nid, green) // uses the `nid` as a key
    }

    createRemoteEntity(entity) {
        //console.log('creatine remote entity', entity)
        // save the remote id, because we will be creating our own local id for it
        const remoteId = entity.nid

        if (entity.protocol.name === 'GreenCircle') {
            const remoteEntity = new GreenCircle(entity.x, entity.y)
            remoteEntity.remoteId = remoteId
            this.instance.addEntity(remoteEntity)
            this.remoteEnitites.set(remoteId, remoteEntity)
        }


        if (entity.protocol.name === 'PlayerCharacter') {
            const remoteEntity = new PlayerCharacter()
            Object.assign(remoteEntity, entity)
            remoteEntity.remoteId = remoteId
            this.instance.addEntity(remoteEntity)
            this.remoteEnitites.set(remoteId, remoteEntity)
        }
    }

    updateRemoteEntity(update) {
        const remoteEntity = this.remoteEnitites.get(update.nid)
        remoteEntity[update.prop] = update.value
    }

    deleteRemoteEntity(nid) {
        const remoteEntity = this.remoteEnitites.get(nid)
        this.remoteEnitites.delete(nid)
        this.instance.removeEntity(remoteEntity)
    }

    update(delta) {
        //console.log('stats', this.entities.size, this.instance.clients.toArray().length, this.instance.entities.toArray().length, this.remoteEnitites.size)
        this.acc += delta

        const network = this.remoteViewer.bot.readNetwork()

        network.entities.forEach(snapshot => {
            snapshot.createEntities.forEach(entity => {
                this.createRemoteEntity(entity)
            })

            snapshot.updateEntities.forEach(update => {
                this.updateRemoteEntity(update)
            })

            snapshot.deleteEntities.forEach(nid => {
                this.deleteRemoteEntity(nid)
            })
        })




        let cmd = null
        while (cmd = this.instance.getNextCommand()) {
            const tick = cmd.tick
            const client = cmd.client

            for (let i = 0; i < cmd.commands.length; i++) {
                const command = cmd.commands[i]
                const entity = client.entity
                if (client.beingTransfered) {
                    continue
                }
                //console.log('command', command)
                if (command.protocol.name === 'MoveCommand') {
                    entity.processMove(command)

                    if (entity.x > 1000) {
                       // console.log('TRANSFER U!')
                        const ids = []

                        //this.remoteEnitites.forEach(re => {
                            //ids.push({ rid: re.remoteId, nid: re.nid })
                        //})

                        //console.log('visible maybe', client.cacheArr)
                        client.cacheArr.forEach(id => {
                            const re = this.instance.entities.get(id)
                            if (re && re.remoteId) {
                                ids.push({ rid: re.remoteId, nid: re.nid })
                            }                            
                        })

                        this.instance.message(new Transfer('ws://localhost:8078', entity.x, entity.y, JSON.stringify([])), client)
                        client.beingTransfered = true
                    }
                }

                if (command.protocol.name === 'FireCommand') {
                    if (entity.fire()) {

                        this.entities.forEach(potentialVictim => {
                            const hit = this.collisionSystem.checkLineCircle(entity.x, entity.y, command.x, command.y, potentialVictim.collider)
                            // if the line intersects a player other than the shooter
                            if (hit && potentialVictim.nid !== entity.nid) {
                                potentialVictim.takeDamage(25)
                            }
                        })


                        this.remoteEnitites.forEach(potentialVictim => {
                            const hit = this.collisionSystem.checkLineCircle(entity.x, entity.y, command.x, command.y, potentialVictim.collider)
                            // if the line intersects a player other than the shooter
                            if (hit && potentialVictim.nid !== entity.nid) {
                                console.log('hey you shot a remote entity!!')
                                //potentialVictim.takeDamage(25)
                                //this.remoteViewer.bot.addCommand(new FireCommand(command.x, command.y))
                                this.remoteViewer.bot.addCommand(new RemoteDamage(potentialVictim.remoteId, 25))
                            }
                        })




                        this.instance.addLocalMessage(new WeaponFired(entity.nid, entity.x, entity.y, command.x, command.y))
                    }
                }
            }
        }

        this.entities.forEach(entity => {
            if (entity instanceof GreenCircle) {
                if (!entity.isAlive) {
                    // Order matters for the next 2 lines
                    this.entities.delete(entity.nid)
                    this.instance.removeEntity(entity)
                    // respawn after one second
                    setTimeout(() => { this.spawnGreenCircle() }, 1000)
                }
            }
        })

        // TODO: the rest of the game logic
        this.instance.clients.forEach(client => {
            if (!client.remote) {
                client.view.x = client.entity.x
                client.view.y = client.entity.y
    
                client.entity.move(delta)
                client.entity.weaponSystem.update(delta)
            }

        })

        // when instance.updates, nengi sends out snapshots to every client
        this.remoteViewer.bot.update()
        this.instance.update()
    }
}

export default GameInstance