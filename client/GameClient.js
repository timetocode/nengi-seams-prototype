import nengi from 'nengi'
import nengiConfig from '../common/nengiConfig'
import InputSystem from './InputSystem'
import MoveCommand from '../common/command/MoveCommand'
import FireCommand from '../common/command/FireCommand'
import PIXIRenderer from './graphics/PIXIRenderer'
import { isDeepStrictEqual } from 'util';

class GameClient {
    constructor() {
        this.client = new nengi.Client(nengiConfig)
        this.renderer = new PIXIRenderer()
        this.input = new InputSystem()

        this.trigger = null
        this.firstFrame = null

        this.client.onConnect(res => {
            console.log('onConnect response:', res)
        })

        this.client.onClose(() => {
            console.log('connection closed')
            //this.isConnected = false
        })

        this.client.connect('ws://localhost:8079')

        /*
        setTimeout(() => {
        
     
            this.renderer.myEntity = null
            this.renderer.myId = null
            this.isConnected = false

            this.renderer.entities.forEach((entity, nid) => {
                console.log('try', nid)
                this.renderer.deleteEntity(nid)
            })
            setTimeout(() => {
                this.client.disconnect() 
                this.client.connect('ws://localhost:8078')  
            } , 1500)
 
        }, 1000)
        */
    }

    transfer(address, x, y, ids) {
        this.renderer.myEntity = null
        this.renderer.myId = null
        this.firstFrame = null

        this.trigger = ids

        /*
        const swaps = []
        const doNotRemove = []
        ids.forEach(re => {
            if (!re.nid || !re.rid) {
                return
            }

            const entity = this.renderer.entities.get(re.nid)
            if (entity) {
                swaps.push({ entity, nid: re.nid, rid: re.rid })
                this.renderer.entities.delete(entity.nid)
            }
        })

        swaps.forEach(swap => {
            swap.entity.nid = swap.rid
            this.renderer.entities.set(swap.entity.nid, swap.entity)
            doNotRemove.push(swap.entity.nid)
        })
        */

        /*
        const immune = []

        const temp = []
        ids.forEach(re => {
            if (!re.nid || !re.rid) {
                return
            }
            console.log('RE', re)
            const entity = this.renderer.entities.get(re.nid)
            if (entity) {
                //console.log('we can see that')
                this.renderer.entities.delete(entity.nid)

                temp.push({ entity: entity, rid: re.rid })
                //console.log('changing id!', re.nid, re.rid)
                // entity.nid = re.rid
                //this.renderer.entities.set(entity.nid, entity)
                immune.push(re.rid)
            } else {
                // console.log('cant see')
            }
        })

        temp.forEach(e => {
            e.entity.nid = e.rid
            this.renderer.entities.set(e.entity.nid, e.entity)
        })
        */


        /*
        let saved = 0
        let removed = 0
        this.renderer.entities.forEach((entity, nid) => {
            if (doNotRemove.includes(nid)) {               
                saved++
            } else {
                this.renderer.deleteEntity(nid)
                removed++
            }
        })
        */

        //console.log('transferz', 'saved', saved, 'removed', removed)

        this.client.disconnect()
        this.client.connect(address, { x, y })
    }

    update(delta, tick, now) {
        /* receiving */
        const network = this.client.readNetwork()

        if (!this.firstFrame) {
            if (network.entities.length > 0) {
                this.firstFrame = network
                console.log('FIRST FRAME', network)
                this.renderer.entities.forEach((entity, nid) => {
 
                        this.renderer.deleteEntity(nid)
                     
                    
                })
            }            
        }

        network.entities.forEach(snapshot => {
            snapshot.createEntities.forEach(entity => {
                this.renderer.createEntity(entity)
            })

            snapshot.updateEntities.forEach(update => {
                this.renderer.updateEntity(update)
            })

            snapshot.deleteEntities.forEach(nid => {
                this.renderer.deleteEntity(nid)
            })
        })

        network.messages.forEach(message => {
            this.renderer.processMessage(message)

            if (message.protocol.name === 'Transfer') {
                const ids = JSON.parse(message.json)
                //console.log('ids', ids)
                this.transfer(message.address, message.x, message.y, ids)
            }
        })

        network.localMessages.forEach(localMessage => {
            this.renderer.processLocalMessage(localMessage)
        })
        /* * */

        /* sending */
        const input = this.input.frameState

        let rotation = 0
        const worldCoord = this.renderer.toWorldCoordinates(this.input.currentState.mx, this.input.currentState.my)

        if (this.renderer.myEntity) {
            // calculate the direction our character is facing
            const dx = worldCoord.x - this.renderer.myEntity.x
            const dy = worldCoord.y - this.renderer.myEntity.y
            rotation = Math.atan2(dy, dx)
        }

        this.client.addCommand(new MoveCommand(input.w, input.a, input.s, input.d, rotation, delta))

        if (input.mouseDown) {
            this.client.addCommand(new FireCommand(worldCoord.x, worldCoord.y))
        }

        this.input.releaseKeys()
        this.client.update()
        /* * */

        /* rendering */
        this.renderer.update(delta)
        /* * */
    }
}

export default GameClient
